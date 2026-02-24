'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, TrendingUp, Users, Calendar, LogOut, Plus, Trash2, Download, Table as TableIcon, ChefHat } from 'lucide-react';
import * as XLSX from 'xlsx';

interface StatsType {
  waiterSales: Record<string, number>;
  tableSales: Record<string, number>;
  monthlyIncome: number;
  allOrders: any[];
}

export default function SuperAdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'staff' | 'tables'>('dashboard');
  const [stats, setStats] = useState<StatsType | null>(null);
  
  // Combined Waiters and Chefs into one Staff array
  const [staff, setStaff] = useState<any[]>([]); 
  const [tables, setTables] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form States
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPin, setNewStaffPin] = useState('');
  const [roleSelection, setRoleSelection] = useState('waiter'); // NEW: Waiter or Chef
  
  const [newTableName, setNewTableName] = useState('');
  const [newTableNumber, setNewTableNumber] = useState('');

  const refreshData = async () => {
      // 1. Fetch Stats
      const res = await fetch('/api/orders');
      const data = await res.json();
      const orders = data.orders || [];
      const paidOrders = orders.filter((o: any) => o.status === 'paid');

      // Calc Logic
      const waiterSales: Record<string, number> = {};
      const tableSales: Record<string, number> = {};
      let monthlyIncome = 0;
      const currentMonth = new Date().getMonth();

      paidOrders.forEach((o: any) => {
          waiterSales[o.waiterName] = (waiterSales[o.waiterName] || 0) + o.total;
          tableSales[`Table ${o.tableNumber}`] = (tableSales[`Table ${o.tableNumber}`] || 0) + o.total;
          
          if (new Date(o.createdAt).getMonth() === currentMonth) {
              monthlyIncome += o.total;
          }
      });

      setStats({ waiterSales, tableSales, monthlyIncome, allOrders: paidOrders });

      // 2. Fetch Users (Waiters & Chefs)
      const uRes = await fetch('/api/users');
      const uData = await uRes.json();
      setStaff([...(uData.waiters || []), ...(uData.chefs || [])]);

      // 3. Fetch Tables
      const tRes = await fetch('/api/tables');
      const tData = await tRes.json();
      setTables(tData.tables || []);
  };

  useEffect(() => {
    const init = async () => {
        const authRes = await fetch('/api/auth/me');
        if (authRes.ok) {
            const user = await authRes.json();
            if (user.role !== 'superadmin') router.push('/');
            else {
                await refreshData();
                setIsLoading(false);
            }
        } else {
            router.push('/');
        }
    };
    init();
  }, []);

  // EXCEL EXPORT
  const exportToExcel = () => {
      if (!stats) return;
      const wb = XLSX.utils.book_new();
      
      const summaryData = [
          ['Metric', 'Value'],
          ['Total Monthly Income', stats.monthlyIncome],
          ['Total Orders', stats.allOrders.length],
          [],
          ['Waiter Name', 'Total Sales'],
          ...Object.entries(stats.waiterSales),
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, ws1, "Summary");

      const orderData = stats.allOrders.map(o => ({
          ID: o.orderId,
          Date: new Date(o.createdAt).toLocaleDateString(),
          Table: o.tableNumber,
          Waiter: o.waiterName,
          Total: o.total
      }));
      const ws2 = XLSX.utils.json_to_sheet(orderData);
      XLSX.utils.book_append_sheet(wb, ws2, "Order Details");

      XLSX.writeFile(wb, "Monthly_Report.xlsx");
  };

  // HANDLERS
  const addUser = async () => {
      if(!newStaffName || !newStaffPin) return alert("Enter Name and PIN");
      await fetch('/api/users', { 
          method: 'POST', 
          body: JSON.stringify({ name: newStaffName, pin: newStaffPin, role: roleSelection }) 
      });
      setNewStaffName(''); setNewStaffPin(''); setRoleSelection('waiter');
      refreshData();
  };

  const deleteUser = async (id: string) => {
      if(confirm('Delete this staff member?')) {
          await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
          refreshData();
      }
  };

  const addTable = async () => {
      if(!newTableName || !newTableNumber) return alert("Enter Name and Number");
      await fetch('/api/tables/manage', { method: 'POST', body: JSON.stringify({ name: newTableName, number: newTableNumber }) });
      setNewTableName(''); setNewTableNumber('');
      refreshData();
  };

  const deleteTable = async (id: string) => {
      if(confirm('Delete Table?')) {
          await fetch(`/api/tables/manage?id=${id}`, { method: 'DELETE' });
          refreshData();
      }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-gray-950"><Loader2 className="animate-spin text-orange-500" /></div>;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <h1 className="text-3xl font-bold text-orange-500">Super Admin</h1>
            <div className="flex gap-2">
                <button onClick={exportToExcel} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-bold">
                    <Download size={16} /> Export Excel
                </button>
                <button onClick={() => { fetch('/api/auth/logout', {method:'POST'}); router.push('/'); }} className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm">
                    <LogOut size={16} /> Logout
                </button>
            </div>
        </header>

        {/* Navigation Tabs */}
        <div className="flex gap-4 border-b border-gray-800 mb-8 overflow-x-auto">
            <TabButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<TrendingUp size={18} />} label="Dashboard" />
            <TabButton active={activeTab === 'staff'} onClick={() => setActiveTab('staff')} icon={<Users size={18} />} label="Manage Staff" />
            <TabButton active={activeTab === 'tables'} onClick={() => setActiveTab('tables')} icon={<TableIcon size={18} />} label="Manage Tables" />
        </div>

        {/* CONTENT AREA */}
        {activeTab === 'dashboard' && stats && (
            <div className="space-y-8 animate-in fade-in">
                {/* Income Card */}
                <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 flex items-center gap-6">
                    <div className="p-4 bg-green-500/20 rounded-full text-green-400"><TrendingUp size={40} /></div>
                    <div>
                        <p className="text-gray-400 text-sm font-bold uppercase">Monthly Income</p>
                        <p className="text-5xl font-black mt-2">₹{stats.monthlyIncome.toFixed(0)}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card title="Waiter Performance" icon={<Users className="text-blue-400" />}>
                        {Object.entries(stats.waiterSales).map(([name, val]) => (
                            <Row key={name} label={name} value={`₹${val}`} />
                        ))}
                    </Card>
                    <Card title="Table Performance" icon={<Calendar className="text-purple-400" />}>
                        {Object.entries(stats.tableSales).map(([name, val]) => (
                            <Row key={name} label={name} value={`₹${val}`} />
                        ))}
                    </Card>
                </div>
            </div>
        )}

        {activeTab === 'staff' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in">
                {/* Add Form */}
                <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 h-fit">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Plus size={18} /> Add New Staff</h3>
                    <div className="space-y-3">
                        <select className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white outline-none" value={roleSelection} onChange={e => setRoleSelection(e.target.value)}>
                            <option value="waiter">Waiter</option>
                            <option value="chef">Chef (Kitchen)</option>
                        </select>
                        <input placeholder="Name (e.g. John)" className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white" value={newStaffName} onChange={e => setNewStaffName(e.target.value)} />
                        <input placeholder="PIN (4 digits)" className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white" value={newStaffPin} onChange={e => setNewStaffPin(e.target.value)} />
                        <button onClick={addUser} className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded font-bold">Create Staff</button>
                    </div>
                </div>

                {/* List */}
                <div className="md:col-span-2 space-y-3">
                    {staff.map(user => (
                        <div key={user._id} className="bg-gray-900 p-4 rounded-lg flex justify-between items-center border border-gray-800">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${user.role === 'chef' ? 'bg-blue-600' : 'bg-orange-500'}`}>
                                    {user.role === 'chef' ? <ChefHat size={20} /> : <Users size={20} />}
                                </div>
                                <div>
                                    <p className="font-bold flex items-center gap-2">
                                        {user.name} 
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase ${user.role === 'chef' ? 'bg-blue-900 text-blue-300' : 'bg-orange-900 text-orange-300'}`}>
                                            {user.role}
                                        </span>
                                    </p>
                                    <p className="text-xs text-gray-500">ID: {user._id}</p>
                                </div>
                            </div>
                            <button onClick={() => deleteUser(user._id)} className="text-red-500 hover:bg-red-500/10 p-2 rounded"><Trash2 size={18} /></button>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'tables' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in">
                {/* Add Form */}
                <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 h-fit">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Plus size={18} /> Add New Table</h3>
                    <div className="space-y-3">
                        <input placeholder="Table Name (e.g. Garden-5)" className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white" value={newTableName} onChange={e => setNewTableName(e.target.value)} />
                        <input placeholder="Table Number (Unique ID)" type="number" className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white" value={newTableNumber} onChange={e => setNewTableNumber(e.target.value)} />
                        <button onClick={addTable} className="w-full bg-green-600 hover:bg-green-700 py-2 rounded font-bold">Create Table</button>
                    </div>
                </div>

                {/* List */}
                <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {tables.map(t => (
                        <div key={t._id} className="bg-gray-900 p-4 rounded-lg border border-gray-800 flex flex-col justify-between h-24">
                            <div className="flex justify-between items-start">
                                <span className="font-bold text-lg">{t.name}</span>
                                <button onClick={() => deleteTable(t._id)} className="text-red-500 hover:text-red-400"><Trash2 size={16} /></button>
                            </div>
                            <p className="text-xs text-gray-500">No: {t.table_number}</p>
                        </div>
                    ))}
                </div>
            </div>
        )}

      </div>
    </div>
  );
}

// Sub-components for cleaner code
function TabButton({ active, onClick, icon, label }: any) {
    return (
        <button 
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${active ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-400 hover:text-white'}`}
        >
            {icon} {label}
        </button>
    )
}

function Card({ title, icon, children }: any) {
    return (
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center gap-3 mb-6">
                {icon}
                <h2 className="text-xl font-bold">{title}</h2>
            </div>
            <div className="space-y-3">{children}</div>
        </div>
    )
}

function Row({ label, value }: any) {
    return (
        <div className="flex justify-between items-center bg-gray-800/50 px-4 py-3 rounded-lg">
            <span>{label}</span>
            <span className="font-mono text-blue-300">{value}</span>
        </div>
    )
}