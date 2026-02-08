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

    if (!tableNumber || !items.length) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    const ordersCollection = await getCollection('orders');
    const tablesCollection = await getCollection('tables');

    // 2. CHECK FOR EXISTING ACTIVE ORDER ON THIS TABLE
    const existingOrder = await ordersCollection.findOne({
        tableNumber: parseInt(tableNumber),
        status: { $in: ['pending', 'preparing', 'served'] } // Active statuses
    });

    // 3. IF ORDER EXISTS -> UPDATE IT (ADD ITEMS)
    if (existingOrder) {
        // Security Check: Only the waiter who started it can add to it
        if (existingOrder.waiterId !== session.userId) {
            return NextResponse.json({ error: `Table occupied by ${existingOrder.waiterName}` }, { status: 403 });
        }

        const updatedItems = [...existingOrder.items, ...items];
        
        // Recalculate Totals
        const subtotal = updatedItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
        const tax = subtotal * 0.05;
        const serviceCharge = subtotal * 0.1;
        const total = subtotal + tax + serviceCharge;

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
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.05; 
    const serviceCharge = subtotal * 0.1;
    const total = subtotal + tax + serviceCharge;

    const order = {
      orderId: generateId(),
      tableNumber: parseInt(tableNumber),
      waiterId: session.userId,
      waiterName: session.userName,
      customerName: customerName || 'Guest',
      customerEmail: customerEmail || '',
      items,
      status: 'pending', 
      subtotal, tax, serviceCharge, total,
      paymentStatus: 'unpaid',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await ordersCollection.insertOne(order);

    // LOCK TABLE
    await tablesCollection.updateOne(
        { table_number: parseInt(tableNumber) }, 
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
    } catch (e) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}