'use client';

import { useEffect, useState } from 'react';
import { OrderCard, OrderData } from '@/components/admin/order-card';
import { LogOut, RefreshCw, Loader2, BarChart3 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { jsPDF } from 'jspdf'; 

export default function AdminPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // 1. Fetch Logic
  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders');
      if (!response.ok) return;
      const data = await response.json();
      
      const transformedOrders = (data.orders || []).map((order: any) => ({
        id: order._id || order.id || '', 
        table_number: order.tableNumber || 0,
        waiter_name: order.waiterName || 'Staff',
        status: order.status || 'pending',
        subtotal: order.subtotal || 0,
        tax_amount: order.tax || 0,
        service_charge: order.serviceCharge || 0,
        total_amount: order.total || 0,
        created_at: order.createdAt || new Date().toISOString(),
        customer_name: order.customerName || '',
        customer_email: order.customerEmail || '',
        items: (order.items || []).map((item: any) => ({
          id: item.menuItemId || 'unknown',
          name: item.itemName || item.name || 'Unknown Item',
          quantity: item.quantity || 0,
          unit_price: item.price || 0,
        })),
      }));
      setOrders(transformedOrders);
      setLastUpdated(new Date());
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchOrders();
    setIsLoading(false);
    const interval = setInterval(fetchOrders, 4000);
    return () => clearInterval(interval);
  }, []);

  // 2. Invoice Generation (Client Side)
  const handleInvoice = async (order: OrderData) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 10;

      // Header
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Restaurant Invoice", pageWidth / 2, y, { align: "center" });
      
      y += 10;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Order ID: #${order.id.slice(-6).toUpperCase()}`, 15, y);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - 15, y, { align: "right" });
      
      y += 6;
      doc.text(`Table: ${order.table_number}`, 15, y);
      doc.text(`Waiter: ${order.waiter_name}`, pageWidth - 15, y, { align: "right" });

      if((order as any).customer_name) {
         y += 6;
         doc.text(`Customer: ${(order as any).customer_name}`, 15, y);
      }

      // Line
      y += 5;
      doc.setLineWidth(0.5);
      doc.line(15, y, pageWidth - 15, y);

      // Items Header
      y += 10;
      doc.setFont("helvetica", "bold");
      doc.text("Item", 15, y);
      doc.text("Qty", 120, y, { align: "center" });
      doc.text("Price", 150, y, { align: "right" });
      doc.text("Total", pageWidth - 15, y, { align: "right" });

      // Items List
      y += 8;
      doc.setFont("helvetica", "normal");
      
      order.items.forEach((item) => {
        const itemTotal = item.unit_price * item.quantity;
        doc.text(item.name.substring(0, 30), 15, y);
        doc.text(item.quantity.toString(), 120, y, { align: "center" });
        doc.text(item.unit_price.toFixed(2), 150, y, { align: "right" });
        doc.text(itemTotal.toFixed(2), pageWidth - 15, y, { align: "right" });
        y += 7;
      });

      // Totals
      y += 5;
      doc.line(15, y, pageWidth - 15, y);
      y += 8;

      doc.text(`Subtotal: ${order.subtotal.toFixed(2)}`, pageWidth - 15, y, { align: "right" });
      y += 6;
      doc.text(`Tax (5%): ${order.tax_amount.toFixed(2)}`, pageWidth - 15, y, { align: "right" });
      y += 6;
      doc.text(`Service (10%): ${order.service_charge.toFixed(2)}`, pageWidth - 15, y, { align: "right" });
      
      y += 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(`Total: ${order.total_amount.toFixed(2)}`, pageWidth - 15, y, { align: "right" });

      // Save
      doc.save(`Invoice-Table-${order.table_number}.pdf`);

      // Mock Email Alert
      if ((order as any).customer_email) {
          alert(`✅ Invoice downloaded & sent to ${(order as any).customer_email}`);
      } else {
          alert("✅ Invoice downloaded successfully.");
      }

    } catch (err) {
      console.error("PDF Error:", err);
      alert("Failed to generate PDF");
    }
  };

  // 3. Status Change Handler
  const handleStatusChange = async (orderId: string, status: string) => {
    try {
      // Optimistic Update
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: status as any } : o));

      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) throw new Error("API Error");

      // If Paid, Generate Invoice automatically
      if (status === 'paid') {
          const order = orders.find(o => o.id === orderId);
          if (order) handleInvoice(order);
          fetchOrders(); // Refresh to ensure sync
      }
      
    } catch (error) {
      console.error('Status error:', error);
      alert('Failed to update status. Please try again.');
      fetchOrders(); // Revert on error
    }
  };

  const filteredOrders = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  const stats = {
    pending: orders.filter((o) => o.status === 'pending').length,
    preparing: orders.filter((o) => o.status === 'preparing').length,
    served: orders.filter((o) => o.status === 'served').length,
    paid: orders.filter((o) => o.status === 'paid').length,
    revenue: orders.filter((o) => o.status === 'paid').reduce((sum, o) => sum + (o.total_amount || 0), 0),
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white shadow-sm border-b px-4 py-3 flex justify-between items-center sticky top-0 z-20">
        <div>
           <h1 className="text-xl font-bold text-gray-900">Kitchen Display</h1>
           <div className="flex items-center gap-2 text-xs text-gray-500">
             <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
             Live Updates - {lastUpdated.toLocaleTimeString()}
           </div>
        </div>
        <button onClick={() => router.push('/')} className="text-red-600 font-medium text-sm hover:bg-red-50 px-3 py-1 rounded">Logout</button>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
           <StatBox label="Pending" value={stats.pending} color="text-yellow-600" bg="bg-yellow-50" />
           <StatBox label="Preparing" value={stats.preparing} color="text-blue-600" bg="bg-blue-50" />
           <StatBox label="Served" value={stats.served} color="text-green-600" bg="bg-green-50" />
           <StatBox label="Paid" value={stats.paid} color="text-purple-600" bg="bg-purple-50" />
           <div className="bg-gray-900 rounded-lg p-3 text-white">
              <p className="text-[10px] uppercase opacity-70 font-bold">Total Revenue</p>
              <p className="text-2xl font-black">₹{stats.revenue.toFixed(0)}</p>
           </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
           {['all', 'pending', 'preparing', 'served', 'paid'].map(s => (
              <button 
                key={s} 
                onClick={() => setFilter(s)} 
                className={`px-4 py-2 rounded-full text-sm font-bold capitalize whitespace-nowrap transition-all ${filter === s ? 'bg-black text-white' : 'bg-white border border-gray-300 text-gray-600'}`}
              >
                {s}
              </button>
           ))}
        </div>

        {/* Orders Grid */}
        {isLoading && orders.length === 0 ? (
           <div className="flex justify-center py-20"><Loader2 className="animate-spin text-orange-500 h-8 w-8" /></div>
        ) : filteredOrders.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl bg-gray-50">
             <BarChart3 className="text-gray-300 mb-2" size={48} />
             <p className="text-gray-400 font-medium">No orders found</p>
           </div>
        ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredOrders.map(order => (
                  <div key={order.id} className="relative group">
                      <OrderCard order={order} onStatusChange={handleStatusChange} />
                      
                      {/* Manual Invoice Button (Top Right) */}
                      {(order.status === 'paid' || order.status === 'served') && (
                          <button 
                              onClick={(e) => { e.stopPropagation(); handleInvoice(order); }}
                              className="absolute top-4 right-4 bg-white hover:bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded border shadow-sm flex items-center gap-1 z-10"
                          >
                              🖨️ Invoice
                          </button>
                      )}
                  </div>
              ))}
           </div>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, color, bg }: any) {
    return (
        <div className={`${bg} rounded-lg p-3 border border-transparent`}>
            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">{label}</p>
            <p className={`text-2xl font-black ${color}`}>{value}</p>
        </div>
    )
}