'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Plus, Minus } from 'lucide-react';

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
}

export function MenuCard({ item, onAddToCart }: MenuCardProps) {
  const [quantity, setQuantity] = useState(0);

  const handleIncrease = () => {
    const newQty = quantity + 1;
    setQuantity(newQty);
    onAddToCart(item, newQty);
  };

  const handleDecrease = () => {
    if (quantity > 0) {
      const newQty = quantity - 1;
      setQuantity(newQty);
      onAddToCart(item, newQty);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border-2 border-transparent hover:border-orange-500 transition-all">
      {/* Image */}
      <div className="relative w-full h-32 bg-gray-100">
        {item.image_url ? (
          <Image
            src={item.image_url || "/placeholder.svg"}
            alt={item.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <span className="text-sm">No Image</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="font-semibold text-sm text-gray-900 truncate">
          {item.name}
        </h3>
        <p className="text-xs text-gray-600 line-clamp-2 mt-1">
          {item.description}
        </p>

        {/* Price & Quantity Controls */}
        <div className="flex items-center justify-between mt-3">
          <span className="text-lg font-bold text-orange-600">
            ₹{item.price.toFixed(2)}
          </span>

          {/* Quantity Buttons */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-full px-2 py-1">
            <button
              onClick={handleDecrease}
              disabled={quantity === 0}
              className="p-1 hover:bg-gray-200 rounded-full disabled:opacity-50 transition-colors"
              aria-label="Decrease quantity"
            >
              <Minus size={16} />
            </button>
            <span className="min-w-[20px] text-center font-semibold text-sm">
              {quantity}
            </span>
            <button
              onClick={handleIncrease}
              className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              aria-label="Increase quantity"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
