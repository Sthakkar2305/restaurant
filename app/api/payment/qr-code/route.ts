import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/mongodb';
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

    const upiId = process.env.NEXT_PUBLIC_UPI_ID || 'restaurant@upi';
    const amount = Number(order.total) || 0;
    const upiString = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=RestaurantOrder&am=${amount.toFixed(2)}&tr=${encodeURIComponent(order.orderId)}&tn=Order%20%23${encodeURIComponent(order.orderId)}`;

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(upiString, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 1,
      width: 300,
    });

    return NextResponse.json({
      success: true,
      qrCode: qrCodeDataUrl,
      amount,
      orderId: order.orderId,
      status: 'initiated',
    });
  } catch (error: any) {
    console.error('QR code generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}
