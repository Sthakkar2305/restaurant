'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  UtensilsCrossed,
  Table as TableIcon,
  ShoppingBag,
  FileBarChart,
  Plus,
  Trash2,
  Edit2,
  Download,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  LogOut,
  RefreshCw,
  Sparkles,
  DollarSign,
  TrendingUp,
  Receipt,
  Calendar,
  Filter,
  Shield,
  ChefHat,
  User,
  Coffee,
  Check,
  X,
} from 'lucide-react';
import * as XLSX from 'xlsx';

type TabType = 'staff' | 'menu' | 'tables' | 'orders' | 'reports';

export default function SuperAdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('staff');
  const [isLoading, setIsLoading] = useState(true);
  const [adminName, setAdminName] = useState('Super Admin');

  // Staff State
  const [users, setUsers] = useState<any[]>([]);
  const [staffRoleFilter, setStaffRoleFilter] = useState<'all' | 'admin' | 'chef' | 'waiter'>('all');
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [staffForm, setStaffForm] = useState({ name: '', role: 'waiter', pin: '', email: '' });

  // Menu State
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [menuCategories, setMenuCategories] = useState<string[]>([]);
  const [selectedMenuCat, setSelectedMenuCat] = useState<string>('all');
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<any>(null);
  const [menuForm, setMenuForm] = useState({
    name: '',
    category: 'starters',
    price: '',
    description: '',
    foodType: 'veg',
    available: true,
  });

  // Tables State
  const [tables, setTables] = useState<any[]>([]);
  const [showTableModal, setShowTableModal] = useState(false);
  const [editingTable, setEditingTable] = useState<any>(null);
  const [tableForm, setTableForm] = useState({ name: '', number: '', capacity: '4', section: 'Main Hall' });

  // Orders State
  const [orders, setOrders] = useState<any[]>([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any>(null);

  // Reports State
  const [reportData, setReportData] = useState<any>(null);
  const [selectedReportId, setSelectedReportId] = useState('daily_z_report');
  const [reportRange, setReportRange] = useState('last7days');
  const [reportSearch, setReportSearch] = useState('');
  const [reportCategoryFilter, setReportCategoryFilter] = useState('All');
  const [reportsLoading, setReportsLoading] = useState(false);

  // General Toast/Alert Message
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showAlert = (type: 'success' | 'error', text: string) => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg(null), 4000);
  };

  // Auth & Initial load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authRes = await fetch('/api/auth/me');
        if (authRes.ok) {
          const user = await authRes.json();
          if (user.role !== 'superadmin') {
            if (user.role === 'admin') router.push('/admin');
            else if (user.role === 'chef') router.push('/chef');
            else router.push('/waiter');
            return;
          }
          if (user.name) setAdminName(user.name);
          await loadAllData();
        } else {
          router.push('/');
        }
      } catch (err) {
        console.error('Auth error', err);
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  const loadAllData = async () => {
    await Promise.all([fetchUsers(), fetchMenu(), fetchTables(), fetchOrders(), fetchReports()]);
  };

  // 1. Fetch Users
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data?.users) setUsers(data.users);
    } catch (e) {
      console.error(e);
    }
  };

  // 2. Fetch Menu
  const fetchMenu = async () => {
    try {
      const res = await fetch('/api/menu/manage');
      const data = await res.json();
      if (data?.items) {
        setMenuItems(data.items);
        setMenuCategories(data.categories || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 3. Fetch Tables
  const fetchTables = async () => {
    try {
      const res = await fetch('/api/tables');
      const data = await res.json();
      if (data?.tables) setTables(data.tables);
    } catch (e) {
      console.error(e);
    }
  };

  // 4. Fetch Orders
  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data?.orders) setOrders(data.orders);
    } catch (e) {
      console.error(e);
    }
  };

  // 5. Fetch Reports
  const fetchReports = async () => {
    setReportsLoading(true);
    try {
      const res = await fetch(`/api/reports?range=${reportRange}`);
      const data = await res.json();
      if (data?.success) setReportData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setReportsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReports();
    }
  }, [reportRange]);

  // Logout
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  // -------------------------------------------------------------
  // STAFF CRUD HANDLERS
  // -------------------------------------------------------------
  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.name || (!editingStaff && !staffForm.pin)) {
      return showAlert('error', 'Name and PIN are required');
    }

    try {
      if (editingStaff) {
        // Update
        const res = await fetch('/api/users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingStaff._id,
            name: staffForm.name,
            role: staffForm.role,
            pin: staffForm.pin || undefined,
            email: staffForm.email,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update user');
        showAlert('success', 'Staff member updated successfully');
      } else {
        // Create
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(staffForm),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to add user');
        showAlert('success', 'Staff member added successfully');
      }

      setShowStaffModal(false);
      setEditingStaff(null);
      setStaffForm({ name: '', role: 'waiter', pin: '', email: '' });
      fetchUsers();
    } catch (err: any) {
      showAlert('error', err.message);
    }
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete staff "${name}"?`)) return;
    try {
      const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showAlert('success', `Deleted user ${name}`);
        fetchUsers();
      } else {
        showAlert('error', 'Failed to delete user');
      }
    } catch (e: any) {
      showAlert('error', e.message);
    }
  };

  // -------------------------------------------------------------
  // MENU CRUD HANDLERS
  // -------------------------------------------------------------
  const handleSaveMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!menuForm.name || !menuForm.price) {
      return showAlert('error', 'Item name and price are required');
    }

    try {
      if (editingMenuItem) {
        const res = await fetch('/api/menu/manage', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingMenuItem._id, ...menuForm }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        showAlert('success', 'Dish updated successfully');
      } else {
        const res = await fetch('/api/menu/manage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(menuForm),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        showAlert('success', 'New dish added to menu');
      }

      setShowMenuModal(false);
      setEditingMenuItem(null);
      setMenuForm({ name: '', category: 'starters', price: '', description: '', foodType: 'veg', available: true });
      fetchMenu();
    } catch (err: any) {
      showAlert('error', err.message);
    }
  };

  const handleToggleMenuAvailability = async (item: any) => {
    try {
      const res = await fetch('/api/menu/manage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item._id, available: !item.available }),
      });
      if (res.ok) fetchMenu();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteMenuItem = async (id: string, name: string) => {
    if (!confirm(`Delete dish "${name}" from menu?`)) return;
    try {
      const res = await fetch(`/api/menu/manage?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showAlert('success', 'Item removed');
        fetchMenu();
      }
    } catch (e: any) {
      showAlert('error', e.message);
    }
  };

  // -------------------------------------------------------------
  // TABLES CRUD HANDLERS
  // -------------------------------------------------------------
  const handleSaveTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableForm.number) return showAlert('error', 'Table number is required');

    try {
      if (editingTable) {
        const res = await fetch('/api/tables/manage', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingTable._id, ...tableForm }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        showAlert('success', 'Table updated');
      } else {
        const res = await fetch('/api/tables/manage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tableForm),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        showAlert('success', 'New table added');
      }

      setShowTableModal(false);
      setEditingTable(null);
      setTableForm({ name: '', number: '', capacity: '4', section: 'Main Hall' });
      fetchTables();
    } catch (err: any) {
      showAlert('error', err.message);
    }
  };

  const handleDeleteTable = async (id: string, num: number) => {
    if (!confirm(`Delete Table ${num}?`)) return;
    try {
      const res = await fetch(`/api/tables/manage?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showAlert('success', 'Table removed');
        fetchTables();
      }
    } catch (e: any) {
      showAlert('error', e.message);
    }
  };

  // -------------------------------------------------------------
  // 80 REPORTS EXPORT (EXCEL / CSV)
  // -------------------------------------------------------------
  const exportReportToExcel = () => {
    if (!reportData) return;

    const wb = XLSX.utils.book_new();

    // Sheet 1: Executive KPI Summary
    const summaryRows = [
      ['80 REPORTS EXECUTIVE RESTAURANT REPORT'],
      ['Report Period', reportRange.toUpperCase()],
      ['Generated At', new Date().toLocaleString()],
      [],
      ['KPI Metric', 'Value (INR)'],
      ['Total Gross Revenue', `Rs. ${reportData.summary.totalGrossSales.toLocaleString()}`],
      ['Total Net Sales', `Rs. ${reportData.summary.totalNetSales.toLocaleString()}`],
      ['Total GST & Taxes (CGST + SGST)', `Rs. ${reportData.summary.totalTax.toLocaleString()}`],
      ['Total Service Charge', `Rs. ${reportData.summary.totalServiceCharge.toLocaleString()}`],
      ['Total Discounts Given', `Rs. ${reportData.summary.totalDiscounts.toLocaleString()}`],
      ['Total Orders Served', reportData.summary.paidOrdersCount],
      ['Average Order Value (AOV)', `Rs. ${reportData.summary.averageOrderValue.toLocaleString()}`],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive Summary');

    // Sheet 2: Day-wise Breakdown
    if (reportData.dayWiseSales?.length > 0) {
      const dayData = reportData.dayWiseSales.map((d: any) => ({
        Date: d.date,
        'Gross Sales (Rs)': d.gross,
        'Net Sales (Rs)': d.net,
        'Taxes (Rs)': d.tax,
        'Total Bills': d.orders,
        'Avg Bill (Rs)': d.orders > 0 ? Math.round(d.gross / d.orders) : 0,
      }));
      const wsDays = XLSX.utils.json_to_sheet(dayData);
      XLSX.utils.book_append_sheet(wb, wsDays, 'Day-wise Sales');
    }

    // Sheet 3: Top Selling Dishes
    if (reportData.topSellingItems?.length > 0) {
      const itemData = reportData.topSellingItems.map((i: any, idx: number) => ({
        Rank: idx + 1,
        'Dish Name': i.name,
        Category: i.category,
        'Quantity Sold': i.quantity,
        'Total Revenue (Rs)': i.revenue,
      }));
      const wsItems = XLSX.utils.json_to_sheet(itemData);
      XLSX.utils.book_append_sheet(wb, wsItems, 'Top 25 Selling Dishes');
    }

    // Sheet 4: Waiter Performance
    if (reportData.waiterSales?.length > 0) {
      const waiterData = reportData.waiterSales.map((w: any) => ({
        'Staff Name': w.name,
        'Total Sales (Rs)': w.revenue,
        'Orders Handled': w.orders,
        'AOV (Rs)': w.aov,
      }));
      const wsWaiters = XLSX.utils.json_to_sheet(waiterData);
      XLSX.utils.book_append_sheet(wb, wsWaiters, 'Staff Performance');
    }

    // Sheet 5: Category Share
    if (reportData.categoryBreakdown?.length > 0) {
      const catData = reportData.categoryBreakdown.map((c: any) => ({
        Category: c.category,
        'Total Revenue (Rs)': c.revenue,
        'Qty Sold': c.quantity,
        'Revenue Share %': `${c.sharePercentage}%`,
      }));
      const wsCats = XLSX.utils.json_to_sheet(catData);
      XLSX.utils.book_append_sheet(wb, wsCats, 'Category Contribution');
    }

    // Sheet 6: All Orders Ledger
    if (reportData.ordersList?.length > 0) {
      const ordersData = reportData.ordersList.map((o: any) => ({
        'Order ID': o.orderId,
        Date: new Date(o.createdAt).toLocaleDateString(),
        Time: new Date(o.createdAt).toLocaleTimeString(),
        Table: `Table ${o.tableNumber}`,
        Waiter: o.waiterName,
        'Items Count': o.items?.length || 0,
        'Subtotal (Rs)': o.subtotal,
        'Tax (Rs)': o.tax,
        'Total (Rs)': o.total,
        'Payment Mode': o.paymentMethod || 'Cash',
      }));
      const wsOrders = XLSX.utils.json_to_sheet(ordersData);
      XLSX.utils.book_append_sheet(wb, wsOrders, 'All Orders Ledger');
    }

    XLSX.writeFile(wb, `Restaurant_80_Reports_${reportRange}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showAlert('success', 'Excel Report downloaded successfully!');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="animate-spin text-orange-500 mb-3" size={38} />
        <p className="text-slate-400 font-semibold text-sm">Authenticating Super Admin...</p>
      </div>
    );
  }

  // Filter staff by role
  const filteredUsers = users.filter((u) => {
    if (staffRoleFilter === 'all') return true;
    return u.role === staffRoleFilter;
  });

  // Filter menu items by category
  const filteredMenuItems = menuItems.filter((i) => {
    if (selectedMenuCat === 'all') return true;
    return i.category === selectedMenuCat;
  });

  // Filter orders by status
  const filteredOrders = orders.filter((o) => {
    if (orderStatusFilter === 'all') return true;
    return o.status === orderStatusFilter;
  });

  // Filter 80 reports catalog
  const filteredReportCatalog = (reportData?.catalog || []).filter((r: any) => {
    const matchesCat = reportCategoryFilter === 'All' || r.category === reportCategoryFilter;
    const matchesSearch =
      r.name.toLowerCase().includes(reportSearch.toLowerCase()) ||
      r.category.toLowerCase().includes(reportSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-orange-500 selection:text-white">
      {/* Toast Alert */}
      {alertMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-bold border transition-all animate-in slide-in-from-bottom-5 ${
            alertMsg.type === 'success'
              ? 'bg-emerald-500 text-slate-950 border-emerald-400'
              : 'bg-red-500 text-white border-red-400'
          }`}
        >
          {alertMsg.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
          {alertMsg.text}
        </div>
      )}

      {/* Header */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-4 sm:px-8 py-4 sticky top-0 z-40 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-orange-600/20">
            <Shield size={24} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Super Admin Center <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">MASTER</span>
            </h1>
            <p className="text-xs text-slate-400">Manage Staff Roles, Menu, Tables, Orders & 80 Reports</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5"
          >
            Open POS
          </button>
          <button
            onClick={() => router.push('/chef')}
            className="px-3.5 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition flex items-center gap-1.5"
          >
            <ChefHat size={15} /> Kitchen View
          </button>
          <button
            onClick={loadAllData}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Refresh database"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={handleLogout}
            className="px-3.5 py-2 rounded-xl bg-red-950/50 hover:bg-red-900 text-red-300 border border-red-800/40 text-xs font-bold transition flex items-center gap-1.5"
          >
            <LogOut size={15} /> Logout
          </button>
        </div>
      </header>

      {/* Navigation Tabs Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 sm:px-8 py-2.5 flex overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('staff')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === 'staff'
              ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users size={16} /> Staff & Roles ({users.length})
        </button>

        <button
          onClick={() => setActiveTab('menu')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === 'menu'
              ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <UtensilsCrossed size={16} /> Menu Dishes ({menuItems.length})
        </button>

        <button
          onClick={() => setActiveTab('tables')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === 'tables'
              ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <TableIcon size={16} /> Tables & Seating ({tables.length})
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === 'orders'
              ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ShoppingBag size={16} /> Orders & History ({orders.length})
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition ${
            activeTab === 'reports'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-indigo-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <FileBarChart size={16} /> 80 Reports
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
        {/* ========================================================================= */}
        {/* TAB 1: STAFF & ROLES MANAGEMENT */}
        {/* ========================================================================= */}
        {activeTab === 'staff' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white">Staff & Roles Management</h2>
                <p className="text-xs text-slate-400">Add, edit, or remove Admins, Chefs, and Waiters with PIN access</p>
              </div>

              <div className="flex items-center gap-3">
                {/* Role filter */}
                <select
                  value={staffRoleFilter}
                  onChange={(e: any) => setStaffRoleFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-bold py-2.5 px-3 rounded-xl focus:outline-none"
                >
                  <option value="all">All Roles ({users.length})</option>
                  <option value="admin">Admins ({users.filter((u) => u.role === 'admin' || u.role === 'superadmin').length})</option>
                  <option value="chef">Chefs ({users.filter((u) => u.role === 'chef').length})</option>
                  <option value="waiter">Waiters ({users.filter((u) => u.role === 'waiter').length})</option>
                </select>

                <button
                  onClick={() => {
                    setEditingStaff(null);
                    setStaffForm({ name: '', role: 'waiter', pin: '', email: '' });
                    setShowStaffModal(true);
                  }}
                  className="py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-orange-600/30 transition"
                >
                  <Plus size={16} /> Add New Staff
                </button>
              </div>
            </div>

            {/* Staff Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map((user) => (
                <div
                  key={user._id}
                  className="bg-slate-900 border border-slate-800 p-5 rounded-3xl hover:border-slate-700 transition flex items-center justify-between shadow-md"
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md ${
                        user.role === 'superadmin' || user.role === 'admin'
                          ? 'bg-slate-800 text-indigo-400'
                          : user.role === 'chef'
                          ? 'bg-amber-600 text-white'
                          : 'bg-orange-600 text-white'
                      }`}
                    >
                      {user.role === 'chef' ? (
                        <ChefHat size={24} />
                      ) : user.role === 'admin' || user.role === 'superadmin' ? (
                        <Shield size={24} />
                      ) : (
                        <User size={24} />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-white">{user.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                            user.role === 'chef'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : user.role === 'admin' || user.role === 'superadmin'
                              ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                              : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                          }`}
                        >
                          {user.role}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">PIN: ••••</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setEditingStaff(user);
                        setStaffForm({ name: user.name, role: user.role, pin: '', email: user.email || '' });
                        setShowStaffModal(true);
                      }}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                      title="Edit Staff"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteStaff(user._id, user.name)}
                      className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900 text-red-300 border border-red-800/30 transition"
                      title="Delete Staff"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MENU DISHES MANAGEMENT */}
        {/* ========================================================================= */}
        {activeTab === 'menu' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white">Menu & Dish Management</h2>
                <p className="text-xs text-slate-400">Add, edit pricing, food type, and toggle in-stock availability</p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={selectedMenuCat}
                  onChange={(e) => setSelectedMenuCat(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-bold py-2.5 px-3 rounded-xl focus:outline-none"
                >
                  <option value="all">All Categories ({menuItems.length})</option>
                  {menuCategories.map((c) => (
                    <option key={c} value={c}>
                      {c.toUpperCase().replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => {
                    setEditingMenuItem(null);
                    setMenuForm({ name: '', category: 'starters', price: '', description: '', foodType: 'veg', available: true });
                    setShowMenuModal(true);
                  }}
                  className="py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-orange-600/30 transition"
                >
                  <Plus size={16} /> Add New Dish
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredMenuItems.map((item) => (
                <div
                  key={item._id}
                  className={`bg-slate-900 border rounded-3xl p-5 flex flex-col justify-between transition shadow-md ${
                    item.available ? 'border-slate-800' : 'border-red-900/40 opacity-70 bg-slate-950'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          item.foodType === 'non-veg'
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}
                      >
                        {item.foodType || 'Veg'}
                      </span>
                      <button
                        onClick={() => handleToggleMenuAvailability(item)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition ${
                          item.available
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-red-500/10 text-red-400 border-red-500/30'
                        }`}
                      >
                        {item.available ? 'In Stock' : 'Out of Stock'}
                      </button>
                    </div>

                    <h3 className="font-black text-lg text-white mt-2">{item.name}</h3>
                    <p className="text-xs text-slate-400 font-semibold uppercase mt-0.5">
                      {item.category?.replace(/_/g, ' ')}
                    </p>
                    {item.description && (
                      <p className="text-xs text-slate-500 mt-2 line-clamp-2">{item.description}</p>
                    )}
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
                    <div className="text-xl font-black text-orange-400">Rs. {item.price}</div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditingMenuItem(item);
                          setMenuForm({
                            name: item.name,
                            category: item.category || 'starters',
                            price: String(item.price),
                            description: item.description || '',
                            foodType: item.foodType || 'veg',
                            available: item.available !== false,
                          });
                          setShowMenuModal(true);
                        }}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDeleteMenuItem(item._id, item.name)}
                        className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900 text-red-300 border border-red-800/30 transition"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: TABLES & SEATING MANAGEMENT */}
        {/* ========================================================================= */}
        {activeTab === 'tables' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white">Tables & Floor Layout</h2>
                <p className="text-xs text-slate-400">Manage dining tables, seating capacities, and sections</p>
              </div>

              <button
                onClick={() => {
                  setEditingTable(null);
                  setTableForm({ name: '', number: '', capacity: '4', section: 'Main Hall' });
                  setShowTableModal(true);
                }}
                className="py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-orange-600/30 transition"
              >
                <Plus size={16} /> Add New Table
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {tables.map((table) => (
                <div
                  key={table._id}
                  className={`p-5 rounded-3xl border flex flex-col justify-between shadow-md transition ${
                    table.status === 'occupied'
                      ? 'bg-amber-950/30 border-amber-600/40 text-amber-200'
                      : 'bg-slate-900 border-slate-800 text-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        table.status === 'occupied'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      {table.status || 'Available'}
                    </span>
                    <span className="text-xs text-slate-500 font-bold">{table.seating_capacity || 4} Seats</span>
                  </div>

                  <div className="text-center my-3">
                    <div className="text-3xl font-black text-white">Table {table.table_number}</div>
                    <div className="text-xs text-slate-400 font-medium mt-0.5">{table.section || 'Main Hall'}</div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-center gap-2">
                    <button
                      onClick={() => {
                        setEditingTable(table);
                        setTableForm({
                          name: table.name || `Table ${table.table_number}`,
                          number: String(table.table_number),
                          capacity: String(table.seating_capacity || 4),
                          section: table.section || 'Main Hall',
                        });
                        setShowTableModal(true);
                      }}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteTable(table._id, table.table_number)}
                      className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900 text-red-300 border border-red-800/30 transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: ORDERS & LIVE HISTORY */}
        {/* ========================================================================= */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white">Live Orders & Billing History</h2>
                <p className="text-xs text-slate-400">View real-time and completed orders, items, and billing details</p>
              </div>

              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-bold py-2.5 px-3 rounded-xl focus:outline-none"
              >
                <option value="all">All Orders ({orders.length})</option>
                <option value="pending">Pending KOTs</option>
                <option value="preparing">Cooking</option>
                <option value="served">Ready / Served</option>
                <option value="paid">Paid & Settled</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950/80 text-xs uppercase font-bold text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-4">Order ID</th>
                      <th className="p-4">Time</th>
                      <th className="p-4">Table</th>
                      <th className="p-4">Waiter</th>
                      <th className="p-4">Items</th>
                      <th className="p-4">Total Amount</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredOrders.slice(0, 50).map((order) => (
                      <tr key={order._id || order.orderId} className="hover:bg-slate-800/40 transition">
                        <td className="p-4 font-mono text-xs font-bold text-orange-400">
                          #{order.orderId?.slice(-6) || '0000'}
                        </td>
                        <td className="p-4 text-xs text-slate-400">
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-4 font-bold text-white">Table {order.tableNumber}</td>
                        <td className="p-4 text-slate-300 font-medium">{order.waiterName || 'Staff'}</td>
                        <td className="p-4 text-xs text-slate-400">
                          {order.items?.length || 0} items (
                          {order.items
                            ?.slice(0, 2)
                            .map((i: any) => `${i.itemName} x${i.quantity}`)
                            .join(', ')}
                          {order.items?.length > 2 ? '...' : ''})
                        </td>
                        <td className="p-4 font-black text-white">Rs. {order.total}</td>
                        <td className="p-4">
                          <span
                            className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                              order.status === 'paid'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : order.status === 'cancelled'
                                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                : order.status === 'preparing'
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setSelectedOrderDetails(order)}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition"
                          >
                            View Bill
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: 80 REPORTS & ANALYTICS SUITE */}
        {/* ========================================================================= */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            {/* Reports Top Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-2xl font-black text-white flex items-center gap-2">
                  <FileBarChart className="text-indigo-400" /> 80 Reports & Analytics Suite
                </h2>
                <p className="text-xs text-slate-400">
                  Comprehensive reporting engine for Sales, Dishes, Staff SLA, Taxes & End-of-Day Z-Reports
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Date Range Selector */}
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1">
                  <button
                    onClick={() => setReportRange('today')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      reportRange === 'today' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setReportRange('yesterday')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      reportRange === 'yesterday' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Yesterday
                  </button>
                  <button
                    onClick={() => setReportRange('last7days')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      reportRange === 'last7days' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    7 Days
                  </button>
                  <button
                    onClick={() => setReportRange('month')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      reportRange === 'month' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Month
                  </button>
                </div>

                {/* Export Button */}
                <button
                  onClick={exportReportToExcel}
                  className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition"
                >
                  <Download size={16} /> Export to Excel (.xlsx)
                </button>
              </div>
            </div>

            {/* Macro KPI Cards */}
            {reportData?.summary && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                  <div className="text-xs font-bold text-slate-500 uppercase">Gross Sales</div>
                  <div className="text-xl font-black text-white mt-1">
                    Rs. {reportData.summary.totalGrossSales.toLocaleString()}
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                  <div className="text-xs font-bold text-slate-500 uppercase">Net Sales</div>
                  <div className="text-xl font-black text-emerald-400 mt-1">
                    Rs. {reportData.summary.totalNetSales.toLocaleString()}
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                  <div className="text-xs font-bold text-slate-500 uppercase">Total GST (5%)</div>
                  <div className="text-xl font-black text-indigo-400 mt-1">
                    Rs. {reportData.summary.totalTax.toLocaleString()}
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                  <div className="text-xs font-bold text-slate-500 uppercase">Service Charge</div>
                  <div className="text-xl font-black text-amber-400 mt-1">
                    Rs. {reportData.summary.totalServiceCharge.toLocaleString()}
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                  <div className="text-xs font-bold text-slate-500 uppercase">Total Bills</div>
                  <div className="text-xl font-black text-white mt-1">{reportData.summary.paidOrdersCount}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                  <div className="text-xs font-bold text-slate-500 uppercase">Avg Bill (AOV)</div>
                  <div className="text-xl font-black text-orange-400 mt-1">
                    Rs. {reportData.summary.averageOrderValue.toLocaleString()}
                  </div>
                </div>
              </div>
            )}

            {/* 80 Reports Catalog Browser */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Left Column: 80 Reports Index & Search */}
              <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col max-h-[680px]">
                <div className="mb-3 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
                    <input
                      type="text"
                      placeholder="Search 80 reports..."
                      value={reportSearch}
                      onChange={(e) => setReportSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Category Pills */}
                  <div className="flex gap-1 overflow-x-auto pb-1">
                    {['All', 'Sales & Revenue', 'Menu & Product', 'Staff & Operations', 'Taxes & Audit', 'Tables & Day-Close'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setReportCategoryFilter(cat)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition ${
                          reportCategoryFilter === cat ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-400'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-y-auto space-y-1 flex-1 pr-1">
                  {filteredReportCatalog.map((rep: any) => (
                    <button
                      key={rep.id}
                      onClick={() => setSelectedReportId(rep.id)}
                      className={`w-full text-left p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                        selectedReportId === rep.id
                          ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span className="truncate">{rep.name}</span>
                      <span className="text-[10px] text-slate-500 uppercase">{rep.category.slice(0, 4)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Column: Dynamic Report Viewer */}
              <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col">
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                  <div>
                    <h3 className="text-xl font-black text-white">
                      {reportData?.catalog?.find((r: any) => r.id === selectedReportId)?.name || 'Daily Day-Close Z-Report'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Live aggregated statistics from database for period: <strong className="text-slate-200">{reportRange}</strong>
                    </p>
                  </div>
                  <button
                    onClick={exportReportToExcel}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    title="Export current view to Excel"
                  >
                    <Download size={18} />
                  </button>
                </div>

                {reportsLoading ? (
                  <div className="h-72 flex items-center justify-center text-slate-500">
                    <Loader2 className="animate-spin text-indigo-500" size={32} />
                  </div>
                ) : (
                  /* Dynamic Content View based on category */
                  <div className="overflow-x-auto">
                    {/* View 1: Top Dishes / Menu */}
                    {selectedReportId.includes('top_items') || selectedReportId.includes('dish') || selectedReportId.includes('category') ? (
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950 text-slate-400 uppercase font-bold border-b border-slate-800">
                          <tr>
                            <th className="p-3">Rank</th>
                            <th className="p-3">Dish / Category</th>
                            <th className="p-3">Quantity Sold</th>
                            <th className="p-3">Revenue (INR)</th>
                            <th className="p-3">Contribution</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-medium">
                          {reportData?.topSellingItems?.map((item: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-800/40">
                              <td className="p-3 font-bold text-orange-400">#{idx + 1}</td>
                              <td className="p-3 font-bold text-white">{item.name}</td>
                              <td className="p-3 text-slate-300">{item.quantity} orders</td>
                              <td className="p-3 font-bold text-emerald-400">Rs. {item.revenue.toLocaleString()}</td>
                              <td className="p-3 text-slate-400">
                                {reportData.summary.totalNetSales > 0
                                  ? `${Math.round((item.revenue / reportData.summary.totalNetSales) * 100)}%`
                                  : '0%'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : selectedReportId.includes('waiter') || selectedReportId.includes('staff') ? (
                      /* View 2: Staff / Waiter SLA */
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950 text-slate-400 uppercase font-bold border-b border-slate-800">
                          <tr>
                            <th className="p-3">Staff Name</th>
                            <th className="p-3">Total Sales Handled</th>
                            <th className="p-3">Total Bills</th>
                            <th className="p-3">Average Ticket Size (AOV)</th>
                            <th className="p-3">Efficiency Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-medium">
                          {reportData?.waiterSales?.map((w: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-800/40">
                              <td className="p-3 font-bold text-white flex items-center gap-2">
                                <User size={14} className="text-orange-400" /> {w.name}
                              </td>
                              <td className="p-3 font-bold text-emerald-400">Rs. {w.revenue.toLocaleString()}</td>
                              <td className="p-3 text-slate-300">{w.orders} bills</td>
                              <td className="p-3 text-indigo-400 font-bold">Rs. {w.aov}</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  Top Performer
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      /* View 3: Day-Wise / Sales Z-Report */
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950 text-slate-400 uppercase font-bold border-b border-slate-800">
                          <tr>
                            <th className="p-3">Date</th>
                            <th className="p-3">Gross Sales</th>
                            <th className="p-3">Net Sales</th>
                            <th className="p-3">GST Tax (5%)</th>
                            <th className="p-3">Bills Count</th>
                            <th className="p-3">Day Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-medium">
                          {reportData?.dayWiseSales?.map((d: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-800/40">
                              <td className="p-3 font-bold text-white">{d.date}</td>
                              <td className="p-3 font-bold text-white">Rs. {d.gross.toLocaleString()}</td>
                              <td className="p-3 text-emerald-400 font-bold">Rs. {d.net.toLocaleString()}</td>
                              <td className="p-3 text-indigo-400">Rs. {d.tax.toLocaleString()}</td>
                              <td className="p-3 text-slate-300">{d.orders} orders</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  Z-Settled
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT STAFF */}
      {/* ========================================================================= */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-white">
                {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
              </h3>
              <button
                onClick={() => setShowStaffModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Staff Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Chef / Waiter 5"
                  value={staffForm.name}
                  onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Staff Role
                </label>
                <select
                  value={staffForm.role}
                  onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500"
                >
                  <option value="waiter">Service Staff (Waiter)</option>
                  <option value="chef">Kitchen Staff (Chef)</option>
                  <option value="admin">Manager (Admin)</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  4-Digit Login PIN {editingStaff && '(Leave blank to keep unchanged)'}
                </label>
                <input
                  type="password"
                  maxLength={6}
                  placeholder={editingStaff ? 'Leave empty to keep current PIN' : 'e.g. 1234'}
                  value={staffForm.pin}
                  onChange={(e) => setStaffForm({ ...staffForm, pin: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500 font-mono"
                  required={!editingStaff}
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowStaffModal(false)}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold shadow-lg shadow-orange-600/30"
                >
                  Save Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD / EDIT MENU ITEM */}
      {/* ========================================================================= */}
      {showMenuModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-white">{editingMenuItem ? 'Edit Dish' : 'Add New Menu Item'}</h3>
              <button
                onClick={() => setShowMenuModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMenu} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Dish Name</label>
                <input
                  type="text"
                  placeholder="e.g. Paneer Tikka Masala"
                  value={menuForm.name}
                  onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Category</label>
                  <input
                    type="text"
                    placeholder="e.g. starters"
                    value={menuForm.category}
                    onChange={(e) => setMenuForm({ ...menuForm, category: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Price (INR)</label>
                  <input
                    type="number"
                    placeholder="250"
                    value={menuForm.price}
                    onChange={(e) => setMenuForm({ ...menuForm, price: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Food Type</label>
                <select
                  value={menuForm.foodType}
                  onChange={(e) => setMenuForm({ ...menuForm, foodType: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500"
                >
                  <option value="veg">Pure Veg</option>
                  <option value="non-veg">Non-Veg</option>
                  <option value="egg">Contains Egg</option>
                  <option value="beverage">Drink / Beverage</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Short description of ingredients..."
                  value={menuForm.description}
                  onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowMenuModal(false)}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold shadow-lg shadow-orange-600/30"
                >
                  Save Dish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ADD / EDIT TABLE */}
      {/* ========================================================================= */}
      {showTableModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-white">{editingTable ? 'Edit Table' : 'Add New Table'}</h3>
              <button
                onClick={() => setShowTableModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTable} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Table Number</label>
                <input
                  type="number"
                  placeholder="e.g. 1"
                  value={tableForm.number}
                  onChange={(e) => setTableForm({ ...tableForm, number: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Capacity (Seats)</label>
                  <input
                    type="number"
                    placeholder="4"
                    value={tableForm.capacity}
                    onChange={(e) => setTableForm({ ...tableForm, capacity: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Section</label>
                  <input
                    type="text"
                    placeholder="e.g. AC Hall"
                    value={tableForm.section}
                    onChange={(e) => setTableForm({ ...tableForm, section: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowTableModal(false)}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold shadow-lg shadow-orange-600/30"
                >
                  Save Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: ORDER DETAILS BILL VIEWER */}
      {/* ========================================================================= */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <div>
                <h3 className="text-xl font-black text-white">Order Details & Receipt</h3>
                <p className="text-xs text-slate-400">Order ID: #{selectedOrderDetails.orderId}</p>
              </div>
              <button
                onClick={() => setSelectedOrderDetails(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 mb-6 text-sm">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Table: <strong className="text-white">Table {selectedOrderDetails.tableNumber}</strong></span>
                <span>Waiter: <strong className="text-white">{selectedOrderDetails.waiterName}</strong></span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 max-h-48 overflow-y-auto">
                {selectedOrderDetails.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="text-slate-200">
                      {item.itemName} <strong className="text-orange-400">x{item.quantity}</strong>
                    </span>
                    <span className="font-bold text-white">Rs. {item.subtotal || item.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-800 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="text-white font-semibold">Rs. {selectedOrderDetails.subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST Tax (5%):</span>
                  <span className="text-white font-semibold">Rs. {selectedOrderDetails.tax}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service Charge:</span>
                  <span className="text-white font-semibold">Rs. {selectedOrderDetails.serviceCharge || 0}</span>
                </div>
                <div className="flex justify-between text-base font-black text-emerald-400 pt-2 border-t border-slate-800">
                  <span>Total Amount:</span>
                  <span>Rs. {selectedOrderDetails.total}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedOrderDetails(null)}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold transition"
            >
              Close Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}