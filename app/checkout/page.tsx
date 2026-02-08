'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BillingSummary } from '@/components/checkout/billing-summary';
import Loading from './loading';

interface OrderData {
  id: string;
  table_number: number;
  total_amount: number;
  subtotal: number;
  tax_amount: number;
  service_charge: number;
  order_items: Array<{
    menu_items: {
      name: string;
    };
    quantity: number;
    unit_price: number;
  }>;
}

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  const [order, setOrder] = useState<OrderData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setError('No order ID provided');
      setIsLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        // In production, fetch from API
        // For now, using mock data
        const mockOrder: OrderData = {
          id: orderId,
          table_number: 1,
          total_amount: 500,
          subtotal: 400,
          tax_amount: 20,
          service_charge: 40,
          order_items: [
            {
              menu_items: { name: 'Chicken Biryani' },
              quantity: 1,
              unit_price: 350,
            },
            {
              menu_items: { name: 'Mango Lassi' },
              quantity: 2,
              unit_price: 50,
            },
          ],
        };
        setOrder(mockOrder);
      } catch (err) {
        console.error('Failed to fetch order:', err);
        setError('Failed to load order details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  if (isLoading) {
    return <Loading />;
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-red-600 font-semibold mb-4">{error}</p>
          <a
            href="/"
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <BillingSummary
        orderId={orderId || ''}
        tableNumber={order.table_number}
        items={order.order_items.map((item) => ({
          name: item.menu_items.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
        }))}
        subtotal={order.subtotal}
        tax={order.tax_amount}
        serviceCharge={order.service_charge}
        total={order.total_amount}
      />
    </div>
  );
}
