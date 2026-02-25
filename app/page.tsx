'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Shield, ChevronLeft, Loader2, Lock, ChefHat } from 'lucide-react';

const ADMIN = { name: 'Admin', role: 'admin', color: 'bg-gray-800 hover:bg-gray-900', iconColor: 'text-gray-300' };

// Color palettes for dynamically created users
const WAITER_COLORS = ['bg-orange-500 hover:bg-orange-600', 'bg-pink-500 hover:bg-pink-600', 'bg-yellow-500 hover:bg-yellow-600', 'bg-red-500 hover:bg-red-600'];
const CHEF_COLORS = ['bg-blue-500 hover:bg-blue-600', 'bg-cyan-500 hover:bg-cyan-600', 'bg-teal-500 hover:bg-teal-600', 'bg-indigo-500 hover:bg-indigo-600'];

export default function LoginPage() {
  const router = useRouter();
  
  const [waiters, setWaiters] = useState<any[]>([]);
  const [chefs, setChefs] = useState<any[]>([]);
  
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        setWaiters(data.waiters || []);
        setChefs(data.chefs || []);
      })
      .catch(err => console.error("Failed to load users"));
  }, []);

  const handleLogin = async () => {
    if (!selectedUser || !pin) return;
    setIsLoading(true); setError('');

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

  const handlePinClick = (num: number) => { if (pin.length < 4) setPin(prev => prev + num); };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* ADDED 'relative' to fix mobile absolute positioning, adjusted min-height for tablets */}
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden min-h-[600px] flex flex-col md:flex-row">
        
        {/* LEFT SIDE: User Selection */}
        <div className={`w-full md:w-3/5 p-6 sm:p-8 md:p-10 transition-all duration-300 overflow-y-auto max-h-[85vh] md:max-h-[800px] ${selectedUser ? 'hidden md:block opacity-30 pointer-events-none blur-[2px]' : 'block'}`}>
          <div className="mb-6 md:mb-8 text-center md:text-left">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 mb-2">POS Terminal</h1>
            <p className="text-sm sm:text-base text-slate-500">Select your profile to login</p>
          </div>

          <div className="space-y-8">
            
            {/* 👨‍🍳 KITCHEN STAFF SECTION */}
            {chefs.length > 0 && (
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center justify-center md:justify-start gap-2">
                  <ChefHat size={16} /> Kitchen Staff
                </h2>
                {/* Responsive Grid: 2 columns on mobile, 2 on tablet, 3 on large screens if needed */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {chefs.map((user, index) => {
                    const colorClass = CHEF_COLORS[index % CHEF_COLORS.length];
                    return (
                      <button key={user._id} onClick={() => { setSelectedUser({...user, color: colorClass}); setPin(''); setError(''); }} className={`${colorClass} text-white p-4 sm:p-6 rounded-2xl shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-200 flex flex-col items-center justify-center gap-2 sm:gap-3 group`}>
                        <div className="p-2 sm:p-3 rounded-full bg-white/20 text-white"><ChefHat className="w-6 h-6 sm:w-8 sm:h-8" /></div>
                        <span className="font-bold text-sm sm:text-lg">{user.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 💁‍♂️ WAITERS SECTION */}
            {waiters.length > 0 && (
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center justify-center md:justify-start gap-2">
                  <User size={16} /> Service Staff
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {waiters.map((user, index) => {
                    const colorClass = WAITER_COLORS[index % WAITER_COLORS.length];
                    return (
                      <button key={user._id} onClick={() => { setSelectedUser({...user, color: colorClass}); setPin(''); setError(''); }} className={`${colorClass} text-white p-4 sm:p-6 rounded-2xl shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-200 flex flex-col items-center justify-center gap-2 sm:gap-3 group`}>
                        <div className="p-2 sm:p-3 rounded-full bg-white/20 text-white"><User className="w-6 h-6 sm:w-8 sm:h-8" /></div>
                        <span className="font-bold text-sm sm:text-lg text-center leading-tight">{user.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 🛡️ MANAGERS SECTION (Super Admin Removed) */}
            <div className="pt-4 border-t">
              <h2 className="text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 text-center md:text-left">Management</h2>
              <div className="flex gap-4">
                <button onClick={() => { setSelectedUser(ADMIN); setPin(''); }} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 p-4 rounded-xl font-semibold flex items-center justify-center gap-3 border-2 border-slate-200 border-dashed transition-colors">
                    <Shield size={20} /> Login as Admin
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT SIDE: PIN Entry Pad */}
        <div className={`absolute inset-0 h-full bg-white z-20 md:static md:w-2/5 md:bg-slate-50 flex flex-col items-center justify-center p-6 sm:p-8 md:p-10 md:border-l border-slate-200 transition-transform duration-300 ${!selectedUser ? 'translate-x-full md:translate-x-0 md:opacity-50 md:pointer-events-none' : 'translate-x-0 opacity-100'}`}>
            {/* Back button for mobile */}
            {selectedUser && <button onClick={() => setSelectedUser(null)} className="absolute top-4 left-4 sm:top-6 sm:left-6 p-2 rounded-full bg-slate-100 hover:bg-slate-200 md:hidden"><ChevronLeft size={24} /></button>}

            {selectedUser ? (
              <div className="w-full max-w-xs mt-8 md:mt-0">
                <div className="text-center mb-6 sm:mb-8">
                  <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full mx-auto mb-3 sm:mb-4 flex items-center justify-center text-white shadow-lg ${selectedUser.color}`}>
                     {selectedUser.role === 'admin' ? <Shield className="w-8 h-8 sm:w-10 sm:h-10" /> : selectedUser.role === 'chef' ? <ChefHat className="w-8 h-8 sm:w-10 sm:h-10" /> : <User className="w-8 h-8 sm:w-10 sm:h-10" />}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Hello, {selectedUser.name}</h2>
                  <p className="text-xs sm:text-sm text-gray-500 uppercase tracking-widest mt-1 font-semibold">{selectedUser.role}</p>
                </div>

                <div className="flex justify-center gap-3 mb-6 sm:mb-8">
                  {[0, 1, 2, 3].map((i) => (<div key={i} className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full transition-all duration-200 ${pin.length > i ? 'bg-slate-800 scale-110' : 'bg-slate-200'}`} />))}
                </div>

                {error && <div className="mb-4 sm:mb-6 p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg text-center animate-shake">{error}</div>}

                <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    // Responsive button heights
                    <button key={num} onClick={() => handlePinClick(num)} className="h-14 sm:h-16 rounded-2xl bg-white shadow-sm border border-slate-200 text-xl sm:text-2xl font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all">{num}</button>
                  ))}
                  <button onClick={() => setPin('')} className="h-14 sm:h-16 rounded-2xl bg-slate-100 text-slate-500 text-sm sm:text-base font-medium hover:bg-slate-200">CLR</button>
                  <button onClick={() => handlePinClick(0)} className="h-14 sm:h-16 rounded-2xl bg-white shadow-sm border border-slate-200 text-xl sm:text-2xl font-semibold text-slate-700">0</button>
                  <button onClick={() => setPin(prev => prev.slice(0, -1))} className="h-14 sm:h-16 rounded-2xl bg-slate-100 text-slate-500 font-medium"><ChevronLeft size={24} className="mx-auto w-5 h-5 sm:w-6 sm:h-6" /></button>
                </div>

                <button onClick={handleLogin} disabled={isLoading || pin.length < 4} className="w-full py-3 sm:py-4 rounded-xl bg-slate-900 text-white font-bold text-base sm:text-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {isLoading ? <Loader2 className="animate-spin" /> : 'Login'}
                </button>
              </div>
            ) : (
              <div className="text-center text-slate-400 hidden md:block"><Lock size={48} className="mx-auto mb-4 opacity-20" /><p>Select a profile to begin</p></div>
            )}
        </div>
      </div>
    </div>
  );
}