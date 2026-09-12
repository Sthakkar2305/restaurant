import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getCollection } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature');

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!webhookSecret || !stripeSecretKey) {
      console.warn('Stripe webhook received but STRIPE_WEBHOOK_SECRET is not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured on server' },
        { status: 500 }
      );
    }

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing Stripe signature header' },
        { status: 400 }
      );
    }

    const stripe = new Stripe(stripeSecretKey);
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: any) {
      console.error('⚠️ Stripe Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err.message}` },
        { status: 400 }
      );
    }

    // 🛡️ Handle Checkout Session Completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;

      if (orderId) {
        const ordersCollection = await getCollection('orders');
        const tablesCollection = await getCollection('tables');

        const order = await ordersCollection.findOne({ orderId });

        if (order) {
          // Idempotently mark order as paid
          await ordersCollection.updateOne(
            { orderId },
            {
              $set: {
                status: 'paid',
                paymentStatus: 'paid',
                paymentMethod: 'card',
                stripeSessionId: session.id,
                stripePaymentIntentId: String(session.payment_intent || ''),
                paidAt: new Date(),
                updatedAt: new Date(),
              },
            }
          );

          // Free up table
          if (order.tableNumber) {
            await tablesCollection.updateOne(
              { table_number: order.tableNumber },
              {
                $set: {
                  status: 'available',
                  currentWaiterId: null,
                  updatedAt: new Date(),
                },
              }
            );
          }

          console.log(`✅ Order #${orderId} successfully reconciled and marked paid via Stripe webhook`);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Stripe webhook handling error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
