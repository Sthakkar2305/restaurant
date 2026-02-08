# Deployment Checklist - MongoDB Edition

## Pre-Deployment Verification

### Code Quality
- [ ] All API endpoints tested locally
- [ ] No console errors in browser
- [ ] No server errors in terminal
- [ ] TypeScript compilation successful
- [ ] All imports resolved correctly
- [ ] Environment variables properly configured

### Database
- [ ] MongoDB Atlas cluster created
- [ ] Database user created with strong password
- [ ] IP whitelist configured
- [ ] Collections created via init script
- [ ] Demo data seeded
- [ ] Indexes verified in MongoDB Atlas

### Integrations
- [ ] Stripe account active
- [ ] Stripe API keys generated
- [ ] Test mode working before switching to live
- [ ] QR code generation tested
- [ ] PDF invoice generation tested

### Frontend
- [ ] Waiter interface tested on tablet
- [ ] Admin dashboard loads and updates
- [ ] Payment flow working end-to-end
- [ ] Responsive design on all screen sizes
- [ ] Mobile menu accessible on small screens
- [ ] No layout shifts or visual bugs

### Authentication
- [ ] Login functionality working
- [ ] Demo credentials verified
- [ ] Session persistence working
- [ ] Logout clears session
- [ ] Role-based access working
- [ ] Unauthorized access denied

---

## Environment Setup

### Development Environment
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=restaurant_pos
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_UPI_ID=restaurant@upi
NODE_ENV=development
```

### Production Environment
```env
MONGODB_URI=mongodb+srv://prod-user:strong-password@prod-cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=restaurant_pos_prod
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
NEXT_PUBLIC_UPI_ID=your-upi-id@bank
NODE_ENV=production
```

### Vercel Deployment Variables
- [ ] MONGODB_URI (from MongoDB Atlas)
- [ ] MONGODB_DB (set to database name)
- [ ] STRIPE_SECRET_KEY (stripe live key)
- [ ] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (stripe live key)
- [ ] NEXT_PUBLIC_BASE_URL (your domain)
- [ ] NEXT_PUBLIC_UPI_ID (your UPI ID)

---

## MongoDB Atlas Production Setup

### Cluster Configuration
- [ ] M2 or higher tier selected (not free tier for production)
- [ ] Production region selected (closest to users)
- [ ] Backup enabled in cluster settings
- [ ] Automated backups configured
- [ ] Monitoring enabled

### Security
- [ ] Strong database password set
- [ ] IP whitelist updated (production server IP)
- [ ] VPC peering configured (if self-hosted)
- [ ] TLS/SSL enabled
- [ ] Database user with minimal required permissions

### Maintenance
- [ ] Backup retention policy set
- [ ] Alert rules configured
- [ ] Performance monitoring enabled
- [ ] Connection pool size optimized

---

## Application Configuration

### Next.js Build
```bash
npm run build
# Verify: Build succeeds with no errors
# Verify: .next folder created
```

### Start Production Server
```bash
npm start
# Should run on port 3000 (or configured port)
# All endpoints should be accessible
```

### Environment Check
- [ ] `process.env.MONGODB_URI` is set
- [ ] `process.env.STRIPE_SECRET_KEY` is set
- [ ] No API keys logged to console
- [ ] Error messages don't expose sensitive data

---

## API Endpoint Verification

### Authentication
- [ ] `POST /api/auth/login` - Returns session cookie
- [ ] `POST /api/auth/logout` - Clears session
- [ ] Invalid credentials rejected
- [ ] Role separation working

### Orders
- [ ] `GET /api/orders` - Returns all orders
- [ ] `POST /api/orders` - Creates order
- [ ] `PATCH /api/orders/:id` - Updates order
- [ ] `DELETE /api/orders/:id` - Cancels order
- [ ] Waiter can only see their orders
- [ ] Admin sees all orders

### Payments
- [ ] `POST /api/payment/checkout` - Creates Stripe session
- [ ] `POST /api/payment/qr-code` - Generates QR code
- [ ] `POST /api/invoice/generate` - Creates PDF

### Metrics
- [ ] `GET /api/metrics` - Admin only endpoint
- [ ] Returns accurate metrics
- [ ] Unauthorized users get 403

---

## Stripe Production Setup

### Keys Configuration
- [ ] Switch from test keys to live keys
- [ ] Update environment variables
- [ ] Verify correct keys in use
- [ ] Old test keys removed

### Webhook Setup (Optional)
- [ ] Webhook endpoint configured in Stripe
- [ ] Verify webhook signature
- [ ] Handle payment events correctly

### Payment Testing
- [ ] Test Stripe checkout flow
- [ ] Verify payment succeeds
- [ ] Verify order marked as paid
- [ ] Invoice generated and downloadable

---

## Deployment Options

### Vercel (Recommended)
```bash
# Step 1: Push to GitHub
git add .
git commit -m "Production build"
git push origin main

# Step 2: Import to Vercel
# 1. Go to vercel.com
# 2. Click "Import Project"
# 3. Select GitHub repository
# 4. Add environment variables
# 5. Click "Deploy"

# After deployment
# [ ] Visit production URL
# [ ] Test all endpoints
# [ ] Verify environment variables
# [ ] Check error logs in Vercel dashboard
```

### Self-Hosted (Node.js)
```bash
# Build
npm run build

# Start
npm start
# Or use PM2 for process management:
# pm2 start npm --name restaurant-pos -- start
```

### Docker (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## Performance Optimization

### Database Optimization
- [ ] Indexes created on frequently queried fields
- [ ] Query plans reviewed
- [ ] Connection pool size optimized
- [ ] Slow queries identified and optimized

### Application Optimization
- [ ] Build size checked (npm run build)
- [ ] Minification working
- [ ] Image optimization enabled
- [ ] CSS optimized

### Monitoring
- [ ] Error logs configured
- [ ] Performance metrics tracked
- [ ] Uptime monitoring enabled
- [ ] Alert thresholds set

---

## Security Hardening

### Application Security
- [ ] HTTPS enforced (redirect HTTP to HTTPS)
- [ ] Security headers configured
- [ ] CORS properly configured
- [ ] Rate limiting enabled (optional)
- [ ] Input validation on all APIs
- [ ] SQL injection prevention (using MongoDB driver)

### Database Security
- [ ] Strong passwords enforced
- [ ] IP whitelist in place
- [ ] Database user has minimal permissions
- [ ] TLS/SSL connections enforced

### Secrets Management
- [ ] No secrets in code
- [ ] All secrets in environment variables
- [ ] Vercel secrets configured
- [ ] Stripe keys not exposed

---

## Testing Checklist

### Functional Testing
- [ ] Create order as waiter
- [ ] View order as admin
- [ ] Update order status
- [ ] Process payment
- [ ] Generate invoice
- [ ] Download PDF
- [ ] View analytics

### Edge Cases
- [ ] Network disconnection handling
- [ ] Session expiry behavior
- [ ] Invalid input rejection
- [ ] Concurrent orders
- [ ] High concurrent users

### Security Testing
- [ ] Unauthorized access denied
- [ ] Wrong role cannot access restricted endpoints
- [ ] SQL injection attempts blocked
- [ ] XSS attempts blocked

### Performance Testing
- [ ] Page load time < 3 seconds
- [ ] API response time < 500ms
- [ ] Database queries optimized
- [ ] No memory leaks

---

## Monitoring & Maintenance

### Production Monitoring
- [ ] Application error monitoring (Vercel logs or Sentry)
- [ ] Database performance monitoring
- [ ] API response time tracking
- [ ] Uptime monitoring
- [ ] Alert notifications configured

### Backup Strategy
- [ ] MongoDB backups enabled
- [ ] Backup retention: 30 days minimum
- [ ] Backup restoration tested
- [ ] Backup schedule: Daily

### Maintenance Windows
- [ ] Scheduled maintenance time defined
- [ ] Team notified of maintenance
- [ ] Database migration procedures documented
- [ ] Rollback procedures documented

---

## Post-Deployment

### Verification
- [ ] Production URL accessible
- [ ] All features working
- [ ] Database connected
- [ ] Stripe integration verified
- [ ] Emails sent successfully (if applicable)

### Monitoring
- [ ] Error logs checked (no critical errors)
- [ ] Performance metrics normal
- [ ] User reports none/minimal issues
- [ ] Analytics tracking working

### Documentation
- [ ] README updated with production URL
- [ ] Deployment instructions documented
- [ ] Team trained on new system
- [ ] Rollback procedures documented

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "MONGODB_URI is not set" | Add environment variable in Vercel settings |
| Connection timeout | Check MongoDB Atlas IP whitelist |
| Stripe key rejected | Verify using live keys (not test) |
| CORS error | Check domain in allowed origins |
| 404 errors | Verify API endpoints exist |
| Slow queries | Check database indexes in MongoDB Atlas |

---

## Rollback Procedure

If issues occur after deployment:

```bash
# Option 1: Redeploy previous version
git revert HEAD
git push origin main
# Wait for Vercel auto-deploy

# Option 2: Manual rollback via Vercel dashboard
# 1. Go to Vercel project
# 2. Deployments tab
# 3. Click "Promote" on previous stable version

# Option 3: Database rollback
# 1. MongoDB Atlas → Backups
# 2. Select backup from before issue
# 3. Restore to original cluster or new cluster
```

---

## Sign-Off Checklist

- [ ] All tests passed
- [ ] Code reviewed
- [ ] Security audit completed
- [ ] Performance acceptable
- [ ] Documentation updated
- [ ] Team briefed
- [ ] Monitoring enabled
- [ ] Rollback plan ready
- [ ] **Approved for Production**

---

## Contact & Support

**Deployment Issues:**
- Check Vercel logs: Dashboard → Deployments → Logs
- Check MongoDB Atlas: Cluster → Logs
- Check browser console: DevTools → Console
- Check browser network: DevTools → Network tab

**Emergency Contacts:**
- On-call Engineer: [Your contact]
- Team Slack: #restaurant-pos-support
- Support Email: support@yourcompany.com

---

**Last Updated**: January 23, 2026
**Version**: 1.0.0
**Status**: Ready for Production
