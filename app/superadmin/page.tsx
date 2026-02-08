'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, TrendingUp, Users, Calendar } from 'lucide-react';

export default function SuperAdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      // 1. Check Auth (Simple role check)
      const authRes = await fetch('/api/auth/me');
      if (authRes.ok) {
          const user = await authRes.json();
          if (user.role !== 'superadmin') {
              alert('Access Denied');
              router.push('/');
              return;
          }
      } else {
          router.push('/');
          return;
      }

      // 2. Fetch All Orders
      const res = await fetch('/api/orders');
      const data = await res.json();
      const orders = data.orders || [];

      // 3. Calculate Stats
      const paidOrders = orders.filter((o: any) => o.status === 'paid');

      // Metric 1: Waiter Sales
      const waiterSales: Record<string, number> = {};
      paidOrders.forEach((o: any) => {
          waiterSales[o.waiterName] = (waiterSales[o.waiterName] || 0) + o.total;
      });

      // Metric 2: Table Sales
      const tableSales: Record<string, number> = {};
      paidOrders.forEach((o: any) => {
          const tName = `Table ${o.tableNumber}`;
          tableSales[tName] = (tableSales[tName] || 0) + o.total;
      });

      // Metric 3: Monthly Income
      const currentMonth = new Date().getMonth();
      const monthlyIncome = paidOrders.reduce((sum: number, o: any) => {
          const orderDate = new Date(o.createdAt);
          if (orderDate.getMonth() === currentMonth) {
              return sum + o.total;
          }
          return sum;
      }, 0);

      setStats({ waiterSales, tableSales, monthlyIncome });
      setIsLoading(false);
    };

    init();
  }, []);

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-10">
            <h1 className="text-3xl font-bold text-orange-500">Super Admin Dashboard</h1>
            <button onClick={() => router.push('/')} className="bg-gray-800 px-4 py-2 rounded hover:bg-gray-700">Logout</button>
        </header>

        {/* Monthly Income Card */}
        <div className="bg-gray-800 rounded-2xl p-6 mb-8 border border-gray-700 flex items-center gap-6">
            <div className="p-4 bg-green-500/20 rounded-full text-green-400">
                <TrendingUp size={40} />
            </div>
            <div>
                <p className="text-gray-400 text-sm uppercase font-bold tracking-wider">Total Monthly Income</p>
                <p className="text-5xl font-black text-white mt-2">₹{stats.monthlyIncome.toFixed(2)}</p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Waiter Sales */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center gap-3 mb-6">
                    <Users className="text-blue-400" />
                    <h2 className="text-xl font-bold">Sales by Waiter</h2>
                </div>
                <div className="space-y-4">
                    {Object.entries(stats.waiterSales).map(([name, total]: any) => (
                        <div key={name} className="flex items-center justify-between">
                            <span className="font-medium">{name}</span>
                            <span className="font-mono text-blue-300">₹{total.toFixed(0)}</span>
                        </div>
                    ))}
                    {Object.keys(stats.waiterSales).length === 0 && <p className="text-gray-500">No sales yet</p>}
                </div>
            </div>

            {/* Table Sales */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center gap-3 mb-6">
                    <Calendar className="text-purple-400" />
                    <h2 className="text-xl font-bold">Sales by Table</h2>
                </div>
                <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                    {Object.entries(stats.tableSales).map(([name, total]: any) => (
                        <div key={name} className="flex items-center justify-between">
                            <span className="font-medium">{name}</span>
                            <span className="font-mono text-purple-300">₹{total.toFixed(0)}</span>
                        </div>
                    ))}
                    {Object.keys(stats.tableSales).length === 0 && <p className="text-gray-500">No sales yet</p>}
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}