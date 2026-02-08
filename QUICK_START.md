# Quick Start Guide - Restaurant POS

## 5-Minute Setup

### 1. Clone & Install
```bash
npm install
cp .env.example .env.local
```

### 2. Add Environment Variables
Edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
NEXT_PUBLIC_UPI_ID=restaurant@upi
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 3. Setup Database
1. Open Supabase dashboard
2. Go to SQL Editor
3. Run `/scripts/init-database.sql`
4. Run `/scripts/seed-data.sql`

### 4. Run Development Server
```bash
npm run dev
```

### 5. Access Application
- Open `http://localhost:3000`
- Email: `demo@restaurant.com`
- Password: `password123`

---

## First Steps

### As a Waiter
1. Login with demo credentials
2. Select "Waiter" role
3. Pick a table (1-20)
4. Browse menu by category
5. Add items with + button
6. Submit order with "Send Order"

### As an Admin
1. Login with demo credentials
2. Select "Admin" role
3. View real-time orders
4. Click dropdown to change order status
5. See revenue metrics

### Testing Payment
1. Create order from waiter interface
2. Navigate to `/checkout?orderId={orderId}`
3. Scan QR code with UPI app (test mode)
4. Or use Stripe test card: `4242 4242 4242 4242`
5. Download invoice as PDF

---

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `/app/waiter` | Waiter interface for ordering |
| `/app/admin` | Admin dashboard for order tracking |
| `/app/api` | RESTful API endpoints |
| `/components` | React components (waiter, admin, checkout) |
| `/scripts` | Database schema and seed data |
| `/lib` | Utility functions and helpers |
| `/hooks` | Custom React hooks |

---

## Common Tasks

### Add a New Menu Item
```sql
INSERT INTO menu_items (name, description, price, category_id, is_available)
SELECT 'Item Name', 'Description', 350, id, true
FROM menu_categories WHERE name = 'Main Course';
```

### Update Tax/Service Charge
Edit `/lib/api-helpers.ts` - `calculateTotals()` function

### Change Poll Interval
Edit `/app/admin/page.tsx` - line with `setInterval(fetchOrders, 5000)`

### Customize Invoice
Edit `/app/api/invoice/generate/route.ts` - jsPDF configuration

---

## API Quick Reference

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/login` | User authentication |
| GET | `/api/menu` | Fetch all menu items |
| GET | `/api/tables` | Fetch restaurant tables |
| POST | `/api/orders` | Create new order |
| GET | `/api/orders` | Fetch all orders |
| PATCH | `/api/orders/{id}` | Update order status |
| POST | `/api/payment/qr-code` | Generate QR code |
| POST | `/api/payment/checkout` | Create Stripe session |
| POST | `/api/invoice/generate` | Generate PDF invoice |
| GET | `/api/metrics` | Get admin metrics |

---

## Testing Checklist

- [ ] Waiter can select table
- [ ] Waiter can add/remove items
- [ ] Order appears in admin dashboard
- [ ] Admin can change order status
- [ ] QR code appears on checkout page
- [ ] Stripe test payment works
- [ ] PDF invoice downloads
- [ ] Admin sees revenue metrics
- [ ] Real-time sync works
- [ ] Logout works

---

## Deployment to Vercel

```bash
vercel login
vercel
```

1. Connect your GitHub repository
2. Add environment variables in Vercel dashboard
3. Click Deploy
4. Live at your-app.vercel.app

---

## Troubleshooting

**Can't login?**
- Verify demo user exists: Check Supabase database
- Check password matches: `password123`

**Orders not appearing?**
- Refresh admin page
- Check Supabase connection in `.env.local`
- Verify real-time is enabled in Supabase

**QR code not showing?**
- Check `NEXT_PUBLIC_UPI_ID` is set in `.env.local`
- Open browser console for error messages

**Stripe payment fails?**
- Verify keys are correct and not swapped
- Use test card: `4242 4242 4242 4242`
- Check Stripe test/live mode

---

## Documentation

For detailed information, see:
- **Setup**: `/SETUP_GUIDE.md`
- **Testing**: `/TESTING_GUIDE.md`
- **Full README**: `/README.md`

---

## Next Steps

1. ✅ Setup environment & database
2. ✅ Test waiter interface
3. ✅ Test admin dashboard
4. ✅ Test payments & invoices
5. 🎯 Deploy to Vercel
6. 🎯 Add your restaurant details
7. 🎯 Customize menu & pricing
8. 🎯 Train staff on system
9. 🎯 Go live!

---

**Questions?** Check the documentation files or look for `[v0]` debug logs in browser console.
