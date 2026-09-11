import { NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';
import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/mongodb';

// Helper to sanitize text for jsPDF standard fonts
function sanitizeText(str: any): string {
  if (!str) return '';
  return String(str)
    .replace(/[^\x20-\x7E]/g, '') // Keep standard printable ASCII
    .trim();
}

function generateInvoiceNumber(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `INV-${timestamp}-${random}`;
}

export async function POST(request: Request) {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const ordersCollection = await getCollection('orders');
    const settingsCollection = await getCollection('restaurant_profile');

    let query: any;
    try {
      query = { _id: new ObjectId(orderId) };
    } catch {
      query = { orderId: orderId };
    }

    const order = await ordersCollection.findOne(query);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Get restaurant profile
    let profile = await settingsCollection.findOne({ key: 'main_profile' });
    const restaurantName = sanitizeText(profile?.restaurantName) || 'Restaurant POS';
    const tagline = sanitizeText(profile?.tagline) || 'Fine Dining & Hospitality';
    const address = sanitizeText(profile?.address) || 'Main Street, City';
    const phone = sanitizeText(profile?.phone) || '+91 98765 43210';
    const gstin = sanitizeText(profile?.gstin) || '';

    // Create jsPDF Document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 200], // Standard 80mm POS Thermal Receipt format (or adaptable)
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 8;

    // Header: Restaurant Name & Branding
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(restaurantName, pageWidth / 2, y, { align: 'center' });

    y += 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    if (tagline) {
      doc.text(tagline, pageWidth / 2, y, { align: 'center' });
      y += 4;
    }
    if (address) {
      doc.text(address, pageWidth / 2, y, { align: 'center' });
      y += 4;
    }
    if (phone) {
      doc.text(`Ph: ${phone}`, pageWidth / 2, y, { align: 'center' });
      y += 4;
    }
    if (gstin) {
      doc.text(`GSTIN: ${gstin}`, pageWidth / 2, y, { align: 'center' });
      y += 4;
    }

    // Divider
    y += 1;
    doc.setLineWidth(0.3);
    doc.line(4, y, pageWidth - 4, y);

    // Bill Meta Details
    y += 4;
    doc.setFontSize(7.5);
    const invoiceNo = generateInvoiceNumber();
    const dateStr = new Date(order.createdAt || Date.now()).toLocaleDateString('en-GB');
    const timeStr = new Date(order.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    doc.text(`Bill No: ${invoiceNo}`, 4, y);
    doc.text(`Date: ${dateStr} ${timeStr}`, pageWidth - 4, y, { align: 'right' });

    y += 4;
    doc.text(`Table: ${order.tableNumber}`, 4, y);
    doc.text(`Waiter: ${sanitizeText(order.waiterName) || 'Staff'}`, pageWidth - 4, y, { align: 'right' });

    if (order.customerName && order.customerName !== 'Guest') {
      y += 4;
      doc.text(`Customer: ${sanitizeText(order.customerName)}`, 4, y);
    }

    // Table Header
    y += 3;
    doc.line(4, y, pageWidth - 4, y);
    y += 3.5;
    doc.setFont('helvetica', 'bold');
    doc.text('Item', 4, y);
    doc.text('Qty', 46, y, { align: 'center' });
    doc.text('Rate', 58, y, { align: 'right' });
    doc.text('Amt', pageWidth - 4, y, { align: 'right' });

    y += 2;
    doc.line(4, y, pageWidth - 4, y);

    // Items List
    y += 3.5;
    doc.setFont('helvetica', 'normal');

    (order.items || []).forEach((item: any) => {
      const rawName = item.itemName || item.name || 'Dish Item';
      const cleanName = sanitizeText(rawName) || 'Dish Item';
      const qty = item.quantity || 1;
      const price = Number(item.price || item.unit_price) || 0;
      const sub = Number(item.subtotal) || price * qty;

      // Truncate name if too long
      const displayName = cleanName.length > 20 ? cleanName.substring(0, 19) + '..' : cleanName;

      doc.text(displayName, 4, y);
      doc.text(String(qty), 46, y, { align: 'center' });
      doc.text(price.toFixed(0), 58, y, { align: 'right' });
      doc.text(sub.toFixed(0), pageWidth - 4, y, { align: 'right' });

      y += 4;
    });

    // Divider
    y += 1;
    doc.line(4, y, pageWidth - 4, y);

    // Totals Breakdown
    y += 4;
    const subtotal = Number(order.subtotal) || 0;
    const tax = Number(order.tax) || Math.round(subtotal * 0.05);
    const serviceCharge = Number(order.serviceCharge) || 0;
    const discount = Number(order.discount) || 0;
    const total = Number(order.total) || Math.round(subtotal + tax + serviceCharge - discount);

    doc.text('Subtotal:', 4, y);
    doc.text(`Rs. ${subtotal.toFixed(2)}`, pageWidth - 4, y, { align: 'right' });

    y += 3.5;
    doc.text('GST Tax (5%):', 4, y);
    doc.text(`Rs. ${tax.toFixed(2)}`, pageWidth - 4, y, { align: 'right' });

    if (serviceCharge > 0) {
      y += 3.5;
      doc.text('Service Charge:', 4, y);
      doc.text(`Rs. ${serviceCharge.toFixed(2)}`, pageWidth - 4, y, { align: 'right' });
    }

    if (discount > 0) {
      y += 3.5;
      doc.text('Discount:', 4, y);
      doc.text(`-Rs. ${discount.toFixed(2)}`, pageWidth - 4, y, { align: 'right' });
    }

    y += 2;
    doc.setLineWidth(0.5);
    doc.line(4, y, pageWidth - 4, y);

    y += 4.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('GRAND TOTAL:', 4, y);
    doc.text(`Rs. ${total.toFixed(0)}`, pageWidth - 4, y, { align: 'right' });

    // Footer Thank You Note
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Thank You! Visit Again', pageWidth / 2, y, { align: 'center' });

    const pdfBase64 = doc.output('datauristring');

    return NextResponse.json({
      success: true,
      invoiceNumber: invoiceNo,
      pdfBase64,
      restaurant: {
        name: restaurantName,
        address,
        phone,
        gstin,
      },
      order,
    });
  } catch (error: any) {
    console.error('Invoice generate error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate invoice' }, { status: 500 });
  }
}