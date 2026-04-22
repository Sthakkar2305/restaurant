'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, TrendingUp, Users, Calendar, LogOut, Plus, Trash2, Download, Table as TableIcon, ChefHat, BookOpen, Image as ImageIcon, Edit2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface StatsType {
  waiterSales: Record<string, number>;
  tableSales: Record<string, number>;
  monthlyIncome: number;
  allOrders: any[];
}

export default function SuperAdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'staff' | 'tables' | 'menu'>('dashboard');
  const [stats, setStats] = useState<StatsType | null>(null);
  
  // Combined Waiters and Chefs into one Staff array
  const [staff, setStaff] = useState<any[]>([]); 
  const [tables, setTables] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form States
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPin, setNewStaffPin] = useState('');
  const [roleSelection, setRoleSelection] = useState('waiter'); // NEW: Waiter or Chef
  
  const [newTableName, setNewTableName] = useState('');
  const [newTableNumber, setNewTableNumber] = useState('');

  // Menu Form States
  const [menuForm, setMenuForm] = useState({ _id: '', name: '', category: 'main_course', price: '', description: '', image: '', available: true });
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('url');

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
      
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // Debug array for Monthly Income
      const monthlyIncomeLogs: any[] = [];

      paidOrders.forEach((o: any) => {
          const orderTotal = parseFloat((o.total || 0).toFixed(2));
          waiterSales[o.waiterName] = (waiterSales[o.waiterName] || 0) + orderTotal;
          tableSales[`Table ${o.tableNumber}`] = (tableSales[`Table ${o.tableNumber}`] || 0) + orderTotal;
          
          const orderDate = new Date(o.createdAt);
          if (orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear) {
              monthlyIncome += orderTotal;
              monthlyIncomeLogs.push({ orderId: o.orderId, date: orderDate.toISOString(), total: orderTotal });
          }
      });
      
      monthlyIncome = parseFloat(monthlyIncome.toFixed(2));
      console.log('--- MONTHLY INCOME AUDIT LOG ---');
      console.log(monthlyIncomeLogs);
      console.log('Total Monthly Income:', monthlyIncome);
      console.log('---------------------------------');

      setStats({ waiterSales, tableSales, monthlyIncome, allOrders: paidOrders });

      // 2. Fetch Users (Waiters & Chefs)
      const uRes = await fetch('/api/users');
      const uData = await uRes.json();
      setStaff([...(uData.waiters || []), ...(uData.chefs || [])]);

      // 3. Fetch Tables
      const tRes = await fetch('/api/tables');
      const tData = await tRes.json();
      setTables(tData.tables || []);

      // 4. Fetch Menu Items
      const mRes = await fetch('/api/menu/manage');
      const mData = await mRes.json();
      setMenuItems(mData.items || []);
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
      
      const avgOrderValue = stats.allOrders.length > 0 ? (stats.monthlyIncome / stats.allOrders.length).toFixed(2) : '0.00';
      const monthName = new Date().toLocaleString('default', { month: 'long' });
      const year = new Date().getFullYear();

      const summaryData = [
          ['Restaurant Financial Report', ''],
          ['Month/Year', `${monthName} ${year}`],
          [],
          ['Metric', 'Value'],
          ['Total Revenue', `₹${stats.monthlyIncome}`],
          ['Total Orders', stats.allOrders.length],
          ['Average Order Value', `₹${avgOrderValue}`],
          [],
          ['Waiter Name', 'Total Sales'],
          ...Object.entries(stats.waiterSales).map(([k, v]) => [k, `₹${v.toFixed(2)}`]),
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
      ws1['!cols'] = [{ wch: 25 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, ws1, "Summary");

      const orderData = stats.allOrders.map((o: any) => ({
          'Order ID': o.orderId,
          'Date': new Date(o.createdAt).toLocaleString(),
          'Items': o.items ? o.items.map((i: any) => `${i.quantity}x ${i.itemName || i.name}`).join(', ') : '',
          'Total Amount': `₹${parseFloat(o.total || 0).toFixed(2)}`,
          'Payment Method': o.paymentMethod || 'Cash/Card'
      }));
      const ws2 = XLSX.utils.json_to_sheet(orderData);
      ws2['!cols'] = [{ wch: 20 }, { wch: 25 }, { wch: 50 }, { wch: 15 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, ws2, "Orders");

      XLSX.writeFile(wb, `Restaurant_Report_${monthName}_${year}.xlsx`);
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

  const handleImageUpload = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setMenuForm({ ...menuForm, image: reader.result as string });
          };
          reader.readAsDataURL(file);
      }
  };

  const saveMenuItem = async () => {
      if(!menuForm.name || !menuForm.price || !menuForm.category) return alert("Name, Price, and Category are required");
      
      const method = menuForm._id ? 'PUT' : 'POST';
      const body = JSON.stringify(menuForm);
      
      await fetch('/api/menu/manage', { method, body, headers: { 'Content-Type': 'application/json' } });
      
      setMenuForm({ _id: '', name: '', category: 'main_course', price: '', description: '', image: '', available: true });
      refreshData();
  };

  const deleteMenuItem = async (id: string) => {
      if(confirm('Delete this menu item?')) {
          await fetch(`/api/menu/manage?id=${id}`, { method: 'DELETE' });
          refreshData();
      }
  };

  const deleteAllMenuItems = async () => {
      if(confirm('WARNING: Are you sure you want to delete ALL menu items? This cannot be undone.')) {
          if(confirm('FINAL CONFIRMATION: Delete EVERYTHING?')) {
              await fetch('/api/menu/manage?action=deleteAll', { method: 'DELETE' });
              refreshData();
          }
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
            <TabButton active={activeTab === 'menu'} onClick={() => setActiveTab('menu')} icon={<BookOpen size={18} />} label="Manage Menu" />
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

        {activeTab === 'menu' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in">
                {/* Add/Edit Form */}
                <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 h-fit">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        {menuForm._id ? <Edit2 size={18} /> : <Plus size={18} />} 
                        {menuForm._id ? 'Edit Menu Item' : 'Add Menu Item'}
                    </h3>
                    <div className="space-y-4">
                        <input placeholder="Item Name (e.g. Burger)" className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white" value={menuForm.name} onChange={e => setMenuForm({...menuForm, name: e.target.value})} />
                        
                        <div className="flex gap-2">
                            <select className="w-1/2 bg-gray-800 border border-gray-700 rounded p-2 text-white outline-none" value={menuForm.category} onChange={e => setMenuForm({...menuForm, category: e.target.value})}>
                                <option value="starters">Starters</option>
                                <option value="main_course">Main Course</option>
                                <option value="desserts">Desserts</option>
                                <option value="drinks">Drinks</option>
                            </select>
                            <input placeholder="Price (₹)" type="number" className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white" value={menuForm.price} onChange={e => setMenuForm({...menuForm, price: e.target.value})} />
                        </div>

                        <textarea placeholder="Description (Optional)" className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white resize-none" rows={2} value={menuForm.description} onChange={e => setMenuForm({...menuForm, description: e.target.value})} />

                        {/* Image Input Options */}
                        <div className="p-3 border border-gray-700 rounded bg-gray-800/50">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-bold text-gray-300">Image</span>
                                <div className="flex gap-2">
                                    <button onClick={() => setImageInputMode('url')} className={`text-xs px-2 py-1 rounded ${imageInputMode === 'url' ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-400'}`}>URL Link</button>
                                    <button onClick={() => setImageInputMode('upload')} className={`text-xs px-2 py-1 rounded ${imageInputMode === 'upload' ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-400'}`}>Upload</button>
                                </div>
                            </div>
                            {imageInputMode === 'url' ? (
                                <input placeholder="https://...image.jpg" className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white text-sm" value={menuForm.image} onChange={e => setMenuForm({...menuForm, image: e.target.value})} />
                            ) : (
                                <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-gray-700 file:text-white hover:file:bg-gray-600" />
                            )}
                            {menuForm.image && imageInputMode === 'upload' && <div className="mt-2 text-xs text-green-400 flex items-center gap-1"><ImageIcon size={12}/> Image uploaded (Base64)</div>}
                        </div>

                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="available" checked={menuForm.available} onChange={e => setMenuForm({...menuForm, available: e.target.checked})} className="w-4 h-4 accent-orange-500" />
                            <label htmlFor="available" className="text-sm cursor-pointer text-gray-300">Available to Order</label>
                        </div>

                        <div className="flex gap-2 pt-2">
                            {menuForm._id && (
                                <button onClick={() => setMenuForm({ _id: '', name: '', category: 'main_course', price: '', description: '', image: '', available: true })} className="w-1/3 bg-gray-700 hover:bg-gray-600 py-2 rounded font-bold">Cancel</button>
                            )}
                            <button onClick={saveMenuItem} className={`flex-1 ${menuForm._id ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'} py-2 rounded font-bold`}>
                                {menuForm._id ? 'Update Item' : 'Add Item'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* List */}
                <div className="lg:col-span-2">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg text-gray-300">Current Menu Items</h3>
                        {menuItems.length > 0 && (
                            <button onClick={deleteAllMenuItems} className="flex items-center gap-1 bg-red-900/50 hover:bg-red-600 text-red-500 hover:text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-colors">
                                <Trash2 size={16} /> Delete All Menu
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {menuItems.map(item => (
                        <div key={item._id} className={`bg-gray-900 p-4 rounded-xl border flex gap-4 ${item.available ? 'border-gray-800' : 'border-red-900/50 opacity-75'}`}>
                            {item.image ? (
                                <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded-lg bg-gray-800" />
                            ) : (
                                <div className="w-20 h-20 bg-gray-800 rounded-lg flex items-center justify-center text-gray-600"><ImageIcon size={24} /></div>
                            )}
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-lg leading-tight">{item.name}</h4>
                                    <span className="font-bold text-orange-400">₹{item.price}</span>
                                </div>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 uppercase tracking-wider mt-1 inline-block">
                                    {item.category.replace('_', ' ')}
                                </span>
                                <div className="flex justify-end gap-2 mt-3">
                                    <button onClick={() => {
                                        setMenuForm({
                                            _id: item._id, name: item.name, price: item.price.toString(), 
                                            category: item.category, description: item.description || '', 
                                            image: item.image || '', available: item.available
                                        });
                                        setImageInputMode(item.image?.startsWith('data:image') ? 'upload' : 'url');
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }} className="text-blue-400 hover:bg-blue-400/10 p-2 rounded"><Edit2 size={16} /></button>
                                    <button onClick={() => deleteMenuItem(item._id)} className="text-red-500 hover:bg-red-500/10 p-2 rounded"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
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