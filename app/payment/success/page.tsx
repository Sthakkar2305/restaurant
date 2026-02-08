'use client';

import { useSearchParams } from 'next/navigation';
import { CheckCircle, Download } from 'lucide-react';
import { Suspense } from 'react';

// We create a separate component for the content to wrap it in Suspense
// This prevents the "useSearchParams() should be wrapped in a suspense boundary" error
function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  const handleDownloadInvoice = async () => {
    if (!orderId) return;

    try {
      const response = await fetch('/api/invoice/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });

      if (!response.ok) throw new Error('Failed to generate invoice');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Invoice error:', error);
      alert('Failed to download invoice');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6 mx-auto">
        <CheckCircle size={32} className="text-green-600" />
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Payment Successful!
      </h1>
      <p className="text-gray-600 mb-6">
        Thank you for dining with us. Your payment has been processed
        successfully.
      </p>

      {orderId && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-600">Order ID</p>
          <p className="text-lg font-mono font-bold text-gray-900 break-all">
            {orderId}
          </p>
        </div>
      )}

      <div className="space-y-3">
        <button
          onClick={handleDownloadInvoice}
          className="w-full py-3 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
        >
          <Download size={18} />
          Download Invoice
        </button>

        <a
          href="/"
          className="block w-full py-3 bg-gray-200 text-gray-900 rounded-lg font-bold hover:bg-gray-300 transition-colors"
        >
          Back to Home
        </a>
      </div>

      <p className="text-xs text-gray-600 mt-6">
        A copy of your invoice has been sent to your email.
      </p>
    </div>
  );
}

// Main Page Component
export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center px-4">
      <Suspense fallback={<div>Loading...</div>}>
        <PaymentSuccessContent />
      </Suspense>
    </div>
  );
}