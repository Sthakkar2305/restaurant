'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Shield, ChevronLeft, Loader2, Lock, Crown } from 'lucide-react';

const WAITERS = [
  { name: 'Waiter 1', role: 'waiter', color: 'bg-orange-500 hover:bg-orange-600', iconColor: 'text-orange-100' },
  { name: 'Waiter 2', role: 'waiter', color: 'bg-blue-500 hover:bg-blue-600', iconColor: 'text-blue-100' },
  { name: 'Waiter 3', role: 'waiter', color: 'bg-green-500 hover:bg-green-600', iconColor: 'text-green-100' },
  { name: 'Waiter 4', role: 'waiter', color: 'bg-purple-500 hover:bg-purple-600', iconColor: 'text-purple-100' },
];

const ADMIN = { name: 'Admin', role: 'admin', color: 'bg-gray-800 hover:bg-gray-900', iconColor: 'text-gray-300' };
const SUPER_ADMIN = { name: 'Super Admin', role: 'superadmin', color: 'bg-red-900 hover:bg-black', iconColor: 'text-red-200' };

export default function LoginPage() {
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden min-h-[600px] flex">
        
        {/* User Selection */}
        <div className={`w-full md:w-3/5 p-8 md:p-12 transition-all duration-300 ${selectedUser ? 'hidden md:block opacity-50 pointer-events-none blur-[2px]' : 'block'}`}>
          <div className="mb-10 text-center md:text-left">
            <h1 className="text-3xl font-extrabold text-slate-800 mb-2">POS Terminal</h1>
            <p className="text-slate-500">Select your profile to login</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            {WAITERS.map((user) => (
              <button key={user.name} onClick={() => { setSelectedUser(user); setPin(''); setError(''); }} className={`${user.color} text-white p-6 rounded-2xl shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-200 flex flex-col items-center justify-center gap-3 group`}>
                <div className={`p-3 rounded-full bg-white/20 ${user.iconColor}`}><User size={32} /></div>
                <span className="font-bold text-lg">{user.name}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-4">
             <button onClick={() => { setSelectedUser(ADMIN); setPin(''); }} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 p-4 rounded-xl font-semibold flex items-center justify-center gap-3 border-2 border-slate-200 border-dashed">
                <Shield size={20} /> Manager
             </button>
             <button onClick={() => { setSelectedUser(SUPER_ADMIN); setPin(''); }} className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 p-4 rounded-xl font-semibold flex items-center justify-center gap-3 border-2 border-red-100 border-dashed">
                <Crown size={20} /> Super Admin
             </button>
          </div>
        </div>

        {/* PIN Entry */}
        <div className={`absolute inset-0 bg-white z-20 md:static md:w-2/5 md:bg-slate-50 flex flex-col items-center justify-center p-6 md:p-10 md:border-l border-slate-200 transition-transform duration-300 ${!selectedUser ? 'translate-x-full md:translate-x-0 md:opacity-50 md:pointer-events-none' : 'translate-x-0 opacity-100'}`}>
            {selectedUser && <button onClick={() => setSelectedUser(null)} className="absolute top-6 left-6 p-2 rounded-full bg-slate-100 md:hidden"><ChevronLeft size={24} /></button>}

            {selectedUser ? (
              <div className="w-full max-w-xs">
                <div className="text-center mb-8">
                  <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-white shadow-lg ${selectedUser.color}`}>
                     {selectedUser.role === 'admin' ? <Shield size={40} /> : selectedUser.role === 'superadmin' ? <Crown size={40} /> : <User size={40} />}
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800">Hello, {selectedUser.name}</h2>
                </div>

                <div className="flex justify-center gap-3 mb-8">
                  {[0, 1, 2, 3].map((i) => (<div key={i} className={`w-4 h-4 rounded-full transition-all duration-200 ${pin.length > i ? 'bg-slate-800 scale-110' : 'bg-slate-200'}`} />))}
                </div>

                {error && <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg text-center animate-shake">{error}</div>}

                <div className="grid grid-cols-3 gap-4 mb-8">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button key={num} onClick={() => handlePinClick(num)} className="h-16 rounded-2xl bg-white shadow-sm border border-slate-200 text-2xl font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all">{num}</button>
                  ))}
                  <button onClick={() => setPin('')} className="h-16 rounded-2xl bg-slate-100 text-slate-500 font-medium hover:bg-slate-200">CLR</button>
                  <button onClick={() => handlePinClick(0)} className="h-16 rounded-2xl bg-white shadow-sm border border-slate-200 text-2xl font-semibold text-slate-700">0</button>
                  <button onClick={() => setPin(prev => prev.slice(0, -1))} className="h-16 rounded-2xl bg-slate-100 text-slate-500 font-medium"><ChevronLeft size={24} /></button>
                </div>

                <button onClick={handleLogin} disabled={isLoading || pin.length < 4} className="w-full py-4 rounded-xl bg-slate-900 text-white font-bold text-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {isLoading ? <Loader2 className="animate-spin" /> : 'Login'}
                </button>
              </div>
            ) : (
              <div className="text-center text-slate-400 hidden md:block"><Lock size={48} className="mx-auto mb-4 opacity-20" /><p>Select a profile</p></div>
            )}
        </div>
      </div>
    </div>
  );
}