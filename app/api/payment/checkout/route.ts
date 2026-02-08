import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getCollection, generateId } from '@/lib/mongodb';
import { Order } from '@/lib/schemas';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const { orderId } = await request.json();

    // Fetch order details
    const ordersCollection = await getCollection('orders');
    const order = (await ordersCollection.findOne({
      orderId,
    })) as Order | null;

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: `Order #${orderId}`,
              description: `Restaurant Order for Table ${order.tableNumber}`,
            },
            unit_amount: Math.round(order.total * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}&orderId=${orderId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/cancelled?orderId=${orderId}`,
      metadata: {
        orderId,
      },
    });

    // Store payment session in MongoDB
    const paymentsCollection = await getCollection('payments');
    const sessionId = generateId();
    await paymentsCollection.insertOne({
      sessionId,
      orderId,
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
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
