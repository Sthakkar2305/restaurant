import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getCollection } from '@/lib/mongodb';
import { Order } from '@/lib/schemas';

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

    // Create UPI string for QR code
    const upiString = `upi://pay?pa=${process.env.NEXT_PUBLIC_UPI_ID || 'restaurant@upi'}&pn=RestaurantOrder&am=${order.total}&tr=${orderId}&tn=Order%20%23${orderId}`;

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(upiString, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 1,
      width: 300,
    });

    // Update order with QR code
    await ordersCollection.updateOne(
      { orderId },
      {
        $set: {
          qrCodeData: qrCodeDataUrl,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      qrCode: qrCodeDataUrl,
      amount: order.total,
    });
  } catch (error) {
    console.error('QR code generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}
