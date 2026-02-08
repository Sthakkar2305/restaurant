# Restaurant Waiter Ordering System - MongoDB Edition

A production-ready, tablet-friendly restaurant POS system built with **Next.js 16**, **MongoDB Atlas**, and **Stripe**. Features real-time order management, tap-based menu selection, QR code payments, and automatic PDF invoices.

## Overview

This system eliminates manual input for waiters, enabling 100% touch-based ordering on tablets or mobile devices. Orders sync to an admin dashboard in real-time via intelligent MongoDB polling where managers can track preparation, update status, and generate invoices.

**Quick Start:** Access at `http://localhost:3000` with demo credentials (see setup guide)

## Key Features

### Waiter Interface (`/waiter`)
- ✅ **No Keyboards** - Pure button/tap-based interaction
- ✅ **Visual Table Selection** - Touch-friendly grid layout
- ✅ **Menu Browsing** - Filter by category (Starters, Main, Drinks, etc.)
- ✅ **Quantity Control** - + / - buttons for item selection
- ✅ **Live Order Summary** - Real-time totals with tax & service charge
- ✅ **One-Click Submit** - Send order instantly to kitchen

### Admin Dashboard (`/admin`)
- ✅ **Real-time Sync** - Orders appear instantly using Supabase real-time
- ✅ **Order Filtering** - View by status (Pending, Preparing, Served, Paid)
- ✅ **Status Management** - Update order state from dropdown
- ✅ **Live Metrics** - Total orders, revenue, completion rates
- ✅ **Auto-Refresh** - Polls every 5 seconds with real-time backup

### Billing & Payments (`/checkout`)
- ✅ **Auto Calculation** - Subtotal + 5% Tax + 10% Service Charge
- ✅ **QR Code Payments** - UPI-compatible for all major payment apps
- ✅ **Stripe Integration** - Card payments with full checkout flow
- ✅ **PDF Invoices** - Professional invoices with restaurant details
- ✅ **Payment Tracking** - Order marked as "paid" in database

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript |
| **Styling** | Tailwind CSS v4, Shadcn UI |
| **Database** | MongoDB Atlas (Cloud) |
| **Real-time** | Polling-based sync (3-5 second intervals) |
| **Payments** | Stripe Checkout + UPI QR codes |
| **Utilities** | QRCode library, jsPDF, Lucide icons |
| **Auth** | Session-based with HTTP-only cookies, bcrypt hashing |
| **Hosting** | Vercel or any Node.js compatible host |

## Project Structure

```
├── app/
│   ├── page.tsx                 # Login page
│   ├── waiter/page.tsx          # Waiter interface
│   ├── admin/page.tsx           # Admin dashboard
│   ├── checkout/page.tsx        # Billing & payment
│   ├── payment/success|cancelled/   # Payment callbacks
│   └── api/                     # RESTful APIs
│       ├── auth/login|logout    # Authentication
│       ├── menu                 # Menu items
│       ├── orders               # Order CRUD
│       ├── tables               # Table management
│       ├── payment/             # Stripe & QR codes
│       ├── invoice/             # PDF generation
│       └── metrics              # Admin analytics
├── components/
│   ├── waiter/                  # Waiter UI components
│   ├── admin/                   # Admin dashboard components
│   └── checkout/                # Billing components
├── hooks/
│   ├── useRealtimeOrders.ts     # Real-time sync hook
│   └── use-mobile.tsx           # Mobile detection
├── lib/
│   ├── api-helpers.ts           # API utilities
│   ├── real-time-sync.ts        # Supabase subscriptions
│   └── utils.ts                 # Tailwind merge utilities
├── scripts/
│   ├── init-database.sql        # Database schema
│   └── seed-data.sql            # Demo data
└── public/                      # Static assets
```

## Database Schema (MongoDB Collections)

### Core Collections
- **users** - Waiters and admin accounts with role-based access
- **menu_items** - Individual dishes with prices and categories
- **tables** - Physical table inventory with capacity and status
- **orders** - Customer orders with line items and totals
- **payments** - Stripe sessions and UPI QR codes (TTL: 24 hours)
- **invoices** - Generated PDF invoice records
- **sessions** - User session management (TTL: 24 hours)

See `/scripts/init-mongodb.js` and `/MONGODB_SETUP.md` for full schema and setup.

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier available)
- Stripe account (test mode works)

### Installation

1. **Clone & Install**
```bash
git clone <repo>
cd restaurant-pos
npm install
```

2. **Setup MongoDB Atlas**
   - Create account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
   - Create a free cluster
   - Get your connection string
   - Whitelist your IP address

3. **Setup Environment**
```bash
cp .env.example .env.local
# Add MongoDB URI and Stripe keys
```

4. **Initialize Database**
```bash
node scripts/init-mongodb.js
node scripts/seed-mongodb.js
```

5. **Start Development Server**
```bash
npm run dev
# Visit http://localhost:3000
```

6. **Login with Demo Credentials**
- Email: `waiter@restaurant.com` or `admin@restaurant.com`
- Password: `password123`
- Role: Waiter or Admin

For detailed setup, see `/MONGODB_SETUP.md`

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Menu & Tables
- `GET /api/menu` - Fetch all items & categories
- `GET /api/tables` - Fetch restaurant tables
- `PUT /api/tables/{id}` - Update table status

### Orders
- `GET /api/orders` - Fetch orders (role-filtered)
- `POST /api/orders` - Create new order
- `GET /api/orders/{id}` - Get order details
- `PATCH /api/orders/{id}` - Update order status
- `DELETE /api/orders/{id}` - Cancel order

### Payments
- `POST /api/payment/checkout` - Create Stripe session
- `POST /api/payment/qr-code` - Generate UPI QR code

### Admin
- `GET /api/metrics` - Daily analytics & KPIs
- `POST /api/invoice/generate` - Create PDF invoice

## Real-Time Features

The system uses **intelligent polling-based real-time updates**:

1. **Admin Dashboard** (3-second intervals)
   - Polls for new/updated orders
   - Instant status changes
   - Live revenue metrics

2. **Order Details** (5-second intervals)
   - Tracks individual order updates
   - Configurable poll intervals
   - Fallback to manual refresh

3. **Configurable Polling**
   - Adjust intervals based on needs
   - Lower = more responsive, higher server load
   - Higher = less responsive, lower server load

MongoDB doesn't have native WebSockets like Supabase, but polling provides reliable real-time sync without added complexity.

## Customization

### Update Pricing Rules
Edit `/lib/api-helpers.ts`:
```typescript
export function calculateTotals(subtotal: number) {
  const tax = subtotal * 0.05;           // 5% tax
  const serviceCharge = subtotal * 0.1;  // 10% service charge
  // ...
}
```

### Add Menu Items
Insert into MongoDB via MongoDB Atlas UI or scripts:
```javascript
db.menu_items.insertOne({
  name: "New Dish",
  description: "Description",
  price: 299,
  category: "main_course",
  image: "url",
  available: true,
  createdAt: new Date()
})
```

### Adjust Polling Intervals
In React components:
```typescript
useRealtimeOrders(callback, 2000);  // Poll every 2 seconds
useRealtimeTables(callback, 5000);  // Poll tables every 5 seconds
```

### Change UPI ID
Update `NEXT_PUBLIC_UPI_ID` in `.env.local`

### Modify Invoice Layout
Edit `/app/api/invoice/generate/route.ts` (jsPDF configuration)

## Deployment

### Deploy to Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

1. Connect GitHub repository
2. Add environment variables in Vercel dashboard
3. Auto-deploy on push to main branch

### Production Checklist
- [ ] Use Stripe live keys (not test)
- [ ] Enable HTTPS
- [ ] Setup database backups
- [ ] Configure CORS
- [ ] Monitor error logs
- [ ] Setup uptime monitoring
- [ ] Enable rate limiting

## Security

### Implemented
- ✅ Session-based authentication with HTTP-only cookies
- ✅ Server-side password hashing (bcrypt)
- ✅ Role-based access control (RBAC)
- ✅ CORS protection
- ✅ Input validation on APIs
- ✅ Environment variable protection

### Recommended for Production
- [ ] Add Row-Level Security (RLS) in Supabase
- [ ] Implement 2FA for admin accounts
- [ ] Enable rate limiting on auth endpoints
- [ ] Setup audit logging for sensitive operations
- [ ] Use HTTPS everywhere
- [ ] Regular security audits

## Performance

- **Menu Caching** - Cached in component state
- **Server-side PDF** - Prevents client-side manipulation
- **QR Code On-demand** - Generated and cached in DB
- **Database Indexes** - Optimized query performance
- **Auto-refresh 5s** - Configurable polling interval

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "MONGODB_URI is not defined" | Check .env.local has MongoDB connection string |
| Connection timeout | Verify MongoDB cluster is running and IP whitelist includes your IP |
| Orders not syncing | Check network tab, verify polling intervals, check browser console |
| QR code fails | Ensure `NEXT_PUBLIC_UPI_ID` is set correctly |
| Stripe payment error | Verify keys are correct and not swapped, check Stripe dashboard |
| Login fails | Run seed script to create demo user, check MongoDB connection |
| PDF download blocked | Check browser popup blocker settings |

For more help, see:
- `/MONGODB_SETUP.md` - Detailed MongoDB setup guide
- `/TESTING_GUIDE.md` - Testing procedures
- `/QUICK_START.md` - Quick reference

## Features Roadmap

Potential future enhancements:
- Multi-language support
- Inventory management
- Kitchen display system (KDS)
- Customer feedback system
- Loyalty programs
- Analytics & reporting
- Table reservations
- Delivery integration
- Staff time tracking

## License

MIT License - Feel free to use for your restaurant business

## Support

For questions or issues:
1. Check `/SETUP_GUIDE.md` for setup help
2. Review `/TESTING_GUIDE.md` for testing steps
3. Inspect console logs for `[v0]` debug messages
4. Check Supabase dashboard for database issues

## Credits

Built with:
- Next.js 16 - React framework
- MongoDB Atlas - Cloud database
- Stripe - Payment processing
- Tailwind CSS - Styling
- Shadcn UI - Component library
- Lucide Icons - Icon set
- jsPDF & QRCode - Invoice & QR generation

---

**Ready to deploy?**
1. Follow `/MONGODB_SETUP.md` for production MongoDB configuration
2. Set environment variables in Vercel dashboard
3. Deploy to Vercel or any Node.js host

**Migration Note:** This is a complete rewrite from PostgreSQL/Supabase to MongoDB. All functionality is preserved with polling-based real-time updates instead of native WebSocket subscriptions.
