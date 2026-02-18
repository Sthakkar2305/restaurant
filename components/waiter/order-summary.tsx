'use client';

import { Trash2, X } from 'lucide-react';

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

interface OrderSummaryProps {
  items: CartItem[];
  selectedTableNumber?: number;
  onRemoveItem: (menuItemId: string) => void;
  onSendOrder: () => Promise<void>;
  isLoading?: boolean;
  isOpen?: boolean;      // NEW: Controls mobile visibility
  onClose?: () => void;  // NEW: Closes mobile cart
}

export function OrderSummary({
  items,
  selectedTableNumber,
  onRemoveItem,
  onSendOrder,
  isLoading = false,
  isOpen = false,
  onClose,
}: OrderSummaryProps) {
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const tax = subtotal * 0.05;
  const serviceCharge = subtotal * 0.1;
  const total = subtotal + tax + serviceCharge;
  const isEmpty = items.length === 0;

  // Reusable Content for both Desktop and Mobile
  const CartContent = () => (
    <div className="flex flex-col h-full">
      {/* Items List */}
      <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
        {isEmpty ? (
          <div className="text-center text-gray-400 py-10">Cart is empty</div>
        ) : (
          items.map((item) => (
            <div key={item.menuItemId} className="flex justify-between items-center bg-gray-50 p-2 rounded">
              <div>
                <p className="font-semibold text-sm">{item.name}</p>
                <p className="text-xs text-gray-600">
                  {item.quantity} × ₹{item.price.toFixed(0)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-gray-700">
                  ₹{(item.price * item.quantity).toFixed(0)}
                </span>
                <button 
                  onClick={() => onRemoveItem(item.menuItemId)}
                  className="p-1 hover:bg-red-100 rounded text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Totals */}
      <div className="border-t pt-4 mt-auto">
        <div className="space-y-1 mb-4 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Tax (5%)</span>
            <span>₹{tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900 text-lg">
            <span>Total</span>
            <span>₹{total.toFixed(0)}</span>
          </div>
        </div>

        <button
          onClick={onSendOrder}
          disabled={isEmpty || !selectedTableNumber || isLoading}
          className={`w-full py-3.5 rounded-xl font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 ${
            isEmpty || !selectedTableNumber || isLoading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {isLoading ? 'Sending...' : `Send Order • ₹${total.toFixed(0)}`}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* DESKTOP VIEW (Sidebar) */}
      <div className="hidden md:flex flex-col bg-white rounded-xl shadow-md p-4 h-[calc(100vh-120px)] sticky top-24">
        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
          Table {selectedTableNumber ? selectedTableNumber : '-'}
        </h2>
        <CartContent />
      </div>

      {/* MOBILE VIEW (Popup / Modal) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div 
            className="w-full h-[85vh] bg-white rounded-t-2xl sm:rounded-2xl p-5 flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Header */}
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Current Order</h2>
                <p className="text-sm text-orange-600 font-medium">
                  {selectedTableNumber ? `Table ${selectedTableNumber}` : 'Select a table'}
                </p>
              </div>
              <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                <X size={24} className="text-gray-600" />
              </button>
            </div>

            {/* Content */}
            <CartContent />
          </div>
        </div>
      )}
    </>
  );
}