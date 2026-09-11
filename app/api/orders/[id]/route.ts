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

// GET: Single order details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

// PUT: Full Bill Modification (Admin edits items, quantities, discounts, recalculates totals)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { items, discount = 0, discountReason = '', customerName, customerEmail, status } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Order must contain at least one item' }, { status: 400 });
    }

    const ordersCollection = await getCollection('orders');

    // Recalculate totals
    const subtotal = items.reduce(
      (sum: number, item: any) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
      0
    );
    const tax = Math.round(subtotal * 0.05 * 100) / 100;
    const serviceCharge = Math.round(subtotal * 0.1 * 100) / 100;
    const discAmount = Number(discount) || 0;
    const total = Math.max(0, Math.round(subtotal + tax + serviceCharge - discAmount));

    const updateDoc: any = {
      items,
      subtotal,
      tax,
      serviceCharge,
      discount: discAmount,
      discountReason,
      total,
      updatedAt: new Date(),
    };

    if (customerName !== undefined) updateDoc.customerName = customerName;
    if (customerEmail !== undefined) updateDoc.customerEmail = customerEmail;
    if (status !== undefined) updateDoc.status = status;

    const result = await ordersCollection.findOneAndUpdate(
      getQuery(id),
      { $set: updateDoc },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Bill updated successfully',
      order: result,
    });
  } catch (error: any) {
    console.error('Bill edit error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update bill' }, { status: 500 });
  }
}

// PATCH: Partial status update
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status } = await request.json();
    const ordersCollection = await getCollection('orders');
    const tablesCollection = await getCollection('tables');

    const result = await ordersCollection.findOneAndUpdate(
      getQuery(id),
      { $set: { status, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const updatedOrder = result;

    // If Order is PAID, free up table
    if (status === 'paid' && updatedOrder.tableNumber) {
      await tablesCollection.updateOne(
        { table_number: updatedOrder.tableNumber },
        {
          $set: {
            status: 'available',
            currentWaiterId: null,
          },
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Order status updated',
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}