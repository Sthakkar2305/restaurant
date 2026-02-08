# Restaurant Waiter Ordering System - Setup Guide

## Overview

This is a production-ready restaurant ordering system built with Next.js, Supabase, and Stripe. It features a tablet-friendly waiter interface with drag-and-drop ordering, a real-time admin dashboard, and automatic billing with QR codes and PDF invoices.

## System Architecture

### Frontend
- **Waiter Interface** (`/app/waiter`) - Drag-and-drop menu selection, table booking, order summary
- **Admin Dashboard** (`/app/admin`) - Real-time order tracking, status management, revenue analytics
- **Checkout** (`/app/checkout`) - Billing summary, QR code payment, Stripe integration
- **Authentication** (`/app`) - Role-based login for waiters and admins

### Backend
- **API Routes** - RESTful endpoints for orders, menu, payments, and invoices
- **Supabase** - PostgreSQL database with real-time subscriptions
- **Stripe** - Payment processing
- **QRCode Library** - UPI payment QR generation
- **jsPDF** - PDF invoice generation

## Prerequisites

1. Node.js 18+ and npm
2. Supabase account
3. Stripe account (for payment processing)
4. Git

## Step 1: Setup Environment Variables

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

### Supabase Setup
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy your project URL and keys from Settings → API
3. Add to `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

### Stripe Setup
1. Go to [stripe.com](https://stripe.com) and create an account
2. Get your API keys from Settings → Developers → API Keys
3. Add to `.env.local`:
   ```
   STRIPE_SECRET_KEY=sk_live_xxxxx
   STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
   ```

### UPI Configuration
Update your UPI ID for QR code payments:
```
NEXT_PUBLIC_UPI_ID=yourupi@bank
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Step 2: Initialize Database

### Option A: Using Supabase Dashboard
1. Go to your Supabase project's SQL Editor
2. Run the SQL scripts in this order:
   - `/scripts/init-database.sql` - Creates schema
   - `/scripts/seed-data.sql` - Adds demo data

### Option B: Using CLI
```bash
# First run the database migration
psql -U postgres -h db.your-project.supabase.co -d postgres -f scripts/init-database.sql

# Then seed demo data
psql -U postgres -h db.your-project.supabase.co -d postgres -f scripts/seed-data.sql
```

## Step 3: Install Dependencies

```bash
npm install
```

The following key packages are pre-installed:
- `@supabase/supabase-js` - Database and real-time sync
- `stripe` - Payment processing
- `qrcode` - QR code generation
- `jspdf` - PDF generation
- `bcryptjs` - Password hashing
- `lucide-react` - Icons

## Step 4: Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to start using the app.

### Demo Credentials
- **Email**: demo@restaurant.com
- **Password**: password123
- **Role Options**: Waiter or Admin

## Features

### Waiter Interface (`/waiter`)
✅ **No Manual Input** - 100% button/tap-based ordering
- Select table from visual grid
- Browse menu by category
- Add items using + / - buttons
- View live order summary with live totals
- One-click order submission
- Real-time order sync

### Admin Dashboard (`/admin`)
✅ **Real-time Order Tracking**
- View all incoming orders
- Filter by status (Pending, Preparing, Served, Paid)
- Update order status
- View live revenue metrics
- Auto-refresh every 5 seconds

### Billing & Payment (`/checkout`)
✅ **Complete Checkout Flow**
- Automatic bill calculation (Subtotal + 5% Tax + 10% Service Charge)
- QR code for UPI payment scanning
- Stripe card payment integration
- PDF invoice download
- Professional invoice with restaurant details

### API Endpoints

#### Authentication
- `POST /api/auth/login` - User login with email/password
- Returns session cookie with role-based access

#### Menu
- `GET /api/menu` - Fetch all categories and available items

#### Orders
- `GET /api/orders` - Fetch orders (filtered by role)
- `POST /api/orders` - Create new order with items

#### Payments
- `POST /api/payment/checkout` - Create Stripe checkout session
- `POST /api/payment/qr-code` - Generate UPI payment QR code
- `POST /api/invoice/generate` - Generate and download PDF invoice

## Database Schema

### Tables
- **users** - Waiters and admins with role-based access
- **menu_categories** - Food categories (Starters, Main Course, etc.)
- **menu_items** - Individual menu items with prices
- **restaurant_tables** - Physical tables in the restaurant
- **orders** - Customer orders with totals and payment info
- **order_items** - Individual items in an order
- **invoices** - Generated invoices with PDF storage

## Deployment

### Deploy to Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

1. Connect your GitHub repository
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push

### Environment Variables for Production
- Use Stripe live keys (not test keys)
- Update `NEXT_PUBLIC_BASE_URL` to your production domain
- Keep `SUPABASE_SERVICE_ROLE_KEY` as a secret
- Enable CORS for your Stripe domain

## Real-Time Features (WebSocket)

The admin dashboard automatically syncs orders using Supabase real-time:

```typescript
// Auto-refresh polling fallback
const interval = setInterval(fetchOrders, 5000); // Every 5 seconds

// Optional: Setup Supabase real-time listeners
const channel = supabase
  .channel('orders')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'orders' },
    (payload) => console.log('New order:', payload)
  )
  .subscribe();
```

## Security Considerations

✅ **Implemented**
- Server-side password hashing with bcrypt
- HTTP-only session cookies
- CORS protection
- Environment variable protection for secrets
- Input validation on APIs

⚠️ **To Implement for Production**
- Add Row-Level Security (RLS) policies in Supabase
- Enable 2FA for admin accounts
- Add rate limiting on auth endpoints
- Implement audit logging for sensitive operations
- Use HTTPS everywhere
- Regular database backups

## Troubleshooting

### Issue: "Unauthorized" error on `/api/orders`
**Solution**: Check that session cookie is being set correctly after login. Verify browser cookies are enabled.

### Issue: QR code not generating
**Solution**: Ensure `NEXT_PUBLIC_UPI_ID` is set in environment variables. Check QRCode library logs.

### Issue: Stripe payment fails
**Solution**: Verify Stripe keys are correct and in live mode. Check webhook configuration if using live keys.

### Issue: Database connection failed
**Solution**: Check Supabase credentials in `.env.local`. Verify network access is allowed (Supabase firewall settings).

## Development Tips

### Adding a New Menu Item
1. Add to database: `INSERT INTO menu_items ...`
2. Items appear automatically in waiter interface

### Adding a New Table
1. Insert into `restaurant_tables` table
2. Waiter can immediately select it

### Customizing Pricing
- Tax percentage: Edit in `/app/api/orders/route.ts` (currently 5%)
- Service charge: Edit in `/app/api/orders/route.ts` (currently 10%)
- Update calculations in both API and UI components

### Monitoring Orders
- Admin dashboard polls every 5 seconds
- Can modify interval in `/app/admin/page.tsx`
- Consider Supabase real-time for lower latency

## Performance Optimization

- Menu is cached in component state - refresh with button if new items added
- Orders auto-refresh every 5 seconds on admin dashboard
- PDF generation happens server-side for security
- QR codes generated on-demand and cached in database

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Supabase documentation: https://supabase.com/docs
3. Review Stripe documentation: https://stripe.com/docs
4. Check Next.js documentation: https://nextjs.org/docs

## License

This project is built as a demo. Feel free to use and modify for your restaurant business.
