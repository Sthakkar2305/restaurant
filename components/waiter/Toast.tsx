'use client';

import { useEffect } from 'react';

interface Props {
  message: string;
  onClose: () => void;
}

export function Toast({ message, onClose }: Props) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded-full shadow-lg z-50 text-sm">
      {message}
    </div>
  );
}
