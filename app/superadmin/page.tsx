'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, TrendingUp, Users, Calendar, LogOut } from 'lucide-react';

interface StatsType {
  waiterSales: Record<string, number>;
  tableSales: Record<string, number>;
  monthlyIncome: number;
}

export default function SuperAdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<StatsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        // Auth check
        const authRes = await fetch('/api/auth/me');
        if (!authRes.ok) {
          router.push('/');
          return;
        }

        const user = await authRes.json();
        if (user.role !== 'superadmin') {
          router.push('/');
          return;
        }

        // Fetch orders
        const res = await fetch('/api/orders');
        if (!res.ok) throw new Error('Failed to fetch orders');

        const data = await res.json();
        const orders = data.orders || [];

        const paidOrders = orders.filter((o: any) => o.status === 'paid');

        // Waiter Sales
        const waiterSales: Record<string, number> = {};
        paidOrders.forEach((o: any) => {
          const name = o.waiterName || 'Unknown';
          waiterSales[name] = (waiterSales[name] || 0) + o.total;
        });

        // Table Sales
        const tableSales: Record<string, number> = {};
        paidOrders.forEach((o: any) => {
          const tName = `Table ${o.tableNumber || '-'}`;
          tableSales[tName] = (tableSales[tName] || 0) + o.total;
        });

        // Monthly Income
        const currentMonth = new Date().getMonth();
        const monthlyIncome = paidOrders.reduce(
          (sum: number, o: any) => {
            const orderDate = new Date(o.createdAt);
            if (orderDate.getMonth() === currentMonth) {
              return sum + o.total;
            }
            return sum;
          },
          0
        );

        setStats({ waiterSales, tableSales, monthlyIncome });
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950">
        <Loader2 className="animate-spin text-orange-500" size={50} />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950 text-gray-400">
        Failed to load dashboard
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 sm:px-6 lg:px-10 py-6">
      
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-orange-500">
            Super Admin Dashboard
          </h1>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 transition px-4 py-2 rounded-lg text-sm"
          >
            <LogOut size={18} />
            Logout
          </button>
        </header>

        {/* Monthly Income Card */}
        <div className="bg-gray-900 rounded-2xl p-5 sm:p-8 border border-gray-800 mb-10 flex flex-col sm:flex-row items-start sm:items-center gap-6 shadow-lg">
          <div className="p-4 bg-green-500/20 rounded-full text-green-400">
            <TrendingUp size={40} />
          </div>
          <div>
            <p className="text-gray-400 text-xs sm:text-sm uppercase tracking-wider font-semibold">
              Total Monthly Income
            </p>
            <p className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mt-3">
              ₹{stats.monthlyIncome.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Waiter Sales */}
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 shadow-md">
            <div className="flex items-center gap-3 mb-6">
              <Users className="text-blue-400" />
              <h2 className="text-lg sm:text-xl font-semibold">
                Sales by Waiter
              </h2>
            </div>

            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
              {Object.entries(stats.waiterSales).length > 0 ? (
                Object.entries(stats.waiterSales)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, total]) => (
                    <div
                      key={name}
                      className="flex justify-between items-center bg-gray-800/60 px-4 py-3 rounded-lg"
                    >
                      <span className="text-sm sm:text-base">
                        {name}
                      </span>
                      <span className="font-mono text-blue-300 text-sm sm:text-base">
                        ₹{total.toFixed(0)}
                      </span>
                    </div>
                  ))
              ) : (
                <p className="text-gray-500">No sales yet</p>
              )}
            </div>
          </div>

          {/* Table Sales */}
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 shadow-md">
            <div className="flex items-center gap-3 mb-6">
              <Calendar className="text-purple-400" />
              <h2 className="text-lg sm:text-xl font-semibold">
                Sales by Table
              </h2>
            </div>

            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
              {Object.entries(stats.tableSales).length > 0 ? (
                Object.entries(stats.tableSales)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, total]) => (
                    <div
                      key={name}
                      className="flex justify-between items-center bg-gray-800/60 px-4 py-3 rounded-lg"
                    >
                      <span className="text-sm sm:text-base">
                        {name}
                      </span>
                      <span className="font-mono text-purple-300 text-sm sm:text-base">
                        ₹{total.toFixed(0)}
                      </span>
                    </div>
                  ))
              ) : (
                <p className="text-gray-500">No sales yet</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
