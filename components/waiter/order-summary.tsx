'use client';

import { Trash2, Send } from 'lucide-react';

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  specialInstructions?: string;
}

interface OrderSummaryProps {
  items: CartItem[];
  selectedTableNumber?: number;
  onRemoveItem: (menuItemId: string) => void;
  onSendOrder: () => Promise<void>;
  isLoading?: boolean;
}

export function OrderSummary({
  items,
  selectedTableNumber,
  onRemoveItem,
  onSendOrder,
  isLoading = false,
}: OrderSummaryProps) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.05;
  const serviceCharge = subtotal * 0.1;
  const total = subtotal + tax + serviceCharge;

  const isEmpty = items.length === 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sticky bottom-0 md:sticky md:top-0">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>

      {/* Selected Table */}
      {selectedTableNumber ? (
        <div className="bg-orange-50 border-l-4 border-orange-500 p-3 mb-4 rounded">
          <p className="text-sm font-semibold text-orange-900">
            Table {selectedTableNumber}
          </p>
        </div>
      ) : (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 mb-4 rounded">
          <p className="text-xs text-yellow-900 font-semibold">
            ⚠ Please select a table
          </p>
        </div>
      )}

      {/* Items List */}
      <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No items selected
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.menuItemId}
              className="flex items-center justify-between bg-gray-50 p-2 rounded"
            >
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  {item.name}
                </p>
                <p className="text-xs text-gray-600">
                  {item.quantity} × ₹{item.price.toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-orange-600 min-w-[50px] text-right">
                  ₹{(item.price * item.quantity).toFixed(2)}
                </span>
                <button
                  onClick={() => onRemoveItem(item.menuItemId)}
                  className="p-1 hover:bg-red-100 rounded transition-colors"
                  aria-label={`Remove ${item.name}`}
                >
                  <Trash2 size={16} className="text-red-600" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Totals */}
      <div className="border-t pt-3 space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Tax (5%)</span>
          <span className="font-semibold">₹{tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Service Charge (10%)</span>
          <span className="font-semibold">₹{serviceCharge.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-lg border-t pt-2">
          <span className="font-bold">Total</span>
          <span className="font-bold text-orange-600">₹{total.toFixed(2)}</span>
        </div>
      </div>

      {/* Send Order Button */}
      <button
        onClick={onSendOrder}
        disabled={isEmpty || !selectedTableNumber || isLoading}
        className={`
          w-full py-3 rounded-lg font-bold text-white flex items-center justify-center gap-2
          transition-all duration-200
          ${
            isEmpty || !selectedTableNumber || isLoading
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 active:scale-95'
          }
        `}
      >
        <Send size={20} />
        {isLoading ? 'Sending...' : 'Send Order'}
      </button>
    </div>
  );
}
