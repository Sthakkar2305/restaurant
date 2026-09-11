'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Shield, ChevronLeft, Loader2, Lock, ChefHat, Crown } from 'lucide-react';

const DEFAULT_WAITERS = [
  { name: 'Waiter 1', role: 'waiter', color: 'bg-orange-500 hover:bg-orange-600', iconColor: 'text-orange-100' },
  { name: 'Waiter 2', role: 'waiter', color: 'bg-blue-500 hover:bg-blue-600', iconColor: 'text-blue-100' },
  { name: 'Waiter 3', role: 'waiter', color: 'bg-green-500 hover:bg-green-600', iconColor: 'text-green-100' },
  { name: 'Waiter 4', role: 'waiter', color: 'bg-purple-500 hover:bg-purple-600', iconColor: 'text-purple-100' },
];

const DEFAULT_CHEFS = [
  { name: 'Head Chef', role: 'chef', color: 'bg-amber-600 hover:bg-amber-700', iconColor: 'text-amber-100' },
];

const ADMIN = { name: 'Admin', role: 'admin', color: 'bg-gray-800 hover:bg-gray-900', iconColor: 'text-gray-300' };
// Super Admin is hidden from regular view, accessible via 5 rapid clicks on "POS Terminal"
const SUPER_ADMIN = { name: 'Super Admin', role: 'superadmin', color: 'bg-red-900 hover:bg-black', iconColor: 'text-red-200' };

const WAITER_COLORS = [
  'bg-orange-500 hover:bg-orange-600',
  'bg-blue-500 hover:bg-blue-600',
  'bg-green-500 hover:bg-green-600',
  'bg-purple-500 hover:bg-purple-600',
  'bg-rose-500 hover:bg-rose-600',
  'bg-teal-500 hover:bg-teal-600',
];

const CHEF_COLORS = [
  'bg-amber-600 hover:bg-amber-700',
  'bg-red-600 hover:bg-red-700',
  'bg-orange-600 hover:bg-orange-700',
];

export default function LoginPage() {
  const router = useRouter();
  const [waiters, setWaiters] = useState<any[]>(DEFAULT_WAITERS);
  const [chefs, setChefs] = useState<any[]>(DEFAULT_CHEFS);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 🚀 Secret fast-tap trigger state for Super Admin
  const [secretClicks, setSecretClicks] = useState(0);

  // Load dynamically from MongoDB users
  useEffect(() => {
    fetch('/api/users')
      .then((res) => res.json())
      .then((data) => {
        if (data?.waiters && data.waiters.length > 0) {
          setWaiters(
            data.waiters.map((w: any, idx: number) => ({
              ...w,
              color: WAITER_COLORS[idx % WAITER_COLORS.length],
            }))
          );
        }
        if (data?.chefs && data.chefs.length > 0) {
          setChefs(
            data.chefs.map((c: any, idx: number) => ({
              ...c,
              color: CHEF_COLORS[idx % CHEF_COLORS.length],
            }))
          );
        }
      })
      .catch((err) => console.warn('Using default staff profiles', err));
  }, []);

  const handleLogin = async () => {
    if (!selectedUser || !pin) return;
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: selectedUser.name, pin }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      if (data.user.role === 'superadmin') router.push('/superadmin');
      else if (data.user.role === 'admin') router.push('/admin');
      else if (data.user.role === 'chef') router.push('/chef');
      else router.push('/waiter');
    } catch (err: any) {
      setError(err.message);
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinClick = (num: number) => {
    if (pin.length < 4) setPin((prev) => prev + num);
  };

  // 🚀 Fast-tap trigger handler (5 rapid clicks opens Super Admin PIN pad)
  const handleSecretTap = () => {
    const newCount = secretClicks + 1;
    setSecretClicks(newCount);

    if (newCount >= 5) {
      setSelectedUser(SUPER_ADMIN);
      setPin('');
      setError('');
      setSecretClicks(0);
    }

    // Reset if user stops clicking after 2 seconds
    setTimeout(() => {
      setSecretClicks(0);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 selection:bg-orange-500 selection:text-white">
      <div className="w-full max-w-5xl bg-slate-950/90 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden min-h-[620px] flex flex-col md:flex-row backdrop-blur-xl">
        {/* Left Side: Staff Profile Selection */}
        <div
          className={`w-full md:w-3/5 p-6 sm:p-10 transition-all duration-300 overflow-y-auto max-h-[85vh] md:max-h-[850px] ${
            selectedUser ? 'hidden md:block opacity-40 pointer-events-none blur-[2px]' : 'block'
          }`}
        >
          <div className="mb-8 text-center md:text-left">
            {/* 🚀 Secret tap trigger on POS Terminal title */}
            <h1
              onClick={handleSecretTap}
              className="text-3xl sm:text-4xl font-black text-white mb-2 select-none cursor-pointer active:scale-98 transition-transform tracking-tight"
              title="POS Terminal"
            >
              POS Terminal
            </h1>
            <p className="text-slate-400 text-sm">Select your staff profile to enter your PIN</p>
          </div>

          <div className="space-y-6">
            {/* 👨‍🍳 KITCHEN STAFF (CHEF) SECTION */}
            {chefs.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <ChefHat size={16} /> Kitchen Staff (Chef)
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {chefs.map((user) => (
                    <button
                      key={user.name}
                      onClick={() => {
                        setSelectedUser(user);
                        setPin('');
                        setError('');
                      }}
                      className={`${user.color || 'bg-amber-600'} text-white p-5 rounded-2xl shadow-md hover:shadow-xl hover:scale-[1.02] transition-all duration-200 flex flex-col items-center justify-center gap-2.5 group active:scale-95`}
                    >
                      <div className="p-3 rounded-full bg-white/20 text-white">
                        <ChefHat size={30} />
                      </div>
                      <span className="font-bold text-base sm:text-lg">{user.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 💁‍♂️ SERVICE STAFF (WAITERS) SECTION */}
            {waiters.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <User size={16} /> Service Staff (Waiters)
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {waiters.map((user) => (
                    <button
                      key={user.name}
                      onClick={() => {
                        setSelectedUser(user);
                        setPin('');
                        setError('');
                      }}
                      className={`${user.color || 'bg-orange-500'} text-white p-5 rounded-2xl shadow-md hover:shadow-xl hover:scale-[1.02] transition-all duration-200 flex flex-col items-center justify-center gap-2.5 group active:scale-95`}
                    >
                      <div className="p-3 rounded-full bg-white/20 text-white">
                        <User size={30} />
                      </div>
                      <span className="font-bold text-base sm:text-lg">{user.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 🛡️ MANAGEMENT (ADMIN) SECTION */}
            <div className="pt-3 border-t border-slate-800">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Management</h2>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setSelectedUser(ADMIN);
                    setPin('');
                    setError('');
                  }}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-slate-200 p-4 rounded-2xl font-bold flex items-center justify-center gap-3 border border-slate-700 transition"
                >
                  <Shield size={20} className="text-indigo-400" /> Manager (Admin)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: PIN Entry Keypad */}
        <div
          className={`absolute inset-0 bg-slate-950 z-20 md:static md:w-2/5 md:bg-slate-900/60 flex flex-col items-center justify-center p-6 sm:p-8 md:border-l border-slate-800 transition-transform duration-300 ${
            !selectedUser ? 'translate-x-full md:translate-x-0 md:opacity-40 md:pointer-events-none' : 'translate-x-0 opacity-100'
          }`}
        >
          {selectedUser && (
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-6 left-6 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 md:hidden"
            >
              <ChevronLeft size={24} />
            </button>
          )}

          {selectedUser ? (
            <div className="w-full max-w-xs">
              <div className="text-center mb-6">
                <div
                  className={`w-20 h-20 rounded-3xl mx-auto mb-3 flex items-center justify-center text-white shadow-xl ${
                    selectedUser.color || 'bg-slate-800'
                  }`}
                >
                  {selectedUser.role === 'admin' ? (
                    <Shield size={38} />
                  ) : selectedUser.role === 'superadmin' ? (
                    <Crown size={38} />
                  ) : selectedUser.role === 'chef' ? (
                    <ChefHat size={38} />
                  ) : (
                    <User size={38} />
                  )}
                </div>
                <h2 className="text-2xl font-black text-white">{selectedUser.name}</h2>
                <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mt-0.5">
                  {selectedUser.role}
                </p>
              </div>

              {/* PIN Bubbles */}
              <div className="flex justify-center gap-3 mb-6">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full transition-all duration-200 ${
                      pin.length > i ? 'bg-orange-500 scale-125 shadow-md shadow-orange-500/50' : 'bg-slate-800'
                    }`}
                  />
                ))}
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-xl text-center">
                  {error}
                </div>
              )}

              {/* Keypad */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    onClick={() => handlePinClick(num)}
                    className="h-14 sm:h-16 rounded-2xl bg-slate-900 border border-slate-800 text-2xl font-bold text-white hover:bg-slate-800 active:scale-95 transition"
                  >
                    {num}
                  </button>
                ))}
                <button
                  onClick={() => setPin('')}
                  className="h-14 sm:h-16 rounded-2xl bg-slate-950 border border-slate-800 text-slate-400 text-sm font-bold hover:bg-slate-900 active:scale-95 transition"
                >
                  CLR
                </button>
                <button
                  onClick={() => handlePinClick(0)}
                  className="h-14 sm:h-16 rounded-2xl bg-slate-900 border border-slate-800 text-2xl font-bold text-white hover:bg-slate-800 active:scale-95 transition"
                >
                  0
                </button>
                <button
                  onClick={() => setPin((prev) => prev.slice(0, -1))}
                  className="h-14 sm:h-16 rounded-2xl bg-slate-950 border border-slate-800 text-slate-400 font-bold flex items-center justify-center hover:bg-slate-900 active:scale-95 transition"
                >
                  <ChevronLeft size={24} />
                </button>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleLogin}
                disabled={isLoading || pin.length < 4}
                className="w-full py-4 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-black text-base uppercase tracking-wider shadow-lg shadow-orange-600/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : 'Enter POS'}
              </button>
            </div>
          ) : (
            <div className="text-center text-slate-600 hidden md:block">
              <Lock size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-semibold">Select a staff member to log in</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}