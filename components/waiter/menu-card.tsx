'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Plus, Minus, Check } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  description?: string;
}

interface MenuCardProps {
  item: MenuItem;
  onAddToCart: (item: MenuItem, quantity: number) => void;
  showToast: (message: string) => void;
}

export function MenuCard({ item, onAddToCart, showToast }: MenuCardProps) {
  const [quantity, setQuantity] = useState(0);
  const [flash, setFlash] = useState(false);

  const handleIncrease = () => {
    const newQty = quantity + 1;
    setQuantity(newQty);
    onAddToCart(item, newQty);
    showToast(`${item.name} added`);
    setFlash(true);
  };

  const handleDecrease = () => {
    if (quantity > 0) {
      const newQty = quantity - 1;
      setQuantity(newQty);
      onAddToCart(item, newQty);
    }
  };

  useEffect(() => {
    if (flash) {
      const timer = setTimeout(() => setFlash(false), 400);
      return () => clearTimeout(timer);
    }
  }, [flash]);

  return (
    <div
      className={`bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 border-2 ${
        flash ? 'border-green-500 scale-[1.02]' : 'border-transparent hover:border-orange-400'
      }`}
    >
      <div className="relative w-full h-32 bg-gray-100">
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            No Image
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="font-semibold text-sm text-gray-900 truncate">
          {item.name}
        </h3>

        <div className="flex items-center justify-between mt-3">
          <span className="text-lg font-bold text-orange-600">
            ₹{item.price.toFixed(2)}
          </span>

          <div className="flex items-center gap-2 bg-gray-100 rounded-full px-2 py-1">
            <button
              onClick={handleDecrease}
              disabled={quantity === 0}
              className="p-1 rounded-full disabled:opacity-40"
            >
              <Minus size={16} />
            </button>

            <span className="min-w-[20px] text-center font-semibold text-sm">
              {quantity}
            </span>

            <button
              onClick={handleIncrease}
              className="p-1 hover:bg-green-100 rounded-full transition"
            >
              {flash ? <Check size={16} className="text-green-600" /> : <Plus size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
