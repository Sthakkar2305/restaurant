import { NextRequest, NextResponse } from 'next/server';
import { getCollection, generateId } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    // 1. Verify Session
    const sessionCookie = request.cookies.get('sessionId')?.value;
    if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const sessions = await getCollection('sessions');
    const session = await sessions.findOne({ sessionId: sessionCookie });
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { tableNumber, items, customerName, customerEmail } = await request.json();

    if (!tableNumber || !items?.length) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    const ordersCollection = await getCollection('orders');
    const tablesCollection = await getCollection('tables');

    // Clean and normalize items
    const normalizedItems = items.map((i: any) => ({
      menuItemId: i.menuItemId || i._id || i.id || generateId(),
      itemName: i.itemName || i.name || 'Dish Item',
      price: Number(i.price) || 0,
      quantity: Number(i.quantity) || 1,
      notes: i.notes || '',
      category: i.category || 'general',
      subtotal: (Number(i.price) || 0) * (Number(i.quantity) || 1),
    }));

    // 2. CHECK FOR EXISTING ACTIVE ORDER ON THIS TABLE
    const existingOrder = await ordersCollection.findOne({
        tableNumber: parseInt(tableNumber, 10),
        status: { $in: ['pending', 'preparing', 'served'] }
    });

    // 3. IF ORDER EXISTS -> UPDATE IT (ADD ITEMS)
    if (existingOrder) {
        if (existingOrder.waiterId !== session.userId) {
            return NextResponse.json({ error: `Table occupied by ${existingOrder.waiterName}` }, { status: 403 });
        }

        const updatedItems = [...existingOrder.items, ...normalizedItems];
        
        // Recalculate Totals
        const subtotal = updatedItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
        const tax = Math.round(subtotal * 0.05 * 100) / 100;
        const serviceCharge = Math.round(subtotal * 0.1 * 100) / 100;
        const total = Math.round(subtotal + tax + serviceCharge);

        await ordersCollection.updateOne(
            { _id: existingOrder._id },
            { 
                $set: { 
                    items: updatedItems,
                    subtotal, tax, serviceCharge, total,
                    updatedAt: new Date()
                } 
            }
        );

        return NextResponse.json({ success: true, message: "Order Updated", orderId: existingOrder.orderId });
    }

    // 4. IF NO ORDER -> CREATE NEW
    const subtotal = normalizedItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    const tax = Math.round(subtotal * 0.05 * 100) / 100; 
    const serviceCharge = Math.round(subtotal * 0.1 * 100) / 100;
    const total = Math.round(subtotal + tax + serviceCharge);

    const order = {
      orderId: generateId(),
      tableNumber: parseInt(tableNumber, 10),
      waiterId: session.userId,
      waiterName: session.userName,
      customerName: customerName || 'Guest',
      customerEmail: customerEmail || '',
      items: normalizedItems,
      status: 'pending', 
      subtotal, tax, serviceCharge, total,
      paymentStatus: 'unpaid',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await ordersCollection.insertOne(order);

    // LOCK TABLE
    await tablesCollection.updateOne(
        { table_number: parseInt(tableNumber, 10) }, 
        { 
            $set: { 
                status: 'occupied',
                currentWaiterId: session.userId 
            } 
        }
    );

    return NextResponse.json({ success: true, orderId: order.orderId });
  } catch (error) {
    console.error('Order error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
    try {
        const ordersCollection = await getCollection('orders');
        const orders = await ordersCollection.find({}).sort({ createdAt: -1 }).toArray();
        return NextResponse.json({ orders });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }
}