'use client';

import React, { useState } from 'react';
import { Trash2, X, MessageSquarePlus, Flame, Sparkles } from 'lucide-react';

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

interface OrderSummaryProps {
  items: CartItem[];
  selectedTableNumber?: number;
  onRemoveItem: (menuItemId: string) => void;
  onUpdateNotes: (menuItemId: string, notes: string) => void;
  onSendOrder: () => Promise<void>;
  isLoading?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

const QUICK_NOTES = ['Less Spicy', 'Extra Spicy', 'Jain / No Onion', 'Crispy', 'Without Cheese', 'Extra Gravy'];

export function OrderSummary({
  items,
  selectedTableNumber,
  onRemoveItem,
  onUpdateNotes,
  onSendOrder,
  isLoading = false,
  isOpen = false,
  onClose,
}: OrderSummaryProps) {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [customNoteText, setCustomNoteText] = useState('');

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const tax = subtotal * 0.05;
  const serviceCharge = subtotal * 0.1;
  const total = subtotal + tax + serviceCharge;
  const isEmpty = items.length === 0;

  const handleApplyNote = (itemId: string, note: string) => {
    onUpdateNotes(itemId, note);
    setEditingNoteId(null);
    setCustomNoteText('');
  };

  // Reusable Content for both Desktop and Mobile
  const CartContent = () => (
    <div className="flex flex-col h-full">
      {/* Items List */}
      <div className="flex-1 overflow-y-auto space-y-3 min-h-0 pr-1">
        {isEmpty ? (
          <div className="text-center text-gray-400 py-10">Cart is empty. Tap menu items to add.</div>
        ) : (
          items.map((item) => (
            <div key={item.menuItemId} className="bg-gray-50 border border-gray-200/80 p-3 rounded-xl space-y-2">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1">
                  <p className="font-bold text-sm text-gray-900 leading-tight">{item.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {item.quantity} × Rs. {item.price.toFixed(0)}
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="font-black text-sm text-gray-900">
                    Rs. {(item.price * item.quantity).toFixed(0)}
                  </span>
                  <button
                    onClick={() => onRemoveItem(item.menuItemId)}
                    className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
                    title="Remove item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Cooking Instruction Display */}
              {item.notes ? (
                <div className="flex items-center justify-between bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-lg">
                  <span className="text-xs font-bold text-amber-800 flex items-center gap-1">
                    <Flame size={13} className="text-amber-600" /> {item.notes}
                  </span>
                  <button
                    onClick={() => {
                      setEditingNoteId(item.menuItemId);
                      setCustomNoteText(item.notes || '');
                    }}
                    className="text-[11px] font-semibold text-amber-700 hover:underline"
                  >
                    Edit
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEditingNoteId(item.menuItemId);
                    setCustomNoteText('');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-orange-600 transition"
                >
                  <MessageSquarePlus size={13} /> Add kitchen note (e.g. less spicy)
                </button>
              )}

              {/* Note Selector Modal / Input */}
              {editingNoteId === item.menuItemId && (
                <div className="pt-2 border-t border-gray-200 space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {QUICK_NOTES.map((qn) => (
                      <button
                        key={qn}
                        type="button"
                        onClick={() => handleApplyNote(item.menuItemId, qn)}
                        className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-orange-50 hover:border-orange-300 transition"
                      >
                        {qn}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Custom instructions for chef..."
                      value={customNoteText}
                      onChange={(e) => setCustomNoteText(e.target.value)}
                      className="flex-1 px-2.5 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:border-orange-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyNote(item.menuItemId, customNoteText)}
                      className="px-2.5 py-1 bg-orange-600 text-white rounded-md text-xs font-bold hover:bg-orange-700"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingNoteId(null)}
                      className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer Totals */}
      <div className="border-t pt-4 mt-auto">
        <div className="space-y-1 mb-4 text-sm">
          <div className="flex justify-between text-gray-500 text-xs">
            <span>Subtotal</span>
            <span>Rs. {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-500 text-xs">
            <span>Tax (5%)</span>
            <span>Rs. {tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-500 text-xs">
            <span>Service (10%)</span>
            <span>Rs. {serviceCharge.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-black text-gray-900 text-lg pt-1 border-t">
            <span>Total</span>
            <span>Rs. {total.toFixed(0)}</span>
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
          {isLoading ? 'Sending to Kitchen...' : `Send to Kitchen • Rs. ${total.toFixed(0)}`}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* DESKTOP VIEW (Sidebar) */}
      <div className="hidden md:flex flex-col bg-white rounded-2xl shadow-md p-4 h-[calc(100vh-120px)] sticky top-24 border border-gray-100">
        <h2 className="text-xl font-black text-gray-800 mb-4 border-b pb-2 flex items-center justify-between">
          <span>Table {selectedTableNumber ? selectedTableNumber : '-'}</span>
          <span className="text-xs font-semibold text-orange-600 uppercase">Live Cart</span>
        </h2>
        <CartContent />
      </div>

      {/* MOBILE VIEW (Popup / Modal) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div
            className="w-full h-[88vh] bg-white rounded-t-3xl sm:rounded-3xl p-5 flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Header */}
            <div className="flex justify-between items-center mb-3 border-b pb-3">
              <div>
                <h2 className="text-xl font-black text-gray-900">Current Order</h2>
                <p className="text-xs text-orange-600 font-bold uppercase">
                  {selectedTableNumber ? `Table ${selectedTableNumber}` : 'Select a table'}
                </p>
              </div>
              <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                <X size={20} className="text-gray-600" />
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