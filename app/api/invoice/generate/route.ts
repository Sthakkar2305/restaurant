import { NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';
import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/mongodb';

function generateInvoiceNumber(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `INV-${timestamp}-${random}`;
}

export async function POST(request: Request) {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const ordersCollection = await getCollection('orders');
    
    // FIX: Search by either _id (MongoDB ID) OR orderId (Custom String)
    let query;
    try {
        // Try to treat it as a MongoDB ObjectId
        query = { _id: new ObjectId(orderId) };
    } catch {
        // If it fails, treat it as a custom string ID
        query = { orderId: orderId };
    }

    const order = await ordersCollection.findOne(query);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Generate invoice number
    const invoiceNumber = generateInvoiceNumber();

    // Create PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 10;

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Restaurant POS', pageWidth / 2, yPosition, { align: 'center' });

    yPosition += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Receipt / Invoice', pageWidth / 2, yPosition, { align: 'center' });

    // Invoice details
    yPosition += 15;
    doc.setFontSize(10);
    doc.text(`Invoice #: ${invoiceNumber}`, 15, yPosition);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - 15, yPosition, { align: 'right' });
    
    yPosition += 6;
    doc.text(`Order ID: ${order.orderId || order._id}`, 15, yPosition);
    doc.text(`Table: ${order.tableNumber}`, pageWidth - 15, yPosition, { align: 'right' });

    // Line
    yPosition += 5;
    doc.setLineWidth(0.5);
    doc.line(15, yPosition, pageWidth - 15, yPosition);

    // Items Header
    yPosition += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Item', 15, yPosition);
    doc.text('Qty', 120, yPosition, { align: 'center' });
    doc.text('Price', 150, yPosition, { align: 'right' });
    doc.text('Total', pageWidth - 15, yPosition, { align: 'right' });

    // Items List
    yPosition += 8;
    doc.setFont('helvetica', 'normal');
    
    let total = 0;
    (order.items || []).forEach((item: any) => {
      const itemTotal = item.price * item.quantity;
      total += itemTotal;
      
      doc.text(item.itemName || item.name || 'Item', 15, yPosition);
      doc.text(item.quantity.toString(), 120, yPosition, { align: 'center' });
      doc.text(item.price.toFixed(2), 150, yPosition, { align: 'right' });
      doc.text(itemTotal.toFixed(2), pageWidth - 15, yPosition, { align: 'right' });
      
      yPosition += 6;
    });

    // Totals
    yPosition += 5;
    doc.line(15, yPosition, pageWidth - 15, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'bold');
    doc.text('Grand Total:', 140, yPosition, { align: 'right' });
    doc.text(total.toFixed(2), pageWidth - 15, yPosition, { align: 'right' });

    // Footer
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text('Thank you for your visit!', pageWidth / 2, 280, { align: 'center' });

    // Return PDF
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoiceNumber}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Invoice generation error:', error);
    return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 });
  }
}