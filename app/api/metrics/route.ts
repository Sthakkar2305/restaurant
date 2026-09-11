import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { Order } from '@/lib/schemas';
import { requireAdmin } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    // Get orders from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const ordersCollection = await getCollection('orders');
    const orders = (await ordersCollection
      .find({ createdAt: { $gte: today } })
      .toArray()) as Order[];

    // Calculate metrics
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const paidOrders = orders.filter((o) => o.status === 'paid' || o.paymentStatus === 'paid').length;
    const pendingOrders = orders.filter((o) => o.status === 'pending').length;
    const preparingOrders = orders.filter((o) => o.status === 'preparing').length;
    const servedOrders = orders.filter((o) => o.status === 'served').length;

    return NextResponse.json({
      metrics: {
        date: today.toDateString(),
        totalOrders,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        paidOrders,
        pendingOrders,
        preparingOrders,
        servedOrders,
        completionRate:
          totalOrders > 0
            ? Math.round((paidOrders / totalOrders) * 100)
            : 0,
      },
    });
  } catch (error) {
    console.error('Metrics fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
