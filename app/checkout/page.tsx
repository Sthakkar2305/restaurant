'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { BillingSummary } from '@/components/checkout/billing-summary';
import Loading from './loading';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface OrderItem {
  itemName: string;
  price: number;
  quantity: number;
  subtotal: number;
}

interface OrderData {
  orderId: string;
  tableNumber: number;
  customerName?: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  serviceCharge: number;
  discount?: number;
  total: number;
  status: string;
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const token = searchParams.get('token') || '';

  const [order, setOrder] = useState<OrderData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setError('No order ID provided. Please scan your table QR code or request your bill from staff.');
      setIsLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';
        const res = await fetch(`/api/orders/${orderId}${tokenQuery}`);
        const data = await res.json();

        if (!res.ok || !data.order) {
          throw new Error(data.error || 'Order not found');
        }

        setOrder(data.order);
      } catch (err: any) {
        console.error('Failed to fetch order:', err);
        setError(err.message || 'Failed to load order details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, token]);

  if (isLoading) {
    return <Loading />;
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-950 border border-slate-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Order Not Found</h2>
          <p className="text-slate-400 text-sm mb-6">{error || 'Unable to retrieve your order.'}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold transition-colors"
          >
            <ArrowLeft size={18} />
            Back to Terminal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 py-12 px-4 selection:bg-orange-500 selection:text-white">
      <BillingSummary
        orderId={order.orderId || (orderId as string)}
        tableNumber={order.tableNumber}
        items={(order.items || []).map((item) => ({
          name: item.itemName,
          quantity: item.quantity,
          unit_price: item.price,
        }))}
        subtotal={order.subtotal || 0}
        tax={order.tax || 0}
        serviceCharge={order.serviceCharge || 0}
        total={order.total || 0}
      />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CheckoutContent />
    </Suspense>
  );
}
