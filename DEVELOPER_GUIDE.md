# Developer Quick Reference - MongoDB Edition

## Project Overview

Restaurant POS system: Waiter ordering interface → Admin dashboard → Payment processing → PDF invoices

**Tech**: Next.js 16 + MongoDB + Stripe + React 19

## Core Directories

```
/app
  ├── api/                    # RESTful endpoints
  ├── waiter/page.tsx         # Waiter interface
  ├── admin/page.tsx          # Admin dashboard
  ├── checkout/page.tsx       # Billing page
  └── payment/                # Payment callbacks

/components
  ├── waiter/                 # Waiter UI components
  ├── admin/                  # Admin UI components
  └── checkout/               # Billing UI components

/lib
  ├── mongodb.ts              # MongoDB connection
  ├── schemas.ts              # TypeScript types
  ├── real-time-sync.ts       # Polling logic
  └── api-helpers.ts          # Utilities

/hooks
  └── useRealtimeOrders.ts    # Real-time hook

/scripts
  ├── init-mongodb.js         # Database setup
  └── seed-mongodb.js         # Demo data
```

## Common Tasks

### Get Orders (Admin)
```typescript
const ordersCollection = await getCollection('orders');
const orders = await ordersCollection.find({ createdAt: { $gte: today } }).toArray();
```

### Create Order
```typescript
// POST /api/orders
const order: Order = {
  orderId: generateId(),
  tableNumber: 5,
  items: [{ menuItemId, itemName, price, quantity, subtotal }],
  total: subtotal + tax + serviceCharge,
  // ... other fields
};
await getCollection('orders').insertOne(order);
```

### Update Order Status
```typescript
// PATCH /api/orders/:id
await getCollection('orders').updateOne(
  { _id: new ObjectId(orderId) },
  { $set: { status: 'preparing', updatedAt: new Date() } }
);
```

### Subscribe to Real-time Orders
```typescript
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';

function MyComponent() {
  useRealtimeOrders((orders) => {
    console.log('Orders updated:', orders);
  }, 3000); // Poll every 3 seconds
}
```

## MongoDB Connection

```typescript
import { getCollection, getDatabase } from '@/lib/mongodb';

// Get specific collection
const orders = await getCollection('orders');

// Get full database
const db = await getDatabase();

// Query examples
const order = await orders.findOne({ orderId: 'ABC123' });
const allOrders = await orders.find({}).toArray();
const result = await orders.updateOne(query, { $set: data });
```

## Authentication

```typescript
// Login creates a session
const session = {
  sessionId: generateId(),
  userId: user._id.toString(),
  userEmail: user.email,
  userRole: user.role,
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
};

// Access session in API
async function getSessionUser(request: NextRequest) {
  const sessionId = request.cookies.get('sessionId')?.value;
  const sessionsCollection = await getCollection('sessions');
  return await sessionsCollection.findOne({ sessionId });
}

// Check authorization
if (session.userRole !== 'admin') {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
}
```

## Real-Time Updates

### Polling Flow
1. Component mounts
2. Call `/api/orders`
3. Compare with previous state
4. Detect changes (new, updated, deleted)
5. Callback triggered
6. Component re-renders
7. Repeat at interval

### Configure Polling
```typescript
// Fast polling (1 second)
useRealtimeOrders(callback, 1000);

// Default (3 seconds)
useRealtimeOrders(callback, 3000);

// Slow polling (10 seconds)
useRealtimeOrders(callback, 10000);
```

## API Patterns

### Request/Response
```typescript
export async function POST(request: NextRequest) {
  try {
    const { data } = await request.json();
    
    // Validation
    if (!data) {
      return NextResponse.json(
        { error: 'Missing data' },
        { status: 400 }
      );
    }
    
    // Process
    const result = await collection.insertOne(data);
    
    // Response
    return NextResponse.json({
      success: true,
      id: result.insertedId
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Error Handling
```typescript
// 400 - Bad Request (validation failed)
// 401 - Unauthorized (not logged in)
// 403 - Forbidden (insufficient permissions)
// 404 - Not Found (resource doesn't exist)
// 500 - Server Error (unexpected error)
```

## Component Patterns

### Data Fetching
```typescript
'use client';

import { useEffect, useState } from 'react';

export function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/orders')
      .then(r => r.json())
      .then(data => {
        setOrders(data.orders);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;
  return <div>{orders.length} orders</div>;
}
```

### Real-time Subscription
```typescript
'use client';

import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';

export function LiveOrders() {
  const [orders, setOrders] = useState([]);

  useRealtimeOrders(setOrders, 3000); // Poll every 3 seconds

  return <div>{orders.map(o => <OrderCard key={o._id} order={o} />)}</div>;
}
```

## Database Queries

### Find
```typescript
// Single document
const order = await orders.findOne({ orderId: 'ABC123' });

// Multiple with filter
const today = new Date();
today.setHours(0, 0, 0, 0);
const todayOrders = await orders.find({ 
  createdAt: { $gte: today } 
}).toArray();

// With sorting
const recent = await orders
  .find({})
  .sort({ createdAt: -1 })
  .limit(10)
  .toArray();
```

### Insert
```typescript
const result = await collection.insertOne({
  field1: 'value1',
  field2: 'value2',
  createdAt: new Date()
});

console.log(result.insertedId); // MongoDB _id
```

### Update
```typescript
// Single field
await collection.updateOne(
  { _id: new ObjectId(id) },
  { $set: { status: 'paid' } }
);

// Multiple fields
await collection.updateOne(
  { _id: new ObjectId(id) },
  { 
    $set: { 
      status: 'paid',
      updatedAt: new Date()
    }
  }
);

// Check if found
const result = await collection.updateOne(query, updates);
if (result.matchedCount === 0) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
```

### Delete
```typescript
await collection.updateOne(
  { _id: new ObjectId(id) },
  { $set: { status: 'cancelled' } }  // Soft delete
);

// Or hard delete
await collection.deleteOne({ _id: new ObjectId(id) });
```

## Stripe Integration

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Create checkout session
const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: [{
    price_data: {
      currency: 'inr',
      product_data: { name: 'Order #123' },
      unit_amount: 29999, // Amount in paise
    },
    quantity: 1,
  }],
  mode: 'payment',
  success_url: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${baseUrl}/payment/cancelled`,
  metadata: { orderId: 'ABC123' }
});

return { sessionId: session.id, url: session.url };
```

## Environment Variables

```env
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=restaurant_pos

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Application
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_UPI_ID=restaurant@upi
NODE_ENV=development
```

## Debugging

### Console Logs
```typescript
// Standard logging
console.log('[v0] User data:', userData);
console.log('[v0] API error:', error.message);

// Check in browser DevTools Console
// Check in server logs during npm run dev
```

### Network Debugging
1. Open DevTools → Network tab
2. Filter by XHR/Fetch
3. Check API responses
4. Verify status codes

### Database Debugging
1. MongoDB Atlas dashboard
2. Collections → View/Search documents
3. Verify data exists and structure is correct
4. Check indexes

## Performance Tips

1. **Add indexes** for frequently queried fields
2. **Limit polling intervals** to balance responsiveness vs load
3. **Cache menu items** (changes rarely)
4. **Batch updates** where possible
5. **Monitor database metrics** in MongoDB Atlas

## Security Checklist

- [x] Password hashing with bcrypt
- [x] HTTP-only session cookies
- [x] Role-based access control
- [x] Input validation on all APIs
- [x] Error handling (no sensitive data leaked)
- [x] Environment variables for secrets
- [x] CORS properly configured

## Deployment

### Local Development
```bash
npm run dev
# Visit http://localhost:3000
```

### Build for Production
```bash
npm run build
npm start
```

### Environment for Production
- NODE_ENV=production
- Use MongoDB Atlas cluster (not local)
- Use Stripe live keys
- Enable database backups
- Monitor performance

## Common Errors & Solutions

| Error | Solution |
|-------|----------|
| "MONGODB_URI not defined" | Add to .env.local |
| "Connection timeout" | Check MongoDB Atlas whitelist |
| "Unauthorized" | Check session cookie |
| "Order not found" | Verify order exists in DB |
| "Invalid Stripe key" | Check key format and ENV var |
| "CORS error" | Check API endpoint is correct |

## Getting Help

1. Check `/MONGODB_SETUP.md` for setup issues
2. Search MongoDB docs for query help
3. Check Stripe API docs for payment issues
4. Review Next.js docs for routing
5. Check browser console for client-side errors
6. Check terminal for server-side errors

---

**Happy coding!** 🚀
