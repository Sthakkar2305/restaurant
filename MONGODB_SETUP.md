# Restaurant Waiter Ordering System - MongoDB Setup Guide

## Overview

This is a production-ready restaurant ordering system built with **Next.js**, **MongoDB Atlas**, and **Stripe**. It features a tablet-friendly waiter interface with drag-and-drop ordering, a real-time admin dashboard with MongoDB polling, and automatic billing with QR codes and PDF invoices.

## System Architecture

### Frontend
- **Waiter Interface** (`/app/waiter`) - Tap-based menu selection, table booking, order summary
- **Admin Dashboard** (`/app/admin`) - Real-time order tracking, status management, revenue analytics
- **Checkout** (`/app/checkout`) - Billing summary, QR code payment, Stripe integration
- **Authentication** (`/app`) - Role-based login for waiters and admins

### Backend
- **MongoDB Atlas** - Cloud MongoDB database with automatic backups
- **RESTful APIs** - Node.js/Next.js route handlers
- **Real-time Sync** - Polling-based updates (3-5 second intervals)
- **Stripe** - Payment processing
- **QRCode Library** - UPI payment QR generation
- **jsPDF** - PDF invoice generation

## Prerequisites

1. Node.js 18+ and npm
2. MongoDB Atlas account (free tier available)
3. Stripe account (for payment processing)
4. Git

## Step 1: Setup MongoDB Atlas

### Create MongoDB Atlas Cluster

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up or log in to your account
3. Create a new project and cluster:
   - Click **Create** → **Build a Cluster**
   - Choose **FREE** tier
   - Select your preferred region (closest to your users)
   - Click **Create Deployment**

### Create Database User

1. In the **Security** section, click **Database Access**
2. Click **Add New Database User**
3. Create a user with username and password (or use auto-generated password)
4. Make sure **Built-in Role** is set to "Atlas Admin"
5. Click **Add User**

### Get Connection String

1. Click **Databases** in the left sidebar
2. Click **Connect** on your cluster
3. Choose **Drivers** → **Node.js**
4. Copy the connection string (keep it safe, it contains your password)

The connection string format should be:
```
mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
```

### Whitelist IP Address

1. In **Security** → **Network Access**
2. Click **Add IP Address**
3. For development: Click **Allow Access from Anywhere** (0.0.0.0/0)
4. For production: Add your server's IP address
5. Click **Confirm**

## Step 2: Setup Environment Variables

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

Add your MongoDB and Stripe credentials:

```env
# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=restaurant_pos

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# Application Configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_UPI_ID=restaurant@upi

# Node Environment
NODE_ENV=development
```

### Get Stripe Keys

1. Go to [stripe.com](https://stripe.com) and create an account
2. Navigate to **Developers** → **API Keys**
3. Copy your **Secret Key** and **Publishable Key**
4. Add them to `.env.local`

## Step 3: Initialize Database

### Install Dependencies

```bash
npm install
```

### Run Database Initialization Script

This script creates collections, indexes, and sets up TTL for session management:

```bash
node scripts/init-mongodb.js
```

You should see output like:
```
Connected to MongoDB
✓ Created collection: users
✓ Created collection: menu_items
✓ Created collection: tables
✓ Created collection: orders
✓ Created collection: payments
✓ Created collection: invoices
✓ Created collection: sessions
✓ Created indexes...
✅ Database initialization completed successfully!
```

### Seed Sample Data

Populate the database with demo menu items, users, and tables:

```bash
node scripts/seed-mongodb.js
```

Output:
```
Connected to MongoDB
Clearing existing data...
✓ Seeded users
✓ Seeded menu items
✓ Seeded tables
✅ Database seeding completed successfully!
```

## Step 4: Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to access the application.

## Step 5: Login with Demo Credentials

### Waiter Account
- Email: `waiter@restaurant.com`
- Password: `password123`
- Role: Waiter

### Admin Account
- Email: `admin@restaurant.com`
- Password: `password123`
- Role: Admin

## Database Schema

### Collections Overview

#### users
- Stores restaurant staff accounts (waiters, admins)
- Fields: email, passwordHash, name, role, createdAt, updatedAt
- Unique index on email

#### menu_items
- Restaurant menu with food items, prices, categories
- Fields: name, description, price, category, image, available, createdAt, updatedAt
- Index on category for quick filtering

#### tables
- Restaurant table inventory
- Fields: table_number, seating_capacity, status, createdAt, updatedAt
- Unique index on table_number

#### orders
- Customer orders with items and billing info
- Fields: orderId, tableNumber, waiterId, items, status, subtotal, tax, serviceCharge, total, paymentStatus, createdAt, updatedAt
- Indexes on orderId, tableNumber, status, createdAt

#### payments
- Stripe payment sessions and QR codes
- Fields: sessionId, orderId, amount, currency, status, stripeSessionId, qrCodeData, createdAt, expiresAt
- TTL index on expiresAt (auto-expires after 24 hours)

#### invoices
- Generated PDF invoices
- Fields: invoiceNumber, orderId, tableNumber, items, total, paymentMethod, restaurantName, createdAt, updatedAt
- Unique index on invoiceNumber

#### sessions
- User sessions for authentication
- Fields: sessionId, userId, userEmail, userRole, userName, expiresAt, createdAt
- TTL index on expiresAt (auto-expires after 24 hours)

## Real-time Sync

MongoDB doesn't have native WebSocket subscriptions like Supabase. This system uses **polling-based real-time updates**:

- Admin Dashboard: Polls every 3 seconds for new/updated orders
- Order Details: Polls every 5 seconds for status changes
- Tables: Polls every 10 seconds for availability

Polling intervals can be customized in component props or hooks.

### Polling Configuration

You can adjust polling intervals in React components:

```typescript
// Poll orders every 2 seconds
useRealtimeOrders(onOrdersUpdate, 2000);

// Poll specific order every 1 second
useRealtimeOrder(orderId, onOrderUpdate, 1000);

// Poll tables every 10 seconds
useRealtimeTables(onTablesUpdate, 10000);
```

Lower intervals = more responsive UI but higher server load
Higher intervals = less responsive but lower server load

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email, password, role
- `POST /api/auth/logout` - Logout and clear session

### Menu & Tables
- `GET /api/menu` - Get all menu items grouped by category
- `GET /api/tables` - Get all restaurant tables
- `PUT /api/tables/:id` - Update table status

### Orders
- `GET /api/orders` - Get orders (filtered by role)
- `POST /api/orders` - Create new order
- `GET /api/orders/:id` - Get order details
- `PATCH /api/orders/:id` - Update order status (admin only)
- `DELETE /api/orders/:id` - Cancel order (admin only)

### Payments & Invoices
- `POST /api/payment/checkout` - Create Stripe checkout session
- `POST /api/payment/qr-code` - Generate UPI QR code
- `POST /api/invoice/generate` - Generate PDF invoice

### Analytics
- `GET /api/metrics` - Get revenue and order metrics (admin only)

## Deployment

### Deploy to Vercel

1. Push your code to GitHub:
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. Connect to Vercel:
   - Go to [vercel.com](https://vercel.com)
   - Click **New Project**
   - Import your GitHub repository
   - Add environment variables
   - Click **Deploy**

3. Set Environment Variables in Vercel:
   - MONGODB_URI
   - MONGODB_DB
   - STRIPE_SECRET_KEY
   - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
   - NEXT_PUBLIC_BASE_URL (set to your Vercel domain)
   - NEXT_PUBLIC_UPI_ID

### MongoDB Atlas Whitelist

For production deployment:
1. Go to MongoDB Atlas → **Security** → **Network Access**
2. Add your Vercel deployment IP or domain
3. For flexible deployment, use allow from anywhere temporarily, then restrict once deployed

## Troubleshooting

### "MONGODB_URI is not defined"
- Check `.env.local` has MONGODB_URI set correctly
- Make sure environment variables are loaded: `npm run dev`

### "Connection timeout"
- Verify MongoDB Atlas cluster is running
- Check IP whitelist includes your current IP
- Test connection string in MongoDB Compass

### "Authentication failed"
- Verify database user credentials
- Check password doesn't have special characters that need URL encoding
- Reset password if needed in MongoDB Atlas dashboard

### Slow Polling Updates
- Reduce polling interval in hooks: `useRealtimeOrders(cb, 1000)`
- Optimize database indexes
- Monitor MongoDB Atlas performance metrics

### Orders Not Appearing
- Check network tab in browser DevTools
- Verify session cookie is set
- Check admin/waiter has correct role
- Clear browser cache and cookies

## Performance Tips

1. **Indexing**: Database indexes are created automatically by init scripts
2. **Caching**: Browser caches menu for 5 minutes
3. **Batch Updates**: Updates are batched per polling interval
4. **Connection Pooling**: MongoDB driver handles connection pooling automatically

## Security

1. **Password Hashing**: bcrypt with 10 salt rounds
2. **Session Management**: HTTP-only cookies, 24-hour expiration
3. **Role-based Access**: Waiters can't access admin endpoints
4. **Input Validation**: All inputs validated before database operations
5. **Environment Variables**: Sensitive keys stored in .env.local, never committed to git

## Support

For issues or questions:
1. Check `MONGODB_SETUP.md` and `TESTING_GUIDE.md`
2. Review MongoDB Atlas documentation
3. Check Stripe API documentation
4. Submit issues to the project repository
