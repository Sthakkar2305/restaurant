import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/mongodb';

function getQuery(id: string) {
  try {
    return { _id: new ObjectId(id) };
  } catch {
    return { orderId: id };
  }
}

// GET single order
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Type as Promise
) {
  try {
    const { id } = await params; // AWAIT params here
    const ordersCollection = await getCollection('orders');
    const order = await ordersCollection.findOne(getQuery(id));

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}

// PATCH update order status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Type as Promise
) {
  try {
    const { id } = await params; // AWAIT params here
    const { status } = await request.json();
    const ordersCollection = await getCollection('orders');
    const tablesCollection = await getCollection('tables');

    // 1. Update the Order
    const result = await ordersCollection.findOneAndUpdate(
      getQuery(id),
      { $set: { status, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const updatedOrder = result;

    // 2. If Order is PAID, free up the table automatically
    if (status === 'paid' && updatedOrder.tableNumber) {
        await tablesCollection.updateOne(
            { table_number: updatedOrder.tableNumber },
            { 
                $set: { 
                    status: 'available', 
                    currentWaiterId: null 
                } 
            }
        );
    }

    return NextResponse.json({
      success: true,
      message: 'Order updated',
      order: updatedOrder
    });
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}