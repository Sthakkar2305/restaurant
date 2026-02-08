# Restaurant POS System - Testing Guide

## Quick Start Testing

### 1. Login

Access the application at `http://localhost:3000`

**Demo Credentials:**
```
Email: demo@restaurant.com
Password: password123
```

**Select Role:**
- **Waiter** - Access menu ordering interface
- **Admin** - Access order management dashboard

---

## Testing Waiter Interface

### 1. Select a Table
- See visual table grid (Tables 1-20)
- Green tables are available
- Click any table to select it
- Selected table will highlight in orange

### 2. Browse Menu
- Use category tabs to filter items:
  - All Items
  - Starters
  - Main Course
  - Bread
  - Drinks
  - Desserts

### 3. Add Items to Order
- Click the **+** button to increase quantity
- Click the **-** button to decrease quantity
- Item automatically appears in Order Summary

### 4. View Order Summary
- Live total calculation:
  - Subtotal
  - Tax (5%)
  - Service Charge (10%)
  - Grand Total
- Remove items with trash icon
- Table number displayed at top

### 5. Send Order
- Click **Send Order** button (green)
- Button disabled if no table selected or no items
- Order sent to backend and database

---

## Testing Admin Dashboard

### 1. View Dashboard
- See real-time order stats:
  - Pending orders (yellow)
  - Preparing orders (blue)
  - Served orders (green)
  - Paid orders (purple)
  - Total revenue

### 2. Filter Orders
- **All Orders** - See all orders
- **Pending** - New orders not started
- **Preparing** - Being made in kitchen
- **Served** - Ready for delivery
- **Paid** - Completed orders

### 3. Update Order Status
- Click dropdown on any order card
- Select new status:
  - Pending
  - Preparing
  - Served
  - Paid
  - Cancelled

### 4. Auto-Refresh
- Orders refresh automatically every 5 seconds
- Click refresh button to force update
- Last updated timestamp shown

---

## Testing Billing & Checkout

### 1. Create Test Order (from Waiter Interface)
1. Select table
2. Add items to cart
3. Click "Send Order"
4. Order appears in admin dashboard

### 2. QR Code Generation (Manual Testing)
- QR code generated automatically for payment
- Encodes UPI string with amount
- Scannable with any UPI app:
  - Google Pay
  - WhatsApp Pay
  - PhonePe
  - Paytm

### 3. Stripe Test Payment
- Use Stripe test card: `4242 4242 4242 4242`
- Expiry: Any future date (e.g., 12/25)
- CVC: Any 3 digits (e.g., 123)
- Click "Pay with Card (Stripe)"
- Complete payment flow

### 4. Invoice Generation
- After successful payment
- Click "Download Invoice (PDF)"
- PDF contains:
  - Restaurant name & details
  - Invoice number
  - Date & time
  - Table number
  - All ordered items with prices
  - Tax and service charge breakdown
  - Grand total

---

## API Testing

### Test with cURL or Postman

#### 1. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@restaurant.com",
    "password": "password123"
  }'
```

#### 2. Get Menu
```bash
curl http://localhost:3000/api/menu
```

#### 3. Get Tables
```bash
curl http://localhost:3000/api/tables
```

#### 4. Create Order
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "tableId": "table-1",
    "items": [
      {
        "menuItemId": "item-1",
        "quantity": 2,
        "price": 350
      }
    ]
  }'
```

#### 5. Get Orders
```bash
curl http://localhost:3000/api/orders
```

#### 6. Update Order Status
```bash
curl -X PATCH http://localhost:3000/api/orders/order-id \
  -H "Content-Type: application/json" \
  -d '{
    "status": "preparing"
  }'
```

#### 7. Generate QR Code
```bash
curl -X POST http://localhost:3000/api/payment/qr-code \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order-id"
  }'
```

#### 8. Get Metrics
```bash
curl http://localhost:3000/api/metrics
```

---

## Performance Testing

### 1. Load Testing
- Create multiple orders simultaneously
- Monitor admin dashboard for real-time updates
- Check response times in browser DevTools

### 2. Database Query Performance
- Monitor Supabase query performance
- Check index usage in Supabase dashboard
- Verify RLS policies don't impact speed

### 3. Real-time Sync Testing
- Open admin dashboard in multiple tabs
- Create order in waiter interface
- Verify it appears in real-time on all admin tabs
- Update order status and see immediate sync

---

## Edge Cases & Error Handling

### 1. No Table Selected
- Order summary shows warning
- "Send Order" button disabled
- Alert if trying to submit

### 2. Session Expired
- Try accessing `/admin` or `/waiter` without login
- Should redirect to home page

### 3. Invalid Stripe Payment
- Use test card: `4000 0000 0000 0002` (declined)
- Should show payment error
- Order remains in "unpaid" status

### 4. QR Code Scanning
- Use mobile UPI app to scan
- Should open payment link with amount
- Can complete payment directly

### 5. PDF Download
- Invoice generates on server
- Download triggers automatically
- File saved as `invoice-{number}.pdf`

---

## Database Testing

### View Data in Supabase

1. Go to your Supabase project
2. Open SQL Editor
3. Query examples:

```sql
-- View all orders
SELECT * FROM orders ORDER BY created_at DESC;

-- View orders by status
SELECT * FROM orders WHERE status = 'pending';

-- View order items with details
SELECT oi.*, mi.name, mi.price
FROM order_items oi
JOIN menu_items mi ON mi.id = oi.menu_item_id
ORDER BY oi.created_at DESC;

-- View daily revenue
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_orders,
  SUM(total_amount) as revenue
FROM orders
WHERE status = 'paid'
GROUP BY DATE(created_at);

-- View waiter performance
SELECT 
  u.full_name,
  COUNT(o.id) as total_orders,
  SUM(o.total_amount) as total_revenue,
  COUNT(CASE WHEN o.status = 'paid' THEN 1 END) as completed_orders
FROM orders o
JOIN users u ON u.id = o.waiter_id
GROUP BY u.id, u.full_name;
```

---

## Browser DevTools Testing

### Console Testing
- Monitor `[v0]` debug logs
- Check for real-time sync messages
- Verify API calls in Network tab

### Network Tab
- Monitor API requests/responses
- Check for slow endpoints
- Verify session cookies are set

### Application Tab
- View session cookie contents
- Check localStorage/sessionStorage if needed

---

## Mobile/Tablet Testing

### 1. Responsive Design
- Open in mobile browser (Chrome DevTools)
- Test portrait and landscape
- Verify touch interactions work
- Check menu grid responsive layout

### 2. Touch Interactions
- Tap buttons smoothly
- Drag-and-drop not needed (button-based)
- No keyboard input required
- All taps should be large touch targets

### 3. Performance on Mobile
- Test on slower connections (throttle in DevTools)
- Verify images load properly
- Check form responsiveness

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Unauthorized" error | Check cookies are enabled, try logging in again |
| Orders not appearing | Refresh admin page, check Supabase connection |
| QR code not generating | Verify NEXT_PUBLIC_UPI_ID env var is set |
| Stripe test cards fail | Use correct test card numbers from Stripe docs |
| Session expires too quickly | Extend maxAge in auth/login/route.ts |
| Real-time updates slow | Check Supabase realtime status, falls back to polling |
| PDF not downloading | Check browser popup blocker, allow downloads |

---

## Production Testing Checklist

Before deploying to production:

- [ ] Test all APIs with production Supabase
- [ ] Test Stripe with live keys (TEST FIRST)
- [ ] Verify CORS configuration
- [ ] Test HTTPS/SSL certificate
- [ ] Monitor error logs
- [ ] Load test with multiple concurrent users
- [ ] Test database backups work
- [ ] Verify email notifications (if added)
- [ ] Test on multiple browsers (Chrome, Safari, Firefox)
- [ ] Test on mobile devices
- [ ] Verify error pages work
- [ ] Check security headers

---

## Next Steps

After testing successfully:
1. Deploy to Vercel
2. Update production environment variables
3. Test again in production
4. Monitor real-time logs
5. Setup monitoring/alerting
