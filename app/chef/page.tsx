'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  Flame,
  AlertTriangle,
  Volume2,
  VolumeX,
  LogOut,
  RefreshCw,
  Sparkles,
  Utensils,
  User,
  Coffee,
} from 'lucide-react';

interface OrderItem {
  menuItemId?: string;
  itemName: string;
  price: number;
  quantity: number;
  notes?: string;
}

interface KitchenOrder {
  _id: string;
  orderId: string;
  tableNumber: number;
  waiterName: string;
  customerName?: string;
  items: OrderItem[];
  status: 'pending' | 'preparing' | 'served' | 'paid' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export default function ChefKitchenPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'preparing' | 'served' | 'all'>('active');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [chefName, setChefName] = useState('Chef');
  const [currentTime, setCurrentTime] = useState(new Date());

  const prevOrderCountRef = useRef<number>(0);

  // Sound chime creator using Web Audio API (works offline without external mp3)
  const playChime = () => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  };

  // Live clock
  useEffect(() => {
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Check auth session
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.name) setChefName(data.name);
          if (data.role !== 'chef' && data.role !== 'admin' && data.role !== 'superadmin') {
            router.push('/');
          }
        }
      } catch (err) {
        console.error('Auth check error', err);
      }
    };
    checkAuth();
  }, [router]);

  // Fetch kitchen orders
  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data?.orders) {
        const kitchenOrders: KitchenOrder[] = data.orders.filter(
          (o: any) => o.status !== 'paid' && o.status !== 'cancelled'
        );

        // Check if new pending orders arrived
        const pendingCount = kitchenOrders.filter((o) => o.status === 'pending').length;
        if (pendingCount > prevOrderCountRef.current && prevOrderCountRef.current !== 0) {
          playChime();
        }
        prevOrderCountRef.current = pendingCount;

        setOrders(kitchenOrders);
      }
    } catch (err) {
      console.error('Failed to fetch kitchen orders', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // Poll orders every 4 seconds
    const interval = setInterval(fetchOrders, 4000);
    return () => clearInterval(interval);
  }, [soundEnabled]);

  // Update order status
  const updateStatus = async (orderId: string, newStatus: 'preparing' | 'served') => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchOrders();
      }
    } catch (err) {
      console.error('Status update failed', err);
    }
  };

  // Logout
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  // Format elapsed time (e.g., 4m ago)
  const getElapsedMinutes = (dateStr: string) => {
    const created = new Date(dateStr).getTime();
    const now = currentTime.getTime();
    const diffMins = Math.floor((now - created) / 60000);
    return diffMins;
  };

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    if (filter === 'active') return o.status === 'pending' || o.status === 'preparing';
    if (filter === 'preparing') return o.status === 'preparing';
    if (filter === 'served') return o.status === 'served';
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-amber-500 selection:text-black">
      {/* Top Kitchen Bar */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-4 sm:px-8 py-4 sticky top-0 z-40 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        {/* Left: Brand & Live Clock */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/10">
            <ChefHat size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                KITCHEN DISPLAY SYSTEM (KDS)
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                LIVE
              </span>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5 font-medium">
              <span>Chef: <strong className="text-slate-200">{chefName}</strong></span>
              <span>•</span>
              <span className="text-amber-400 font-mono text-sm font-bold">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Filter Controls */}
        <div className="flex items-center bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${
              filter === 'active'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame size={16} /> Active KOTs ({orders.filter((o) => o.status === 'pending' || o.status === 'preparing').length})
          </button>
          <button
            onClick={() => setFilter('preparing')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${
              filter === 'preparing'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Cooking ({orders.filter((o) => o.status === 'preparing').length})
          </button>
          <button
            onClick={() => setFilter('served')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${
              filter === 'served'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Ready ({orders.filter((o) => o.status === 'served').length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              filter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All
          </button>
        </div>

        {/* Right: Controls & Logout */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border transition ${
              soundEnabled
                ? 'bg-slate-800 text-amber-400 border-slate-700'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
            title={soundEnabled ? 'Chime sound enabled on new order' : 'Sound muted'}
          >
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>

          <button
            onClick={fetchOrders}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Refresh orders"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={handleLogout}
            className="px-4 py-2.5 rounded-xl bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-800/40 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition"
          >
            <LogOut size={16} /> Exit
          </button>
        </div>
      </header>

      {/* Orders Grid */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        {loading && orders.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center text-slate-500 gap-3">
            <RefreshCw className="animate-spin text-amber-500" size={36} />
            <p className="text-lg font-semibold">Connecting to kitchen order stream...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center text-center p-8 bg-slate-900/40 border border-slate-800/80 rounded-3xl max-w-xl mx-auto mt-12">
            <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 mb-4">
              <Utensils size={36} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">No Active Orders in Kitchen</h2>
            <p className="text-slate-400 text-sm">
              All dishes have been prepared and served. New incoming orders from waiters will appear here automatically with sound.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
            {filteredOrders.map((order) => {
              const elapsedMins = getElapsedMinutes(order.createdAt);
              const isUrgent = elapsedMins >= 15;
              const isCooking = order.status === 'preparing';
              const isReady = order.status === 'served';

              return (
                <div
                  key={order._id || order.orderId}
                  className={`rounded-3xl border-2 transition-all shadow-xl overflow-hidden flex flex-col bg-slate-900 ${
                    isReady
                      ? 'border-emerald-500/50 bg-slate-900/90'
                      : isCooking
                      ? 'border-blue-500/60 shadow-blue-500/10'
                      : isUrgent
                      ? 'border-red-500 shadow-red-500/20 animate-pulse'
                      : 'border-amber-500/60 shadow-amber-500/10'
                  }`}
                >
                  {/* Card Header: Table Number (BIG FONT) */}
                  <div
                    className={`p-5 flex items-center justify-between border-b ${
                      isReady
                        ? 'bg-emerald-950/80 border-emerald-800/60 text-emerald-300'
                        : isCooking
                        ? 'bg-blue-950/80 border-blue-800/60 text-blue-300'
                        : isUrgent
                        ? 'bg-red-950/90 border-red-800/80 text-red-200'
                        : 'bg-amber-950/80 border-amber-800/60 text-amber-300'
                    }`}
                  >
                    <div>
                      {/* 🔥 HUGE TABLE NUMBER */}
                      <div className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-2">
                        TABLE {String(order.tableNumber).padStart(2, '0')}
                      </div>
                      <div className="text-xs font-semibold mt-1 flex items-center gap-2 opacity-90">
                        <User size={13} /> {order.waiterName || 'Waiter'}
                        <span>•</span>
                        <span>#{order.orderId?.slice(-4) || '0000'}</span>
                      </div>
                    </div>

                    {/* Elapsed Time Badge */}
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider ${
                          isUrgent
                            ? 'bg-red-600 text-white shadow-lg shadow-red-600/40'
                            : 'bg-slate-950/80 text-slate-200 border border-slate-700'
                        }`}
                      >
                        <Clock size={14} /> {elapsedMins}m ago
                      </span>
                      <div className="text-[11px] font-bold uppercase tracking-wider mt-1 text-right">
                        {order.status}
                      </div>
                    </div>
                  </div>

                  {/* Card Body: Item List (BIG BOLD FONTS & QUANTITY) */}
                  <div className="p-5 space-y-4 flex-1 divide-y divide-slate-800/80">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className={`${idx > 0 ? 'pt-3.5' : ''} flex items-center justify-between gap-4`}>
                        <div className="flex-1">
                          {/* 🍽️ BIG ITEM NAME */}
                          <h3 className="text-xl sm:text-2xl font-black text-white leading-snug tracking-wide">
                            {item.itemName}
                          </h3>
                          
                          {/* 🔥 HUGE HIGH-CONTRAST COOKING INSTRUCTION BADGE FOR CHEF */}
                          {item.notes && (
                            <div className="mt-2 py-1.5 px-3 rounded-xl bg-amber-400 text-slate-950 font-black text-sm uppercase tracking-wide border-2 border-amber-300 shadow-md flex items-center gap-2">
                              <Flame size={18} className="fill-slate-950 text-slate-950 shrink-0" />
                              <span>INSTRUCTION: {item.notes}</span>
                            </div>
                          )}
                        </div>

                        {/* 🔢 HUGE QUANTITY BADGE */}
                        <div className="shrink-0">
                          <span className="inline-flex items-center justify-center min-w-[54px] px-3.5 py-2 rounded-2xl bg-amber-500 text-slate-950 text-2xl sm:text-3xl font-black shadow-lg shadow-amber-500/20 tracking-tight">
                            x{item.quantity}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Card Footer: Action Status Buttons */}
                  <div className="p-4 bg-slate-950/80 border-t border-slate-800">
                    {order.status === 'pending' ? (
                      <button
                        onClick={() => updateStatus(order.orderId, 'preparing')}
                        className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-base sm:text-lg uppercase tracking-wider shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition active:scale-98"
                      >
                        <Flame size={22} /> Start Cooking
                      </button>
                    ) : order.status === 'preparing' ? (
                      <button
                        onClick={() => updateStatus(order.orderId, 'served')}
                        className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-base sm:text-lg uppercase tracking-wider shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition active:scale-98"
                      >
                        <CheckCircle2 size={22} /> Mark Ready / Done
                      </button>
                    ) : (
                      <div className="text-center py-2.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                        ✓ Dish Ready & Served to Table
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
