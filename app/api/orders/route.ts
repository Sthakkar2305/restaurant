import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getCollection, generateId } from '@/lib/mongodb';
import { requireStaff, requireRole } from '@/lib/api-helpers';

export async function POST(request: NextRequest) {
  try {
    // 1. Verify Staff Authorization (Waiter, Admin, or Super Admin)
    const auth = await requireRole(request, ['waiter', 'admin', 'superadmin']);
    if (auth.response || !auth.user) return auth.response;

    const body = await request.json();
    const { tableNumber, items, customerName, customerEmail, idempotencyKey } = body;

    const tNum = parseInt(String(tableNumber), 10);
    if (isNaN(tNum) || tNum <= 0) {
      return NextResponse.json({ error: 'Valid table number is required' }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Order must contain at least one item' }, { status: 400 });
    }

    const ordersCollection = await getCollection('orders');
    const tablesCollection = await getCollection('tables');
    const menuCollection = await getCollection('menu_items');

    // 2. 🛡️ SERVER-SIDE PRICE VALIDATION (Fetch official database prices)
    const allMenuItems = await menuCollection.find({}).toArray();
    const menuMap = new Map<string, any>();
    allMenuItems.forEach((m) => {
      menuMap.set(String(m._id), m);
      if (m.name) menuMap.set(m.name.toLowerCase().trim(), m);
    });

    const validatedItems: Array<{
      menuItemId: string;
      itemName: string;
      price: number;
      quantity: number;
      notes: string;
      category: string;
      subtotal: number;
    }> = [];

    for (const item of items) {
      const q = parseInt(String(item.quantity), 10);
      if (isNaN(q) || q <= 0 || q > 100) {
        return NextResponse.json(
          { error: `Invalid quantity for item "${item.itemName || item.name}". Must be between 1 and 100.` },
          { status: 400 }
        );
      }

      // Look up official price by ID or Name
      const mId = String(item.menuItemId || item._id || item.id || '');
      const rawName = String(item.itemName || item.name || '').toLowerCase().trim();
      const dbMenuItem = menuMap.get(mId) || menuMap.get(rawName);

      const officialPrice = dbMenuItem ? Number(dbMenuItem.price) || 0 : Math.max(0, Number(item.price) || 0);
      const officialName = dbMenuItem ? dbMenuItem.name : item.itemName || item.name || 'Dish Item';
      const category = dbMenuItem ? dbMenuItem.category : item.category || 'general';
      const notes = typeof item.notes === 'string' ? item.notes.trim().slice(0, 200) : '';

      validatedItems.push({
        menuItemId: dbMenuItem ? String(dbMenuItem._id) : mId || generateId(),
        itemName: officialName,
        price: officialPrice,
        quantity: q,
        notes,
        category,
        subtotal: officialPrice * q,
      });
    }

    // 3. CHECK FOR EXISTING ACTIVE ORDER ON THIS TABLE
    const existingOrder = await ordersCollection.findOne({
      tableNumber: tNum,
      status: { $in: ['pending', 'preparing', 'served'] },
    });

    if (existingOrder) {
      // Allow the assigned waiter, or any admin/superadmin to update
      if (
        existingOrder.waiterId !== auth.user.userId &&
        auth.user.role !== 'admin' &&
        auth.user.role !== 'superadmin'
      ) {
        return NextResponse.json(
          { error: `Table is occupied and served by ${existingOrder.waiterName || 'another waiter'}` },
          { status: 403 }
        );
      }

      const updatedItems = [...(existingOrder.items || []), ...validatedItems];
      const subtotal = updatedItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
      const tax = Math.round(subtotal * 0.05 * 100) / 100;
      const serviceCharge = Math.round(subtotal * 0.1 * 100) / 100;
      const discount = Number(existingOrder.discount) || 0;
      const total = Math.max(0, Math.round(subtotal + tax + serviceCharge - discount));

      await ordersCollection.updateOne(
        { _id: existingOrder._id },
        {
          $set: {
            items: updatedItems,
            subtotal,
            tax,
            serviceCharge,
            total,
            updatedAt: new Date(),
          },
        }
      );

      return NextResponse.json({
        success: true,
        message: 'Order updated with additional items',
        orderId: existingOrder.orderId,
      });
    }

    // 4. CREATE NEW ORDER
    const subtotal = validatedItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
    const tax = Math.round(subtotal * 0.05 * 100) / 100;
    const serviceCharge = Math.round(subtotal * 0.1 * 100) / 100;
    const total = Math.round(subtotal + tax + serviceCharge);

    const orderId = generateId();
    const newOrder = {
      orderId,
      tableNumber: tNum,
      waiterId: auth.user.userId,
      waiterName: auth.user.name,
      customerName: customerName ? String(customerName).trim().slice(0, 100) : 'Guest',
      customerEmail: customerEmail ? String(customerEmail).trim().slice(0, 100) : '',
      items: validatedItems,
      status: 'pending',
      subtotal,
      tax,
      serviceCharge,
      discount: 0,
      total,
      paymentStatus: 'unpaid',
      idempotencyKey: idempotencyKey || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await ordersCollection.insertOne(newOrder);

    // Atomically lock table
    await tablesCollection.updateOne(
      { table_number: tNum },
      {
        $set: {
          status: 'occupied',
          currentWaiterId: auth.user.userId,
          updatedAt: new Date(),
        },
      },
      { upsert: false }
    );

    return NextResponse.json({ success: true, orderId: newOrder.orderId });
  } catch (error: any) {
    console.error('Order creation error:', error);
    return NextResponse.json({ error: error.message || 'Server error creating order' }, { status: 500 });
  }
}

// GET: Authenticated fetch with filtering (avoids full historical collection dumps)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireStaff(request);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';
    const tableNumber = searchParams.get('tableNumber');
    const limit = Math.min(200, parseInt(searchParams.get('limit') || '100', 10));

    const ordersCollection = await getCollection('orders');
    const query: any = {};

    if (activeOnly) {
      query.status = { $in: ['pending', 'preparing', 'served'] };
    }

    if (tableNumber) {
      query.tableNumber = parseInt(tableNumber, 10);
    }

    const orders = await ordersCollection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({ success: true, orders });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}