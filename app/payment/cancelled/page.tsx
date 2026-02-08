'use client';

import { useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Suspense } from 'react';
import Loading from './loading';

export default function PaymentCancelledPage() {
  return (
    <Suspense fallback={<Loading />}>
      <PaymentCancelledContent />
    </Suspense>
  );
}

function PaymentCancelledContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6 mx-auto">
          <AlertCircle size={32} className="text-red-600" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Payment Cancelled
        </h1>
        <p className="text-gray-600 mb-6">
          Your payment has been cancelled. You can try again or proceed with a different payment method.
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
          <a
            href={orderId ? `/checkout?orderId=${orderId}` : '/checkout'}
            className="block w-full py-3 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 transition-colors"
          >
            Try Payment Again
          </a>

          <a
            href="/"
            className="block w-full py-3 bg-gray-200 text-gray-900 rounded-lg font-bold hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} />
            Back to Home
          </a>
        </div>

        <p className="text-xs text-gray-600 mt-6">
          Your order remains active. Please complete payment to proceed.
        </p>
      </div>
    </div>
  );
}
