'use client';

import { Trash2, Send, X } from 'lucide-react';

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
  isOpen?: boolean;
  onClose?: () => void;
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

  return (
    <>
      {/* Desktop Version */}
      <div className="hidden md:block bg-white rounded-lg shadow-md p-4 md:sticky md:top-4">
        <SummaryContent
          items={items}
          subtotal={subtotal}
          tax={tax}
          serviceCharge={serviceCharge}
          total={total}
          selectedTableNumber={selectedTableNumber}
          isEmpty={isEmpty}
          onRemoveItem={onRemoveItem}
          onSendOrder={onSendOrder}
          isLoading={isLoading}
        />
      </div>

      {/* Mobile Bottom Sheet */}
      <div
        className={`fixed inset-0 bg-black/40 z-50 transition-opacity ${
          isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        } md:hidden`}
        onClick={onClose}
      />

      <div
        className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl p-4 z-50 transform transition-transform duration-300 md:hidden ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Order Summary</h2>
          <button onClick={onClose}>
            <X />
          </button>
        </div>

        <SummaryContent
          items={items}
          subtotal={subtotal}
          tax={tax}
          serviceCharge={serviceCharge}
          total={total}
          selectedTableNumber={selectedTableNumber}
          isEmpty={isEmpty}
          onRemoveItem={onRemoveItem}
          onSendOrder={onSendOrder}
          isLoading={isLoading}
        />
      </div>
    </>
  );
}

function SummaryContent({
  items,
  subtotal,
  tax,
  serviceCharge,
  total,
  selectedTableNumber,
  isEmpty,
  onRemoveItem,
  onSendOrder,
  isLoading,
}: any) {
  return (
    <>
      {selectedTableNumber ? (
        <div className="bg-orange-50 p-2 mb-3 rounded text-sm font-semibold text-orange-900">
          Table {selectedTableNumber}
        </div>
      ) : (
        <div className="bg-yellow-50 p-2 mb-3 rounded text-xs text-yellow-900">
          Select table first
        </div>
      )}

      <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
        {items.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-3">
            No items selected
          </p>
        ) : (
          items.map((item: any) => (
            <div key={item.menuItemId} className="flex justify-between bg-gray-50 p-2 rounded">
              <div>
                <p className="text-sm font-semibold">{item.name}</p>
                <p className="text-xs text-gray-600">
                  {item.quantity} × ₹{item.price.toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-orange-600">
                  ₹{(item.price * item.quantity).toFixed(2)}
                </span>
                <button onClick={() => onRemoveItem(item.menuItemId)}>
                  <Trash2 size={16} className="text-red-600" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t pt-2 text-sm space-y-1 mb-3">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>₹{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Tax</span>
          <span>₹{tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-lg">
          <span>Total</span>
          <span className="text-orange-600">₹{total.toFixed(2)}</span>
        </div>
      </div>

      <button
        onClick={onSendOrder}
        disabled={isEmpty || !selectedTableNumber || isLoading}
        className={`w-full py-3 rounded-lg font-bold text-white ${
          isEmpty || !selectedTableNumber || isLoading
            ? 'bg-gray-300'
            : 'bg-green-600 active:scale-95'
        }`}
      >
        {isLoading ? 'Sending...' : 'Send Order'}
      </button>
    </>
  );
}
