import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/mongodb';
import { requireAdmin, requireStaff, getAuthenticatedUser } from '@/lib/api-helpers';

function getQuery(id: string) {
  try {
    return { _id: new ObjectId(id) };
  } catch {
    return { orderId: id };
  }
}

// GET: Dual-mode authorization for single order details
// 1. Authenticated Staff (Waiter, Chef, Admin, Superadmin) -> Full access
// 2. Customer Checkout -> Requires cryptographic ?token=<checkoutToken>
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const checkoutToken = searchParams.get('token');

    const ordersCollection = await getCollection('orders');
    const staffUser = await getAuthenticatedUser(request);

    // If authenticated staff member
    if (staffUser) {
      const order = await ordersCollection.findOne(getQuery(id));
      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, order });
    }

    // If guest customer accessing via checkout token
    if (checkoutToken && checkoutToken.length >= 32) {
      const query: any = {
        ...getQuery(id),
        checkoutToken,
      };

      const order = await ordersCollection.findOne(query);
      if (!order) {
        return NextResponse.json(
          { error: 'Invalid or expired checkout access token' },
          { status: 403 }
        );
      }

      // Return sanitized customer bill (hiding internal IDs)
      return NextResponse.json({
        success: true,
        order: {
          orderId: order.orderId,
          tableNumber: order.tableNumber,
          customerName: order.customerName,
          items: order.items,
          subtotal: order.subtotal,
          tax: order.tax,
          serviceCharge: order.serviceCharge,
          discount: order.discount,
          total: order.total,
          status: order.status,
          paymentStatus: order.paymentStatus,
          createdAt: order.createdAt,
        },
      });
    }

    // Anonymous request without valid capability token -> Block IDOR
    return NextResponse.json(
      { error: 'Unauthorized: Staff authentication or valid checkout token required' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Fetch order error:', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}

// PUT: Full Bill Modification (STRICTLY ADMIN / SUPERADMIN ONLY)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const { id } = await params;
    const body = await request.json();
    const { items, discount = 0, discountReason = '', customerName, customerEmail, status } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Order must contain at least one item' }, { status: 400 });
    }

    const ordersCollection = await getCollection('orders');
    const menuCollection = await getCollection('menu_items');
    const tablesCollection = await getCollection('tables');

    // Fetch official menu items for strict server-side price verification
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
      notes?: string;
      category?: string;
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

      const mId = String(item.menuItemId || item._id || item.id || '');
      const rawName = String(item.itemName || item.name || '').toLowerCase().trim();
      const dbMenuItem = menuMap.get(mId) || menuMap.get(rawName);

      // 🛡️ STRICT: Reject unknown menu items
      if (!dbMenuItem) {
        return NextResponse.json(
          { error: `Item "${item.itemName || item.name || mId}" not found in menu. Unregistered items cannot be billed.` },
          { status: 400 }
        );
      }

      const officialPrice = Number(dbMenuItem.price) || 0;
      const officialName = dbMenuItem.name;

      validatedItems.push({
        menuItemId: String(dbMenuItem._id),
        itemName: officialName,
        price: officialPrice,
        quantity: q,
        notes: typeof item.notes === 'string' ? item.notes.trim().slice(0, 200) : '',
        category: dbMenuItem.category || 'general',
        subtotal: officialPrice * q,
      });
    }

    // Authoritative calculations
    const subtotal = validatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = Math.round(subtotal * 0.05 * 100) / 100;
    const serviceCharge = Math.round(subtotal * 0.1 * 100) / 100;
    const discAmount = Math.max(0, Math.min(subtotal + tax + serviceCharge, Number(discount) || 0));
    const total = Math.max(0, Math.round(subtotal + tax + serviceCharge - discAmount));

    const updateDoc: any = {
      items: validatedItems,
      subtotal,
      tax,
      serviceCharge,
      discount: discAmount,
      discountReason: String(discountReason || '').slice(0, 200),
      total,
      updatedAt: new Date(),
    };

    if (customerName !== undefined) updateDoc.customerName = String(customerName).slice(0, 100);
    if (customerEmail !== undefined) updateDoc.customerEmail = String(customerEmail).slice(0, 100);
    if (status !== undefined) updateDoc.status = status;

    const result = await ordersCollection.findOneAndUpdate(
      getQuery(id),
      { $set: updateDoc },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // If marked paid, free up table
    if (status === 'paid' && result.tableNumber) {
      await tablesCollection.updateOne(
        { table_number: result.tableNumber },
        { $set: { status: 'available', currentWaiterId: null } }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Bill recalculated and updated successfully',
      order: result,
    });
  } catch (error: any) {
    console.error('Bill edit error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update bill' }, { status: 500 });
  }
}

// PATCH: Order Status Update with Strict State Machine & Role RBAC
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaff(request);
    if (auth.response || !auth.user) return auth.response;

    const { id } = await params;
    const { status } = await request.json();

    const VALID_STATUSES = ['pending', 'preparing', 'served', 'paid', 'cancelled'];
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Allowed values: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    const ordersCollection = await getCollection('orders');
    const tablesCollection = await getCollection('tables');

    const existingOrder = await ordersCollection.findOne(getQuery(id));
    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 🛡️ ROLE BOUNDARY: Chefs CANNOT perform financial settlement or cancellations
    if (auth.user.role === 'chef') {
      if (status === 'paid' || status === 'cancelled') {
        return NextResponse.json(
          { error: `Forbidden: Kitchen staff (Chef) cannot mark orders as "${status}". Financial settlement requires Waiter or Admin authority.` },
          { status: 403 }
        );
      }
    }

    // State machine safety checks: Cannot alter paid order without Admin permissions
    if (existingOrder.status === 'paid' && status !== 'paid') {
      if (auth.user.role !== 'admin' && auth.user.role !== 'superadmin') {
        return NextResponse.json(
          { error: 'Cannot modify a closed / paid order without Admin permissions' },
          { status: 403 }
        );
      }
    }

    const updateData: any = { status, updatedAt: new Date() };
    if (status === 'paid') {
      updateData.paymentStatus = 'paid';
    }

    const result = await ordersCollection.findOneAndUpdate(
      getQuery(id),
      { $set: updateData },
      { returnDocument: 'after' }
    );

    // If Order is PAID or CANCELLED, free up table
    if ((status === 'paid' || status === 'cancelled') && existingOrder.tableNumber) {
      await tablesCollection.updateOne(
        { table_number: existingOrder.tableNumber },
        {
          $set: {
            status: 'available',
            currentWaiterId: null,
            updatedAt: new Date(),
          },
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Order status updated to ${status}`,
      order: result,
    });
  } catch (error) {
    console.error('Update status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}