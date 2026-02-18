'use client';

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
  quantity: number; // 🔥 controlled from parent
  onIncrease: (item: MenuItem) => void;
  onDecrease: (item: MenuItem) => void;
}

export function MenuCard({
  item,
  quantity,
  onIncrease,
  onDecrease,
}: MenuCardProps) {

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden border hover:border-orange-400 transition">

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
              onClick={() => onDecrease(item)}
              disabled={quantity === 0}
              className="p-1 disabled:opacity-40"
            >
              <Minus size={16} />
            </button>

            <span className="min-w-[20px] text-center font-bold text-sm">
              {quantity}
            </span>

            <button
              onClick={() => onIncrease(item)}
              className="p-1 active:scale-90 transition"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
