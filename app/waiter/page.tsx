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
      setToastMessage(table.status === 'occupied' ? '✅ Order Updated!' : '✅ New Order Sent to Kitchen!');
      
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
    if (quantity === 0) {
      newCart.delete(itemId);
    } else {
      const existing = newCart.get(itemId);
      newCart.set(itemId, {
        menuItemId: itemId,
        name: item.name,
        price: item.price,
        quantity,
        notes: existing?.notes || '',
      });
    }
    setCart(newCart);
    setToastMessage(`${item.name} added`);
  };

  const handleUpdateNotes = (menuItemId: string, notes: string) => {
    const newCart = new Map(cart);
    const existing = newCart.get(menuItemId);
    if (existing) {
      newCart.set(menuItemId, { ...existing, notes });
      setCart(newCart);
    }
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
        
        {/* Left Side: Tables & Menu */}
        <div className="md:col-span-2 space-y-6">
          <TableSelector 
            tables={tables} 
            selectedTableId={selectedTableId} 
            onSelectTable={handleTableSelect}
            currentUserId={currentUser?.userId} 
          />

          {selectedTableId && tables.find(t => t._id === selectedTableId)?.status === 'available' && (
              <div className="bg-white p-4 rounded-xl shadow-sm border border-orange-100 flex gap-4">
                  <input 
                      type="text" 
                      placeholder="Customer Name *" 
                      value={customerName} 
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="border p-2 rounded-lg flex-1 text-sm focus:outline-orange-500"
                  />
                  <input 
                      type="email" 
                      placeholder="Customer Email (Optional)" 
                      value={customerEmail} 
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="border p-2 rounded-lg flex-1 text-sm focus:outline-orange-500"
                  />
              </div>
          )}

          {/* Categories Horizontal Scroll */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition-colors ${
                selectedCategory === null
                  ? 'bg-orange-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border'
              }`}
            >
              All Items
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap capitalize transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-orange-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          {/* Menu Items Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {filteredItems.map((item) => {
              const itemId = item._id || item.id;
              const cartItem = cart.get(itemId);
              const quantity = cartItem?.quantity || 0;

              return (
                <div key={itemId} className="bg-white rounded-xl shadow-sm overflow-hidden border flex flex-col justify-between p-3">
                    <div>
                        <h3 className="font-bold text-sm text-gray-800 line-clamp-1">{item.name}</h3>
                        <p className="text-orange-600 font-bold text-sm mt-1">₹{item.price}</p>
                    </div>

                    <div className="mt-3">
                        <button 
                            onClick={() => handleAddToCart(item, quantity + 1)}
                            className={`w-full py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                quantity > 0 ? 'bg-orange-100 text-orange-700 border border-orange-300' : 'bg-orange-600 text-white hover:bg-orange-700'
                            }`}
                        >
                            {quantity > 0 ? `Added (${quantity}) +` : 'Add to Order'}
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
                onUpdateNotes={handleUpdateNotes}
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
                    <span className="text-lg font-bold">Rs. {totalPrice.toFixed(0)}</span>
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