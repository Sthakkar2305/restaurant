'use client';

import { Clock, CheckCircle, ChefHat, IndianRupee } from 'lucide-react';

export interface OrderData {
  id: string;
  table_number: number;
  waiter_name: string;
  status: 'pending' | 'preparing' | 'served' | 'paid' | 'cancelled';
  subtotal: number;
  tax_amount: number;
  service_charge: number;
  total_amount: number;
  created_at: string;
  items: any[];
}

interface OrderCardProps {
  order: OrderData;
  onStatusChange: (orderId: string, status: string) => Promise<void>;
}

export function OrderCard({ order, onStatusChange }: OrderCardProps) {
  
  const formatTime = (dateString: string) => {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Just now';
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
        return 'Just now';
    }
  };

  const statusColors = {
    pending: 'bg-yellow-50 border-yellow-200',
    preparing: 'bg-blue-50 border-blue-200',
    served: 'bg-green-50 border-green-200',
    paid: 'bg-purple-50 border-purple-200',
    cancelled: 'bg-red-50 border-red-200',
  };

  return (
    <div className={`bg-white rounded-xl border-2 shadow-sm overflow-hidden flex flex-col h-full ${statusColors[order.status] || 'border-gray-200'}`}>
      
      {/* Header */}
      <div className="p-4 border-b flex justify-between items-start bg-white/50">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <span className="bg-black text-white text-xs font-bold px-2 py-1 rounded">
               Table {order.table_number}
             </span>
             <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                <Clock size={12} /> {formatTime(order.created_at)}
             </span>
          </div>
          <p className="text-xs text-gray-500">Waiter: <span className="font-semibold text-gray-700">{order.waiter_name}</span></p>
        </div>
        
        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border
            ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 
              order.status === 'preparing' ? 'bg-blue-100 text-blue-700 border-blue-200' : 
              order.status === 'served' ? 'bg-green-100 text-green-700 border-green-200' : 
              'bg-gray-100 text-gray-700 border-gray-200'}`}>
            {order.status}
        </span>
      </div>

      {/* Items List */}
      <div className="p-4 flex-1 bg-white">
        <ul className="space-y-2 mb-4">
          {order.items.map((item: any, idx: number) => (
            <li key={idx} className="flex justify-between text-sm items-start border-b border-dashed border-gray-100 pb-2 last:border-0">
              <div className="flex gap-2">
                <span className="font-bold text-gray-900 w-5">{item.quantity}x</span>
                <span className="text-gray-700 leading-tight">{item.name}</span>
              </div>
              <span className="text-gray-500 text-xs font-mono">
                ₹{(item.unit_price * item.quantity).toFixed(0)}
              </span>
            </li>
          ))}
        </ul>

        {/* Cost Breakdown (Restored) */}
        <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
            <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>₹{order.subtotal?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between text-gray-500">
                <span>Tax (5%)</span>
                <span>₹{order.tax_amount?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between text-gray-500">
                <span>Service Charge (10%)</span>
                <span>₹{order.service_charge?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between font-bold text-base text-gray-900 border-t border-gray-200 pt-2 mt-1">
                <span>Total</span>
                <span>₹{order.total_amount?.toFixed(2) || '0.00'}</span>
            </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-3 bg-gray-50 border-t grid grid-cols-1 gap-2">
        {order.status === 'pending' && (
           <button onClick={() => onStatusChange(order.id, 'preparing')} className="bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm">
              <ChefHat size={16} /> Accept & Prepare
           </button>
        )}
        {order.status === 'preparing' && (
           <button onClick={() => onStatusChange(order.id, 'served')} className="bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm">
              <CheckCircle size={16} /> Mark Served
           </button>
        )}
        {order.status === 'served' && (
           <button onClick={() => onStatusChange(order.id, 'paid')} className="bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm">
              <IndianRupee size={16} /> Settle & Pay
           </button>
        )}
      </div>
    </div>
  );
}