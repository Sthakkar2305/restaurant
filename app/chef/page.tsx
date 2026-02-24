'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChefHat, CheckCircle, Clock } from 'lucide-react';

export default function ChefPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      if (!res.ok) return;
      const data = await res.json();
      
      // Chef only needs to see things that need cooking
      const kitchenOrders = (data.orders || []).filter(
        (o: any) => o.status === 'pending' || o.status === 'preparing'
      );
      setOrders(kitchenOrders);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 3000); // Auto-refresh every 3 sec
    return () => clearInterval(interval);
  }, []);

  const markStatus = async (orderId: string, newStatus: string) => {
    // Optimistic UI update for instant feedback
    setOrders(prev => prev.filter(o => o.orderId !== orderId || newStatus !== 'served'));
    
    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchOrders();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <header className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
        <div className="flex items-center gap-3">
            <ChefHat size={40} className="text-orange-500" />
            <h1 className="text-3xl font-black text-white tracking-widest uppercase">Kitchen KDS</h1>
        </div>
        <button onClick={() => { document.cookie = 'sessionId=; path=/;'; router.push('/'); }} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded text-lg">
          LOGOUT
        </button>
      </header>

      {isLoading ? (
        <div className="text-center mt-20 text-2xl animate-pulse">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-32 text-gray-500">
            <CheckCircle size={80} className="mb-4 opacity-50" />
            <h2 className="text-4xl font-bold">Kitchen is clear!</h2>
            <p className="text-xl mt-2">No active orders right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {orders.map((order) => (
            <div 
                key={order._id} 
                className={`rounded-2xl overflow-hidden border-4 flex flex-col ${
                    order.status === 'preparing' ? 'border-orange-500 bg-gray-800' : 'border-gray-600 bg-gray-800'
                }`}
            >
              {/* Header (Big Table Number) */}
              <div className={`p-4 text-center ${order.status === 'preparing' ? 'bg-orange-500 text-white' : 'bg-gray-700 text-white'}`}>
                  <p className="text-sm font-bold uppercase tracking-widest opacity-80">Table Number</p>
                  <h2 className="text-6xl font-black">{order.tableNumber}</h2>
                  <p className="text-sm mt-2 opacity-80">Waiter: {order.waiterName}</p>
              </div>

              {/* Items List (Big Item Names) */}
              <div className="p-6 flex-1 bg-white text-black">
                <ul className="space-y-4">
                  {order.items.map((item: any, idx: number) => (
                    <li key={idx} className="flex justify-between items-center border-b pb-2 last:border-0">
                      <span className="text-2xl font-bold leading-tight w-3/4">{item.itemName || item.name}</span>
                      <span className="text-3xl font-black text-orange-600 bg-orange-100 px-4 py-1 rounded-lg">
                        x{item.quantity}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="p-4 bg-gray-900">
                 {order.status === 'pending' ? (
                     <button 
                        onClick={() => markStatus(order._id, 'preparing')}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white text-2xl font-black py-5 rounded-xl flex items-center justify-center gap-3 transition-transform active:scale-95"
                     >
                        <Clock size={28} /> START COOKING
                     </button>
                 ) : (
                     <button 
                        onClick={() => markStatus(order._id, 'served')}
                        className="w-full bg-green-500 hover:bg-green-400 text-white text-2xl font-black py-5 rounded-xl flex items-center justify-center gap-3 transition-transform active:scale-95 shadow-[0_0_15px_rgba(34,197,94,0.5)]"
                     >
                        <CheckCircle size={28} /> FOOD READY
                     </button>
                 )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}