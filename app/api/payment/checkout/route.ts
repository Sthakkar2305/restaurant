import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { ObjectId } from 'mongodb';
import { getCollection, generateId } from '@/lib/mongodb';
import { Order } from '@/lib/schemas';

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const ordersCollection = await getCollection('orders');

    let query: any;
    try {
      query = { _id: new ObjectId(orderId) };
    } catch {
      query = { orderId };
    }

    const order = (await ordersCollection.findOne(query)) as Order | null;

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey || stripeSecretKey.includes('placeholder') || stripeSecretKey.length < 10) {
      return NextResponse.json(
        {
          success: false,
          error: 'Online Card Payment Gateway is not configured. Please use UPI QR Code or Cash settlement.',
        },
        { status: 503 }
      );
    }

    const stripe = new Stripe(stripeSecretKey);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // Create Stripe checkout session with server-authoritative amount
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: `Restaurant Bill #${order.orderId}`,
              description: `Dining Bill for Table ${order.tableNumber}`,
            },
            unit_amount: Math.round(Number(order.total) * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}&orderId=${order.orderId}`,
      cancel_url: `${baseUrl}/payment/cancelled?orderId=${order.orderId}`,
      metadata: {
        orderId: order.orderId,
        tableNumber: String(order.tableNumber),
      },
    });

    const paymentsCollection = await getCollection('payments');
    const paymentSessionId = generateId();

    await paymentsCollection.insertOne({
      sessionId: paymentSessionId,
      orderId: order.orderId,
      amount: order.total,
      currency: 'inr',
      status: 'pending',
      stripeSessionId: session.id,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initialize payment session' },
      { status: 500 }
    );
  }
}
