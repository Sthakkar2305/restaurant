'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Download, Loader, AlertCircle } from 'lucide-react';

interface BillingSummaryProps {
  orderId: string;
  tableNumber: number;
  items: Array<{
    name: string;
    quantity: number;
    unit_price: number;
  }>;
  subtotal: number;
  tax: number;
  serviceCharge: number;
  total: number;
}

export function BillingSummary({
  orderId,
  tableNumber,
  items,
  subtotal,
  tax,
  serviceCharge,
  total,
}: BillingSummaryProps) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate QR code on mount
  useEffect(() => {
    const generateQR = async () => {
      setIsGeneratingQR(true);
      try {
        const response = await fetch('/api/payment/qr-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        });

        if (!response.ok) throw new Error('Failed to generate QR code');
        const data = await response.json();
        setQrCode(data.qrCode);
      } catch (err) {
        console.error('QR code error:', err);
        setError('Failed to generate payment QR code');
      } finally {
        setIsGeneratingQR(false);
      }
    };

    generateQR();
  }, [orderId]);

  // Handle Stripe checkout
  const handleStripeCheckout = async () => {
    setIsPaying(true);
    try {
      const response = await fetch('/api/payment/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });

      if (!response.ok) throw new Error('Failed to create checkout session');
      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError('Failed to process payment. Please try again.');
    } finally {
      setIsPaying(false);
    }
  };

  // Handle download invoice
  const handleDownloadInvoice = async () => {
    try {
      const response = await fetch('/api/invoice/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });

      if (!response.ok) throw new Error('Failed to generate invoice');

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Invoice error:', err);
      setError('Failed to download invoice');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Billing Summary</h2>

      {/* Table Info */}
      <div className="bg-orange-50 border-l-4 border-orange-500 p-3 mb-4 rounded">
        <p className="text-sm font-semibold text-orange-900">
          Table {tableNumber}
        </p>
      </div>

      {/* Items */}
      <div className="space-y-2 mb-4 pb-4 border-b">
        {items.map((item, index) => (
          <div key={index} className="flex justify-between text-sm">
            <span className="text-gray-700">
              {item.name} × {item.quantity}
            </span>
            <span className="font-semibold text-gray-900">
              ₹{(item.unit_price * item.quantity).toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="space-y-2 mb-6">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal</span>
          <span>₹{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Tax (5%)</span>
          <span>₹{tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Service Charge (10%)</span>
          <span>₹{serviceCharge.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold border-t pt-2">
          <span>Total Amount</span>
          <span className="text-orange-600">₹{total.toFixed(2)}</span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex gap-2">
          <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* QR Code */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
        <p className="text-sm font-semibold text-gray-900 mb-3 text-center">
          Scan to Pay (UPI)
        </p>
        {isGeneratingQR ? (
          <div className="flex items-center justify-center h-40 text-gray-500">
            <Loader className="animate-spin" />
          </div>
        ) : qrCode ? (
          <div className="flex justify-center">
            <Image
              src={qrCode || "/placeholder.svg"}
              alt="Payment QR Code"
              width={200}
              height={200}
              className="border-2 border-gray-300 rounded"
            />
          </div>
        ) : (
          <p className="text-center text-sm text-gray-500">
            QR code not available
          </p>
        )}
        <p className="text-xs text-gray-600 text-center mt-3">
          Amount: ₹{total.toFixed(2)}
        </p>
      </div>

      {/* Payment Buttons */}
      <div className="space-y-3">
        <button
          onClick={handleStripeCheckout}
          disabled={isPaying}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isPaying ? 'Processing...' : 'Pay with Card (Stripe)'}
        </button>

        <button
          onClick={handleDownloadInvoice}
          className="w-full py-3 bg-gray-600 text-white rounded-lg font-bold hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
        >
          <Download size={18} />
          Download Invoice (PDF)
        </button>
      </div>

      <p className="text-xs text-gray-600 text-center mt-4">
        Thank you for dining with us!
      </p>
    </div>
  );
}
