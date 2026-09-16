'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  FileText,
  Boxes,
  Store,
  LogOut,
  RefreshCw,
  Plus,
  Trash2,
  Edit3,
  Printer,
  Download,
  AlertTriangle,
  CheckCircle2,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  TrendingDown,
  Building,
  Phone,
  Receipt,
  X,
  PlusCircle,
  MinusCircle,
  Save,
  Clock,
  User,
  Coffee,
  Loader2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

// Helper to sanitize ASCII strings for jsPDF
function sanitizeAscii(str: any): string {
  if (!str) return '';
  return String(str).replace(/[^\x20-\x7E]/g, '').trim();
}

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'profile'>('orders');
  const [isLoading, setIsLoading] = useState(true);
  const [adminName, setAdminName] = useState('Manager');

  // Orders State
  const [orders, setOrders] = useState<any[]>([]);
  const [orderFilter, setOrderFilter] = useState<string>('all');
  const [menuItems, setMenuItems] = useState<any[]>([]);

  // Restaurant Profile State
  const [profile, setProfile] = useState({
    restaurantName: 'Hotel Royal Palace',
    tagline: 'Pure Veg & Fast Service',
    address: 'Main Road, Station Area',
    phone: '+91 98765 43210',
    email: 'contact@restaurant.com',
    gstin: '24AAAAA0000A1Z5',
    fssai: '10019021000000',
  });
  const [showProfileModal, setShowProfileModal] = useState(false);

  // In-App Invoice Preview Modal State (NO auto-download)
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<any>(null);

  // Bill Editing Modal State
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [editItems, setEditItems] = useState<any[]>([]);
  const [editDiscount, setEditDiscount] = useState<number>(0);
  const [selectedAddItem, setSelectedAddItem] = useState<string>('');

  // Inventory State
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [inventorySummary, setInventorySummary] = useState<any>({ totalItems: 0, lowStockCount: 0, totalInventoryValue: 0 });
  const [inventoryFilterCat, setInventoryFilterCat] = useState<string>('all');
  const [inventorySearch, setInventorySearch] = useState<string>('');
  const [showOnlyLowStock, setShowOnlyLowStock] = useState<boolean>(false);
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [editingStockItem, setEditingStockItem] = useState<any>(null);
  const [stockForm, setStockForm] = useState({
    name: '',
    category: 'Vegetables',
    quantity: '10',
    unit: 'kg',
    minLevel: '5',
    costPrice: '40',
    supplier: '',
  });

  // Stock Adjustment (+ Inward / - Outward) Modal
  const [adjustItem, setAdjustItem] = useState<any>(null);
  const [adjustType, setAdjustType] = useState<'inward' | 'outward'>('inward');
  const [adjustAmount, setAdjustAmount] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState<string>('');

  // Notification / Toast
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Auth & Load
  useEffect(() => {
    const init = async () => {
      try {
        const authRes = await fetch('/api/auth/me');
        if (authRes.ok) {
          const user = await authRes.json();
          if (user.role !== 'admin' && user.role !== 'superadmin') {
            router.push('/');
            return;
          }
          if (user.name) setAdminName(user.name);
          await loadAllData();
        } else {
          router.push('/');
        }
      } catch (err) {
        console.error(err);
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [router]);

  const loadAllData = async () => {
    await Promise.all([fetchOrders(), fetchProfile(), fetchInventory(), fetchMenu()]);
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data?.orders) setOrders(data.orders);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/settings/profile');
      const data = await res.json();
      if (data?.profile) setProfile(data.profile);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchInventory = async () => {
    try {
      const res = await fetch('/api/inventory');
      const data = await res.json();
      if (data?.items) {
        setInventoryItems(data.items);
        if (data.summary) setInventorySummary(data.summary);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMenu = async () => {
    try {
      const res = await fetch('/api/menu');
      const data = await res.json();
      if (data?.items) setMenuItems(data.items);
    } catch (e) {
      console.error(e);
    }
  };

  // Save Restaurant Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      showToast('success', 'Restaurant profile saved. All invoices updated!');
      setShowProfileModal(false);
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  // Status Change Handler
  const handleStatusChange = async (orderId: string, status: string) => {
    try {
      setOrders((prev) => prev.map((o) => (o.orderId === orderId || o._id === orderId ? { ...o, status } : o)));
      await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      fetchOrders();
    } catch (e) {
      console.error(e);
    }
  };

  // -----------------------------------------------------------------
  // BILL EDITING HANDLERS
  // -----------------------------------------------------------------
  const openEditBillModal = (order: any) => {
    setEditingOrder(order);
    setEditItems(
      (order.items || []).map((i: any) => ({
        menuItemId: i.menuItemId || i.id,
        itemName: i.itemName || i.name,
        price: Number(i.price || i.unit_price) || 0,
        quantity: Number(i.quantity) || 1,
        notes: i.notes || '',
      }))
    );
    setEditDiscount(Number(order.discount) || 0);
  };

  const handleUpdateItemQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      // Remove item
      setEditItems((prev) => prev.filter((_, idx) => idx !== index));
    } else {
      setEditItems((prev) =>
        prev.map((item, idx) => (idx === index ? { ...item, quantity: newQty } : item))
      );
    }
  };

  const handleAddDishToBill = () => {
    if (!selectedAddItem) return;
    const dish = menuItems.find((m) => m._id === selectedAddItem || m.id === selectedAddItem);
    if (!dish) return;

    const existingIdx = editItems.findIndex((i) => i.menuItemId === dish._id);
    if (existingIdx >= 0) {
      setEditItems((prev) =>
        prev.map((i, idx) => (idx === existingIdx ? { ...i, quantity: i.quantity + 1 } : i))
      );
    } else {
      setEditItems((prev) => [
        ...prev,
        {
          menuItemId: dish._id,
          itemName: dish.name,
          price: dish.price,
          quantity: 1,
          notes: '',
        },
      ]);
    }
    setSelectedAddItem('');
  };

  const handleSaveBillChanges = async () => {
    if (!editingOrder) return;
    if (editItems.length === 0) {
      return showToast('error', 'Cannot save empty bill');
    }

    try {
      const orderId = editingOrder.orderId || editingOrder._id;
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: editItems,
          discount: editDiscount,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update bill');

      showToast('success', 'Bill & Invoice updated successfully!');
      setEditingOrder(null);
      fetchOrders();

      // If viewing invoice, update invoice preview
      if (selectedInvoiceOrder && (selectedInvoiceOrder.orderId === orderId || selectedInvoiceOrder._id === orderId)) {
        setSelectedInvoiceOrder(data.order);
      }
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  // -----------------------------------------------------------------
  // CLEAN PDF DOWNLOAD (ON USER REQUEST ONLY)
  // -----------------------------------------------------------------
  const downloadCleanPdf = (order: any) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 180],
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 8;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(sanitizeAscii(profile.restaurantName) || 'Restaurant POS', pageWidth / 2, y, { align: 'center' });

      y += 5;
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      if (profile.address) {
        doc.text(sanitizeAscii(profile.address), pageWidth / 2, y, { align: 'center' });
        y += 4;
      }
      if (profile.phone) {
        doc.text(`Ph: ${sanitizeAscii(profile.phone)}`, pageWidth / 2, y, { align: 'center' });
        y += 4;
      }

      y += 1;
      doc.setLineWidth(0.3);
      doc.line(4, y, pageWidth - 4, y);

      y += 4;
      doc.setFontSize(7);
      doc.text(`Table: ${order.tableNumber || order.table_number}`, 4, y);
      doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-GB')}`, pageWidth - 4, y, { align: 'right' });

      y += 3.5;
      doc.text(`Waiter: ${sanitizeAscii(order.waiterName || order.waiter_name) || 'Staff'}`, 4, y);
      doc.text(`Bill: #${String(order.orderId || order._id).slice(-6).toUpperCase()}`, pageWidth - 4, y, { align: 'right' });

      y += 2;
      doc.line(4, y, pageWidth - 4, y);
      y += 3.5;
      doc.setFont('helvetica', 'bold');
      doc.text('Item', 4, y);
      doc.text('Qty', 46, y, { align: 'center' });
      doc.text('Rate', 58, y, { align: 'right' });
      doc.text('Amt', pageWidth - 4, y, { align: 'right' });
      y += 2;
      doc.line(4, y, pageWidth - 4, y);

      y += 3.5;
      doc.setFont('helvetica', 'normal');
      (order.items || []).forEach((item: any) => {
        const rawName = item.itemName || item.name || 'Item';
        const cleanName = sanitizeAscii(rawName) || 'Item';
        const qty = item.quantity || 1;
        const price = Number(item.price || item.unit_price) || 0;
        const sub = price * qty;

        const displayName = cleanName.length > 20 ? cleanName.substring(0, 19) + '..' : cleanName;
        doc.text(displayName, 4, y);
        doc.text(String(qty), 46, y, { align: 'center' });
        doc.text(price.toFixed(0), 58, y, { align: 'right' });
        doc.text(sub.toFixed(0), pageWidth - 4, y, { align: 'right' });
        y += 4;
      });

      y += 1;
      doc.line(4, y, pageWidth - 4, y);
      y += 4;

      doc.text('Subtotal:', 4, y);
      doc.text(`Rs. ${(order.subtotal || 0).toFixed(2)}`, pageWidth - 4, y, { align: 'right' });
      y += 3.5;
      doc.text('GST Tax (5%):', 4, y);
      doc.text(`Rs. ${(order.tax || order.tax_amount || 0).toFixed(2)}`, pageWidth - 4, y, { align: 'right' });

      if (order.serviceCharge || order.service_charge) {
        y += 3.5;
        doc.text('Service (10%):', 4, y);
        doc.text(`Rs. ${(order.serviceCharge || order.service_charge || 0).toFixed(2)}`, pageWidth - 4, y, { align: 'right' });
      }

      if (order.discount) {
        y += 3.5;
        doc.text('Discount:', 4, y);
        doc.text(`-Rs. ${(order.discount || 0).toFixed(2)}`, pageWidth - 4, y, { align: 'right' });
      }

      y += 2;
      doc.setLineWidth(0.4);
      doc.line(4, y, pageWidth - 4, y);
      y += 4.5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text('TOTAL AMOUNT:', 4, y);
      doc.text(`Rs. ${(order.total || order.total_amount || 0).toFixed(0)}`, pageWidth - 4, y, { align: 'right' });

      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text('Thank You! Visit Again', pageWidth / 2, y, { align: 'center' });

      doc.save(`Invoice_Table_${order.tableNumber || order.table_number}.pdf`);
      showToast('success', 'PDF Invoice downloaded!');
    } catch (e) {
      console.error(e);
      showToast('error', 'Failed to generate PDF');
    }
  };

  // -----------------------------------------------------------------
  // INVENTORY / STOCK HANDLERS
  // -----------------------------------------------------------------
  const handleSaveStockItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockForm.name) return showToast('error', 'Item name is required');

    try {
      if (editingStockItem) {
        const res = await fetch('/api/inventory', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingStockItem._id, ...stockForm }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        showToast('success', 'Stock item updated');
      } else {
        const res = await fetch('/api/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(stockForm),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        showToast('success', 'New stock item added');
      }

      setShowAddStockModal(false);
      setEditingStockItem(null);
      setStockForm({ name: '', category: 'Vegetables', quantity: '10', unit: 'kg', minLevel: '5', costPrice: '40', supplier: '' });
      fetchInventory();
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustItem || !adjustAmount) return;

    try {
      const res = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: adjustItem._id,
          type: adjustType,
          amount: adjustAmount,
          reason: adjustReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast('success', data.message);
      setAdjustItem(null);
      setAdjustAmount('');
      setAdjustReason('');
      fetchInventory();
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  const handleDeleteStock = async (id: string, name: string) => {
    if (!confirm(`Delete stock item "${name}"?`)) return;
    try {
      const res = await fetch(`/api/inventory?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('success', 'Stock item removed');
        fetchInventory();
      }
    } catch (e: any) {
      showToast('error', e.message);
    }
  };

  const exportStockToExcel = () => {
    const wsData = inventoryItems.map((item, idx) => ({
      'S.No': idx + 1,
      'Item Name': item.name,
      Category: item.category,
      'Current Stock': `${item.quantity} ${item.unit}`,
      'Min Alert Level': `${item.minLevel} ${item.unit}`,
      'Stock Status': item.quantity <= item.minLevel ? 'LOW STOCK ALERT' : 'Adequate',
      'Unit Cost (Rs)': item.costPrice,
      'Total Value (Rs)': item.quantity * item.costPrice,
      Supplier: item.supplier || '-',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Inventory');
    XLSX.writeFile(wb, `Restaurant_Stock_Inventory_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('success', 'Stock sheet downloaded to Excel!');
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  // Filtered Inventory
  const filteredInventory = inventoryItems.filter((i) => {
    const matchesCat = inventoryFilterCat === 'all' || i.category === inventoryFilterCat;
    const matchesSearch = i.name.toLowerCase().includes(inventorySearch.toLowerCase());
    const matchesLowStock = !showOnlyLowStock || i.quantity <= (i.minLevel || 10);
    return matchesCat && matchesSearch && matchesLowStock;
  });

  const categoriesSet = Array.from(new Set(inventoryItems.map((i) => i.category || 'General')));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="animate-spin text-orange-500 mb-3" size={38} />
        <p className="text-slate-400 font-semibold text-sm">Loading Admin Portal...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-orange-500 selection:text-white">
      {/* Toast Alert */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-bold border transition-all animate-in slide-in-from-bottom-5 ${
            toastMsg.type === 'success'
              ? 'bg-emerald-500 text-slate-950 border-emerald-400'
              : 'bg-red-500 text-white border-red-400'
          }`}
        >
          {toastMsg.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
          {toastMsg.text}
        </div>
      )}

      {/* Header */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-4 sm:px-8 py-4 sticky top-0 z-40 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-slate-800 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <Shield size={22} className="text-indigo-300" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              {profile.restaurantName || 'Restaurant POS'}
            </h1>
            <p className="text-xs text-slate-400">
              Manager Panel • Logged in as: <strong className="text-slate-200">{adminName}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Restaurant Profile Button */}
          <button
            onClick={() => setShowProfileModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 border border-slate-700"
          >
            <Building size={15} className="text-amber-400" /> Hotel Branding
          </button>

          <button
            onClick={() => router.push('/chef')}
            className="px-3.5 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition flex items-center gap-1.5"
          >
            Kitchen View
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

      {/* Main Tab Controls */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 sm:px-8 py-2.5 flex overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === 'orders'
              ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <FileText size={16} /> Live Orders & Invoices ({orders.length})
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === 'inventory'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Boxes size={16} /> Stock & Inventory Management
          {inventorySummary.lowStockCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-500 text-white">
              {inventorySummary.lowStockCount} LOW
            </span>
          )}
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
        {/* ========================================================================= */}
        {/* TAB 1: ORDERS & INVOICE MANAGEMENT */}
        {/* ========================================================================= */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white">Live Dining Orders & Invoices</h2>
                <p className="text-xs text-slate-400">
                  Preview in-app receipts, edit bill quantities (e.g. 7 Roti to 6 Roti), and manage dining status
                </p>
              </div>

              <select
                value={orderFilter}
                onChange={(e) => setOrderFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-bold py-2.5 px-3 rounded-xl focus:outline-none"
              >
                <option value="all">All Orders ({orders.length})</option>
                <option value="pending">Pending</option>
                <option value="preparing">Cooking</option>
                <option value="served">Served / Ready</option>
                <option value="paid">Paid & Settled</option>
              </select>
            </div>

            {/* Orders Cards / Table */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {orders
                .filter((o) => (orderFilter === 'all' ? true : o.status === orderFilter))
                .map((order) => {
                  const isPaid = order.status === 'paid';
                  const orderId = order.orderId || order._id;

                  return (
                    <div
                      key={orderId}
                      className={`bg-slate-900 border rounded-3xl p-5 shadow-xl flex flex-col justify-between transition ${
                        isPaid ? 'border-slate-800/80 bg-slate-900/60' : 'border-orange-500/40 shadow-orange-500/10'
                      }`}
                    >
                      <div>
                        {/* Card Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                          <div>
                            <span className="text-2xl font-black text-white">Table {order.tableNumber}</span>
                            <div className="text-xs text-slate-400 font-medium mt-0.5">
                              Waiter: <strong className="text-slate-200">{order.waiterName || 'Staff'}</strong>
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                              isPaid
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : order.status === 'preparing'
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>

                        {/* Items List */}
                        <div className="py-3 space-y-2 divide-y divide-slate-800/50 max-h-40 overflow-y-auto">
                          {(order.items || []).map((item: any, idx: number) => (
                            <div key={idx} className={`${idx > 0 ? 'pt-2' : ''} flex items-center justify-between text-xs`}>
                              <div className="flex-1">
                                <span className="font-bold text-slate-200">{item.itemName || item.name}</span>
                                {item.notes && (
                                  <span className="block text-[10px] font-bold text-amber-400 mt-0.5">
                                    ★ {item.notes}
                                  </span>
                                )}
                              </div>
                              <div className="text-right">
                                <span className="font-black text-orange-400">x{item.quantity}</span>
                                <span className="text-slate-400 ml-2 font-mono">
                                  Rs. {(item.price || item.unit_price) * item.quantity}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Card Footer: Amount & Action Buttons */}
                      <div className="pt-3 border-t border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-400 font-bold uppercase">Total Bill</span>
                          <span className="text-2xl font-black text-white">Rs. {order.total || order.total_amount}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {/* In-App Invoice Preview Button */}
                          <button
                            onClick={() => setSelectedInvoiceOrder(order)}
                            className="py-2.5 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                          >
                            <Receipt size={14} /> View Invoice
                          </button>

                          {/* Edit Bill Button */}
                          <button
                            onClick={() => openEditBillModal(order)}
                            className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition border border-slate-700"
                          >
                            <Edit3 size={14} className="text-amber-400" /> Edit Bill
                          </button>
                        </div>

                        {/* Status Switcher Button */}
                        {!isPaid && (
                          <button
                            onClick={() => handleStatusChange(orderId, 'paid')}
                            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-1.5"
                          >
                            <CheckCircle2 size={16} /> Mark Paid & Settle
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MEDIUM-LEVEL INVENTORY / STOCK MANAGEMENT */}
        {/* ========================================================================= */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white flex items-center gap-2">
                  <Boxes className="text-indigo-400" /> Stock & Inventory Management
                </h2>
                <p className="text-xs text-slate-400">
                  Track raw materials, flour, vegetables, water bottles, milk, dairy, oil & suppliers
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={exportStockToExcel}
                  className="py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition"
                >
                  <Download size={15} /> Export Sheet (.xlsx)
                </button>

                <button
                  onClick={() => {
                    setEditingStockItem(null);
                    setStockForm({ name: '', category: 'Vegetables', quantity: '10', unit: 'kg', minLevel: '5', costPrice: '40', supplier: '' });
                    setShowAddStockModal(true);
                  }}
                  className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition"
                >
                  <Plus size={16} /> Add Stock Item
                </button>
              </div>
            </div>

            {/* Inventory KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Stock Items</div>
                <div className="text-3xl font-black text-white mt-1">{inventorySummary.totalItems} Items</div>
                <div className="text-xs text-slate-500 mt-1">Across all raw material categories</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl">
                <div className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle size={14} /> Low Stock Warnings
                </div>
                <div className="text-3xl font-black text-red-400 mt-1">{inventorySummary.lowStockCount} Items</div>
                <div className="text-xs text-slate-500 mt-1">Requires immediate purchase refill</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl">
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Total Inventory Value</div>
                <div className="text-3xl font-black text-emerald-400 mt-1">
                  Rs. {inventorySummary.totalInventoryValue.toLocaleString()}
                </div>
                <div className="text-xs text-slate-500 mt-1">Estimated stock purchasing worth</div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <Search size={16} className="text-slate-500 ml-2" />
                <input
                  type="text"
                  placeholder="Search stock (e.g. Atta, Water Bottle, Paneer)..."
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={inventoryFilterCat}
                  onChange={(e) => setInventoryFilterCat(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-200 text-xs font-bold py-2 px-3 rounded-xl focus:outline-none"
                >
                  <option value="all">All Categories</option>
                  {categoriesSet.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setShowOnlyLowStock(!showOnlyLowStock)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                    showOnlyLowStock
                      ? 'bg-red-500/20 text-red-400 border-red-500/40'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  ⚠ Low Stock Only
                </button>
              </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950 text-xs uppercase font-bold text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-4">Item Name</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Current Stock</th>
                      <th className="p-4">Min Alert</th>
                      <th className="p-4">Unit Cost</th>
                      <th className="p-4">Total Value</th>
                      <th className="p-4">Supplier</th>
                      <th className="p-4 text-center">Quick Adjust</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {filteredInventory.map((item) => {
                      const isLow = item.quantity <= (item.minLevel || 10);
                      return (
                        <tr key={item._id} className="hover:bg-slate-800/40 transition">
                          <td className="p-4">
                            <div className="font-bold text-white flex items-center gap-2">
                              {item.name}
                              {isLow && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-red-500/20 text-red-400 border border-red-500/30">
                                  LOW
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-xs text-slate-400">{item.category}</td>
                          <td className="p-4">
                            <span className={`font-black text-base ${isLow ? 'text-red-400' : 'text-emerald-400'}`}>
                              {item.quantity} {item.unit}
                            </span>
                          </td>
                          <td className="p-4 text-xs text-slate-400">
                            {item.minLevel || 10} {item.unit}
                          </td>
                          <td className="p-4 text-xs font-bold text-slate-300">Rs. {item.costPrice}</td>
                          <td className="p-4 text-xs font-bold text-white">
                            Rs. {((item.quantity || 0) * (item.costPrice || 0)).toLocaleString()}
                          </td>
                          <td className="p-4 text-xs text-slate-400">{item.supplier || '-'}</td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Inward + Button */}
                              <button
                                onClick={() => {
                                  setAdjustItem(item);
                                  setAdjustType('inward');
                                  setAdjustAmount('5');
                                }}
                                className="px-2 py-1 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 text-xs font-bold flex items-center gap-1 transition"
                                title="Add Stock (Purchase)"
                              >
                                <PlusCircle size={13} /> +In
                              </button>

                              {/* Outward - Button */}
                              <button
                                onClick={() => {
                                  setAdjustItem(item);
                                  setAdjustType('outward');
                                  setAdjustAmount('2');
                                }}
                                className="px-2 py-1 rounded-lg bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30 text-xs font-bold flex items-center gap-1 transition"
                                title="Deduct Stock (Kitchen Usage/Wastage)"
                              >
                                <MinusCircle size={13} /> -Out
                              </button>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingStockItem(item);
                                  setStockForm({
                                    name: item.name,
                                    category: item.category || 'Vegetables',
                                    quantity: String(item.quantity),
                                    unit: item.unit || 'kg',
                                    minLevel: String(item.minLevel || 5),
                                    costPrice: String(item.costPrice || 0),
                                    supplier: item.supplier || '',
                                  });
                                  setShowAddStockModal(true);
                                }}
                                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteStock(item._id, item.name)}
                                className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900 text-red-300 border border-red-800/30 transition"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: RESTAURANT PROFILE & BRANDING SETUP */}
      {/* ========================================================================= */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-xl font-black text-white">Restaurant Profile & Invoicing</h3>
                <p className="text-xs text-slate-400">This name will appear on all bills and invoices automatically</p>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Restaurant / Hotel Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hotel Shivam Pure Veg"
                  value={profile.restaurantName}
                  onChange={(e) => setProfile({ ...profile, restaurantName: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Tagline (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Delicious Food & Fast Service"
                  value={profile.tagline}
                  onChange={(e) => setProfile({ ...profile, tagline: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Station Road, Near Circle"
                  value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Phone / Contact
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    GSTIN Number
                  </label>
                  <input
                    type="text"
                    placeholder="24AAAAA0000A1Z5"
                    value={profile.gstin}
                    onChange={(e) => setProfile({ ...profile, gstin: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500 uppercase"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold shadow-lg shadow-orange-600/30"
                >
                  Save Restaurant Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: IN-APP INVOICE PREVIEW (NO AUTO-DOWNLOAD!) */}
      {/* ========================================================================= */}
      {selectedInvoiceOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-orange-400" />
                <span className="font-bold text-sm">In-App Bill Invoice Preview</span>
              </div>
              <button
                onClick={() => setSelectedInvoiceOrder(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Printable Receipt Body */}
            <div id="printable-receipt" className="p-6 overflow-y-auto space-y-4 font-mono text-xs text-slate-800 flex-1">
              {/* Branding */}
              <div className="text-center space-y-1 pb-3 border-b-2 border-dashed border-slate-300">
                <h2 className="text-lg font-black text-slate-950 font-sans tracking-tight">
                  {profile.restaurantName || 'Restaurant POS'}
                </h2>
                {profile.tagline && <p className="text-[10px] text-slate-500">{profile.tagline}</p>}
                {profile.address && <p className="text-[10px] text-slate-500">{profile.address}</p>}
                {profile.phone && <p className="text-[10px] text-slate-600 font-bold">Ph: {profile.phone}</p>}
                {profile.gstin && <p className="text-[10px] text-slate-600 font-bold">GSTIN: {profile.gstin}</p>}
              </div>

              {/* Order Meta */}
              <div className="flex justify-between text-[11px] pb-2 border-b border-slate-200">
                <div>
                  <div>Bill: #{String(selectedInvoiceOrder.orderId || selectedInvoiceOrder._id).slice(-6).toUpperCase()}</div>
                  <div>Table: <strong>Table {selectedInvoiceOrder.tableNumber || selectedInvoiceOrder.table_number}</strong></div>
                </div>
                <div className="text-right">
                  <div>{new Date(selectedInvoiceOrder.createdAt || Date.now()).toLocaleDateString('en-GB')}</div>
                  <div>Waiter: {selectedInvoiceOrder.waiterName || 'Staff'}</div>
                </div>
              </div>

              {/* Itemized Table */}
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-300 text-[10px] uppercase font-bold text-slate-500">
                    <th className="py-1">Item</th>
                    <th className="py-1 text-center">Qty</th>
                    <th className="py-1 text-right">Rate</th>
                    <th className="py-1 text-right">Amt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(selectedInvoiceOrder.items || []).map((item: any, idx: number) => {
                    const price = Number(item.price || item.unit_price) || 0;
                    const qty = item.quantity || 1;
                    return (
                      <tr key={idx} className="py-1.5">
                        <td className="py-1 font-bold text-slate-900">{item.itemName || item.name}</td>
                        <td className="py-1 text-center font-bold text-orange-600">{qty}</td>
                        <td className="py-1 text-right text-slate-600">{price}</td>
                        <td className="py-1 text-right font-bold text-slate-900">{price * qty}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Totals Breakdown */}
              <div className="pt-3 border-t-2 border-dashed border-slate-300 space-y-1 text-right text-[11px]">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>Rs. {(selectedInvoiceOrder.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>GST Tax (5%):</span>
                  <span>Rs. {(selectedInvoiceOrder.tax || selectedInvoiceOrder.tax_amount || 0).toFixed(2)}</span>
                </div>
                {(selectedInvoiceOrder.serviceCharge || selectedInvoiceOrder.service_charge) > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Service (10%):</span>
                    <span>Rs. {(selectedInvoiceOrder.serviceCharge || selectedInvoiceOrder.service_charge || 0).toFixed(2)}</span>
                  </div>
                )}
                {selectedInvoiceOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Discount:</span>
                    <span>-Rs. {Number(selectedInvoiceOrder.discount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-slate-950 pt-2 border-t border-slate-300 font-sans">
                  <span>GRAND TOTAL:</span>
                  <span>Rs. {(selectedInvoiceOrder.total || selectedInvoiceOrder.total_amount || 0).toFixed(0)}</span>
                </div>
              </div>

              <div className="text-center pt-2 text-[10px] text-slate-400">
                *** THANK YOU! VISIT AGAIN ***
              </div>
            </div>

            {/* Action Bar */}
            <div className="bg-slate-100 p-4 border-t border-slate-200 flex flex-wrap gap-2">
              <button
                onClick={() => openEditBillModal(selectedInvoiceOrder)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Edit3 size={14} className="text-amber-400" /> Edit Items
              </button>

              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-900 font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Printer size={14} /> Print
              </button>

              <button
                onClick={() => downloadCleanPdf(selectedInvoiceOrder)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition"
              >
                <Download size={14} /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ADMIN EDIT BILL & MODIFY ITEMS */}
      {/* ========================================================================= */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl p-6 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <div>
                <h3 className="text-xl font-black text-white">Modify Bill / Correct Order</h3>
                <p className="text-xs text-slate-400">
                  Change item quantities (e.g. 7 Roti to 6), remove dishes, or apply discount
                </p>
              </div>
              <button
                onClick={() => setEditingOrder(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            {/* Bill Items Modifier List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-4">
              {editItems.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="flex-1">
                    <span className="font-bold text-sm text-white">{item.itemName}</span>
                    <span className="block text-xs text-slate-400">Rs. {item.price} each</span>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateItemQty(idx, item.quantity - 1)}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center transition"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-black text-orange-400 text-base">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateItemQty(idx, item.quantity + 1)}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center transition"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateItemQty(idx, 0)}
                      className="p-2 ml-1 text-red-400 hover:bg-red-500/10 rounded-lg transition"
                      title="Delete item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Extra Item from Menu */}
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 mb-4 space-y-2">
              <label className="block text-[11px] font-bold uppercase text-slate-400">Add Item to Bill</label>
              <div className="flex gap-2">
                <select
                  value={selectedAddItem}
                  onChange={(e) => setSelectedAddItem(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="">Select dish from menu...</option>
                  {menuItems.map((m) => (
                    <option key={m._id || m.id} value={m._id || m.id}>
                      {m.name} - Rs. {m.price}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddDishToBill}
                  className="px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition"
                >
                  Add +
                </button>
              </div>
            </div>

            {/* Discount & Totals Summary */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs text-slate-300 mb-4">
              <div className="flex items-center justify-between">
                <span>Discount (INR):</span>
                <input
                  type="number"
                  placeholder="0"
                  value={editDiscount || ''}
                  onChange={(e) => setEditDiscount(Number(e.target.value) || 0)}
                  className="w-24 px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-right text-emerald-400 font-bold focus:outline-none"
                />
              </div>

              {/* Live recalculated preview */}
              {(() => {
                const sub = editItems.reduce((s, i) => s + i.price * i.quantity, 0);
                const tax = Math.round(sub * 0.05);
                const serv = Math.round(sub * 0.1);
                const tot = Math.max(0, sub + tax + serv - editDiscount);
                return (
                  <div className="pt-2 border-t border-slate-800 flex justify-between text-base font-black text-white">
                    <span>New Total:</span>
                    <span className="text-emerald-400">Rs. {tot}</span>
                  </div>
                );
              })()}
            </div>

            {/* Save Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveBillChanges}
                className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2"
              >
                <Save size={16} /> Save Updated Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: ADD / EDIT STOCK ITEM */}
      {/* ========================================================================= */}
      {showAddStockModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-800">
              <h3 className="text-xl font-black text-white">{editingStockItem ? 'Edit Stock Item' : 'Add Stock Item'}</h3>
              <button
                onClick={() => setShowAddStockModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveStockItem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Stock Item Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Atta (Wheat Flour), Mineral Water 1L"
                  value={stockForm.name}
                  onChange={(e) => setStockForm({ ...stockForm, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Category</label>
                  <select
                    value={stockForm.category}
                    onChange={(e) => setStockForm({ ...stockForm, category: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Vegetables">Vegetables</option>
                    <option value="Grains & Flour">Grains & Flour</option>
                    <option value="Dairy">Dairy & Milk</option>
                    <option value="Oil & Spices">Oil & Spices</option>
                    <option value="Beverages">Beverages & Water</option>
                    <option value="Packaging">Packaging</option>
                    <option value="General">General Supply</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Unit</label>
                  <select
                    value={stockForm.unit}
                    onChange={(e) => setStockForm({ ...stockForm, unit: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="kg">Kilograms (kg)</option>
                    <option value="grams">Grams</option>
                    <option value="ltr">Liters (ltr)</option>
                    <option value="bottles">Bottles</option>
                    <option value="packets">Packets</option>
                    <option value="pieces">Pieces</option>
                    <option value="boxes">Boxes</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Quantity</label>
                  <input
                    type="number"
                    value={stockForm.quantity}
                    onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Min Alert</label>
                  <input
                    type="number"
                    value={stockForm.minLevel}
                    onChange={(e) => setStockForm({ ...stockForm, minLevel: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Unit Cost (Rs)</label>
                  <input
                    type="number"
                    value={stockForm.costPrice}
                    onChange={(e) => setStockForm({ ...stockForm, costPrice: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Supplier Name</label>
                <input
                  type="text"
                  placeholder="e.g. Mandi Vendor / Amul Agency"
                  value={stockForm.supplier}
                  onChange={(e) => setStockForm({ ...stockForm, supplier: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddStockModal(false)}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-600/30"
                >
                  Save Stock Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: QUICK STOCK ADJUSTMENT (+ INWARD / - OUTWARD) */}
      {/* ========================================================================= */}
      {adjustItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-800">
              <div>
                <h3 className="text-xl font-black text-white">
                  {adjustType === 'inward' ? '+ Stock Purchase / Inward' : '- Stock Usage / Wastage'}
                </h3>
                <p className="text-xs text-slate-400">
                  {adjustItem.name} (Current: {adjustItem.quantity} {adjustItem.unit})
                </p>
              </div>
              <button
                onClick={() => setAdjustItem(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAdjustStock} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Amount to {adjustType === 'inward' ? 'Add (+)' : 'Deduct (-)'} in {adjustItem.unit}
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 5"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-lg font-black focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Reason / Memo (Optional)
                </label>
                <input
                  type="text"
                  placeholder={adjustType === 'inward' ? 'e.g. Fresh Mandi delivery' : 'e.g. Daily kitchen consumption'}
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setAdjustItem(null)}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`w-full py-3 rounded-xl text-white text-sm font-bold shadow-lg ${
                    adjustType === 'inward'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                      : 'bg-red-600 hover:bg-red-500 shadow-red-600/30'
                  }`}
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}