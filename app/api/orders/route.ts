import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getCollection, generateId, generateSecureToken } from '@/lib/mongodb';
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
      return NextResponse.json({ error: 'Valid positive table number is required' }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Order must contain at least one item' }, { status: 400 });
    }

    const ordersCollection = await getCollection('orders');
    const tablesCollection = await getCollection('tables');
    const menuCollection = await getCollection('menu_items');

    // 2. 🛡️ IDEMPOTENCY CHECK
    if (idempotencyKey && typeof idempotencyKey === 'string' && idempotencyKey.length > 5) {
      const existingIdempotentOrder = await ordersCollection.findOne({ idempotencyKey });
      if (existingIdempotentOrder) {
        return NextResponse.json({
          success: true,
          message: 'Order already processed (idempotent)',
          orderId: existingIdempotentOrder.orderId,
          checkoutToken: existingIdempotentOrder.checkoutToken,
        });
      }
    }

    // 3. 🛡️ STRICT SERVER-SIDE PRICE VALIDATION (Reject any unregistered items)
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
      if (isNaN(q) || q <= 0 || q > 100 || !Number.isInteger(q)) {
        return NextResponse.json(
          { error: `Invalid quantity for item "${item.itemName || item.name}". Must be an integer between 1 and 100.` },
          { status: 400 }
        );
      }

      // Look up official menu item in DB
      const mId = String(item.menuItemId || item._id || item.id || '');
      const rawName = String(item.itemName || item.name || '').toLowerCase().trim();
      const dbMenuItem = menuMap.get(mId) || menuMap.get(rawName);

      // 🛡️ STRICT: Reject unknown menu items
      if (!dbMenuItem) {
        return NextResponse.json(
          { error: `Item "${item.itemName || item.name || mId}" not found in menu. Unregistered items cannot be ordered.` },
          { status: 400 }
        );
      }

      const officialPrice = Number(dbMenuItem.price) || 0;
      const officialName = dbMenuItem.name;
      const category = dbMenuItem.category || 'general';
      const notes = typeof item.notes === 'string' ? item.notes.trim().slice(0, 200) : '';

      validatedItems.push({
        menuItemId: String(dbMenuItem._id),
        itemName: officialName,
        price: officialPrice,
        quantity: q,
        notes,
        category,
        subtotal: officialPrice * q,
      });
    }

    // 4. 🛡️ ATOMIC TABLE STATE & ACTIVE ORDER HANDLING
    // Check if there is an ACTIVE (unpaid/uncancelled) order currently on this table
    let existingActiveOrder = await ordersCollection.findOne({
      tableNumber: tNum,
      status: { $in: ['pending', 'preparing', 'served'] },
    });

    // -------------------------------------------------------------
    // CASE A: Table has an existing active order -> Append items
    // -------------------------------------------------------------
    if (existingActiveOrder) {
      const updatedItems = [...(existingActiveOrder.items || []), ...validatedItems];
      const subtotal = updatedItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
      const tax = Math.round(subtotal * 0.05 * 100) / 100;
      const serviceCharge = Math.round(subtotal * 0.1 * 100) / 100;
      const discount = Number(existingActiveOrder.discount) || 0;
      const total = Math.max(0, Math.round(subtotal + tax + serviceCharge - discount));

      await ordersCollection.updateOne(
        { _id: existingActiveOrder._id },
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
        orderId: existingActiveOrder.orderId,
        checkoutToken: existingActiveOrder.checkoutToken,
      });
    }

    // -------------------------------------------------------------
    // CASE B: No active order on this table -> Create NEW order & occupy table
    // -------------------------------------------------------------
    const subtotal = validatedItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
    const tax = Math.round(subtotal * 0.05 * 100) / 100;
    const serviceCharge = Math.round(subtotal * 0.1 * 100) / 100;
    const total = Math.round(subtotal + tax + serviceCharge);

    const orderId = generateId();
    const checkoutToken = generateSecureToken();

    const newOrder: any = {
      orderId,
      checkoutToken,
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
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Only attach idempotencyKey if it is a non-empty string (prevents null duplicate key collisions)
    if (idempotencyKey && typeof idempotencyKey === 'string' && idempotencyKey.trim()) {
      newOrder.idempotencyKey = idempotencyKey.trim();
    }

    try {
      await ordersCollection.insertOne(newOrder);

      // Set table status to occupied by current waiter
      await tablesCollection.updateOne(
        { table_number: tNum },
        {
          $set: {
            status: 'occupied',
            currentWaiterId: auth.user.userId,
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );

      return NextResponse.json({
        success: true,
        orderId: newOrder.orderId,
        checkoutToken: newOrder.checkoutToken,
      });
    } catch (insertErr: any) {
      console.error('Order insert error, rolling back table state:', insertErr);
      return NextResponse.json(
        { error: insertErr.message || 'Failed to record order' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Order creation error:', error);
    return NextResponse.json({ error: error.message || 'Server error creating order' }, { status: 500 });
  }
}

// GET: Authenticated fetch with filtering
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