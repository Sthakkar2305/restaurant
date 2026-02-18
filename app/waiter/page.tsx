'use client';

import { useEffect, useState } from 'react';
import { MenuCard } from '@/components/waiter/menu-card';
import { TableSelector } from '@/components/waiter/table-selector';
import { OrderSummary, CartItem } from '@/components/waiter/order-summary';
import { Lock, ArrowUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Toast } from '@/components/waiter/Toast'; 

export default function WaiterPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [menu, setMenu] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [cart, setCart] = useState<Map<string, CartItem>>(new Map());
  const [isSending, setIsSending] = useState(false);
  
  // NEW: Control the mobile cart popup
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const authRes = await fetch('/api/auth/me');
      if (authRes.ok) {
          const user = await authRes.json();
          setCurrentUser(user);
      } else {
          router.push('/');
      }

      const [menuRes, tablesRes] = await Promise.all([
          fetch('/api/menu'),
          fetch('/api/tables'),
      ]);

      const menuData = await menuRes.json();
      const tablesData = await tablesRes.json();
      
      const uniqueCats = Array.from(new Set(menuData.items.map((i: any) => i.category)));
      setCategories(uniqueCats.map(c => ({ id: c, name: c })));

      setMenu(menuData.items || []);
      setTables(tablesData.tables || []);
    };
    init();
  }, []);

  const handleTableSelect = (tableId: string) => {
      const table = tables.find(t => t._id === tableId);
      if (!table) return;

      if (table.status === 'occupied' && currentUser) {
          if (table.currentWaiterId && table.currentWaiterId !== currentUser.userId) {
              alert(`⛔ Access Denied!\nThis table is served by another waiter.`);
              return;
          }
      }
      setSelectedTableId(tableId);
  };

  const handleSendOrder = async () => {
    if (!selectedTableId || cart.size === 0) return;
    
    const table = tables.find(t => t._id === selectedTableId);
    if (table?.status === 'available' && !customerName) { 
        alert('Please enter Customer Name'); return; 
    }

    setIsSending(true);
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNumber: table.table_number,
          customerName, 
          customerEmail,
          items: Array.from(cart.values())
        }),
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Failed');

      setCart(new Map());
      setSelectedTableId(null);
      setCustomerName('');
      setCustomerEmail('');
      setIsCartOpen(false); // Close modal on success
      setToastMessage(table.status === 'occupied' ? '✅ Order Updated!' : '✅ New Order Sent!');
      
      const tRes = await fetch('/api/tables');
      const tData = await tRes.json();
      setTables(tData.tables);

    } catch (e: any) { alert(e.message); } 
    finally { setIsSending(false); }
  };

  const filteredItems = selectedCategory
    ? menu.filter((item) => item.category === selectedCategory)
    : menu;

  const handleAddToCart = (item: any, quantity: number) => {
    const newCart = new Map(cart);
    const itemId = item._id || item.id;
    if (quantity === 0) newCart.delete(itemId);
    else newCart.set(itemId, { menuItemId: itemId, name: item.name, price: item.price, quantity });
    setCart(newCart);
    setToastMessage(`${item.name} added`);
  };

  // Stats for floating bar
  const totalItems = Array.from(cart.values()).reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = Array.from(cart.values()).reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-32 md:pb-20">
      
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}

      <header className="bg-white shadow p-4 flex justify-between sticky top-0 z-20">
        <div>
            <h1 className="font-bold text-xl">Waiter POS</h1>
            <p className="text-xs text-gray-500">Logged in as: {currentUser?.name}</p>
        </div>
        <button onClick={() => { document.cookie = 'sessionId=; path=/;'; router.push('/'); }} className="text-red-600 font-bold">Logout</button>
      </header>

      <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          
          <div className="bg-white p-4 rounded-lg shadow-sm border space-y-3">
             <h3 className="font-bold text-gray-700">Customer Details</h3>
             <div className="grid grid-cols-2 gap-4">
                <input 
                    placeholder="Name" 
                    className="border rounded px-3 py-2 w-full"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                />
                <input 
                    placeholder="Email" 
                    className="border rounded px-3 py-2 w-full"
                    value={customerEmail}
                    onChange={e => setCustomerEmail(e.target.value)}
                />
             </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Select Table</h2>
            <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                {tables.map((table) => {
                    const isOccupiedByOther = table.status === 'occupied' && currentUser && table.currentWaiterId !== currentUser.userId;
                    const isOccupiedByMe = table.status === 'occupied' && currentUser && table.currentWaiterId === currentUser.userId;
                    
                    return (
                        <button
                            key={table._id}
                            onClick={() => handleTableSelect(table._id)}
                            className={`p-2 rounded-lg font-bold text-sm min-h-[80px] flex flex-col items-center justify-center relative
                                ${selectedTableId === table._id ? 'bg-orange-600 text-white shadow-lg scale-105' : 
                                  isOccupiedByMe ? 'bg-blue-100 text-blue-900 border-2 border-blue-500' :
                                  isOccupiedByOther ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 
                                  'bg-green-100 text-green-900 hover:bg-green-200'}
                            `}
                        >
                            <span>{table.name || `T-${table.table_number}`}</span>
                            {isOccupiedByOther && <Lock size={12} className="mt-1" />}
                            {isOccupiedByMe && <span className="text-[10px] mt-1">My Order</span>}
                        </button>
                    )
                })}
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
             <button onClick={() => setSelectedCategory(null)} className={`px-4 py-2 rounded-full whitespace-nowrap ${!selectedCategory ? 'bg-black text-white' : 'bg-white border'}`}>All</button>
             {categories.map(c => (
                 <button key={c.id} onClick={() => setSelectedCategory(c.id)} className={`px-4 py-2 rounded-full whitespace-nowrap ${selectedCategory === c.id ? 'bg-black text-white' : 'bg-white border'}`}>{c.name}</button>
             ))}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map(item => {
                const itemInCart = cart.get(item._id || item.id);
                const quantity = itemInCart?.quantity || 0;

                return (
                <div key={item._id} className={`bg-white rounded-lg shadow overflow-hidden border transition-all ${quantity > 0 ? 'border-orange-500 ring-1 ring-orange-500' : 'border-gray-200'}`}>
                    <div className="h-32 bg-gray-200 relative">
                        {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
                        {quantity > 0 && (
                            <div className="absolute top-2 right-2 bg-orange-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-md">
                                {quantity}
                            </div>
                        )}
                    </div>
                    <div className="p-3">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-sm line-clamp-1">{item.name}</h3>
                            <span className="text-orange-600 font-bold">₹{item.price}</span>
                        </div>
                        
                        <button 
                            onClick={() => handleAddToCart(item, quantity + 1)} 
                            className="w-full bg-gray-100 hover:bg-orange-100 text-gray-800 hover:text-orange-700 py-2 rounded-md text-sm font-bold transition-colors active:scale-95"
                        >
                            {quantity > 0 ? 'Add Another +' : 'Add to Order'}
                        </button>
                    </div>
                </div>
            )})}
          </div>
        </div>

        {/* Order Summary (Desktop Side / Mobile Modal) */}
        <div className="md:sticky md:top-24 h-fit">
           <OrderSummary 
                items={Array.from(cart.values())} 
                selectedTableNumber={tables.find(t => t._id === selectedTableId)?.table_number}
                onRemoveItem={(id) => { const n = new Map(cart); n.delete(id); setCart(n); }}
                onSendOrder={handleSendOrder}
                isLoading={isSending}
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
           />
        </div>
      </div>

      {/* Floating Bar (Opens Modal) */}
      {cart.size > 0 && !isCartOpen && (
        <div className="fixed bottom-4 left-4 right-4 md:hidden z-40 animate-in slide-in-from-bottom-2 fade-in">
            <div className="bg-black text-white p-4 rounded-xl shadow-2xl flex items-center justify-between cursor-pointer" onClick={() => setIsCartOpen(true)}>
                <div className="flex flex-col">
                    <span className="text-xs text-gray-400 font-medium">{totalItems} Items Added</span>
                    <span className="text-lg font-bold">₹{totalPrice.toFixed(0)}</span>
                </div>
                
                <button className="bg-orange-600 text-white px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg">
                    View Cart <ArrowUp size={16} />
                </button>
            </div>
        </div>
      )}

    </div>
  );
}