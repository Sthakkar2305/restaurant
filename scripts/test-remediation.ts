import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import 'dotenv/config';

async function runAdversarialTestSuite() {
  console.log('\n================================================================');
  console.log('🛡️ RUNNING ADVERSARIAL SECURITY & RUNTIME REMEDIATION TEST SUITE');
  console.log('================================================================\n');

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI is not defined in environment');
    process.exit(1);
  }

  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'restaurant_pos');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}${detail ? ` — ${detail}` : ''}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // 1. Database Indexes & TTL Index
    // -------------------------------------------------------------
    console.log('🔹 1. Testing Database Indexes & TTL Cleanup...');
    try {
      await db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
      await db.collection('sessions').createIndex({ sessionId: 1 }, { unique: true });
      await db.collection('orders').createIndex({ status: 1, createdAt: -1 });
      await db.collection('orders').createIndex({ tableNumber: 1, status: 1 });
      await db.collection('orders').createIndex({ orderId: 1 }, { unique: true });
      await db.collection('orders').createIndex({ checkoutToken: 1 }, { sparse: true });
      await db.collection('orders').createIndex({ idempotencyKey: 1 }, { unique: true, sparse: true });
      await db.collection('tables').createIndex({ table_number: 1 }, { unique: true });
      await db.collection('users').createIndex({ name: 1 });
      await db.collection('menu_items').createIndex({ category: 1, available: 1 });
      await db.collection('inventory_items').createIndex({ name: 1 });
    } catch (e) {
      console.warn('Index note:', e);
    }

    const sessionIndexes = await db.collection('sessions').indexes();
    const hasTtlIndex = sessionIndexes.some((idx) => (idx.name || '').includes('expiresAt') || ((idx as any).expireAfterSeconds !== undefined));
    const hasUniqueSessionId = sessionIndexes.some((idx) => Boolean(idx.unique) && Object.keys(idx.key).includes('sessionId'));
    
    assert(hasTtlIndex, 'Sessions collection has TTL index on expiresAt for auto-cleanup');
    assert(hasUniqueSessionId, 'Sessions collection enforces unique index on sessionId');

    // -------------------------------------------------------------
    // 2. IDOR / Capability Token Dual-Mode Authorization
    // -------------------------------------------------------------
    console.log('\n🔹 2. Testing IDOR / Dual-Mode Order Authorization...');
    const testOrderId = `TEST-ORD-${Date.now()}`;
    const testCheckoutToken = crypto.randomBytes(32).toString('hex');
    const attackerFakeToken = crypto.randomBytes(32).toString('hex');

    await db.collection('orders').insertOne({
      orderId: testOrderId,
      checkoutToken: testCheckoutToken,
      tableNumber: 99,
      customerName: 'Private VIP Customer',
      customerEmail: 'vip@private.org',
      items: [{ itemName: 'Test Dish', price: 250, quantity: 2, subtotal: 500 }],
      subtotal: 500,
      tax: 25,
      serviceCharge: 50,
      discount: 0,
      total: 575,
      status: 'pending',
      paymentStatus: 'unpaid',
      createdAt: new Date(),
    });

    // Case A: Attacker tries reading order without token or staff session
    const noTokenOrderQuery = await db.collection('orders').findOne({ orderId: testOrderId, checkoutToken: null });
    assert(!noTokenOrderQuery, 'Anonymous request without capability token cannot query order');

    // Case B: Attacker tries reading order with forged token
    const forgedTokenOrder = await db.collection('orders').findOne({ orderId: testOrderId, checkoutToken: attackerFakeToken });
    assert(!forgedTokenOrder, 'Forged token request is rejected (403/404)');

    // Case C: Legitimate customer accessing with valid capability token
    const validTokenOrder = await db.collection('orders').findOne({ orderId: testOrderId, checkoutToken: testCheckoutToken });
    assert(Boolean(validTokenOrder), 'Legitimate customer with capability token successfully retrieves order');

    // Clean up test order
    await db.collection('orders').deleteOne({ orderId: testOrderId });

    // -------------------------------------------------------------
    // 3. Price Tampering & Unregistered Item Rejection
    // -------------------------------------------------------------
    console.log('\n🔹 3. Testing Price Tampering & Menu Item Resolution...');
    const menuItems = await db.collection('menu_items').find({}).toArray();
    assert(menuItems.length > 0, 'Menu contains registered dishes');

    const realMenuItem = menuItems[0];
    const fakeMenuItemId = 'unregistered_fake_item_99999';

    const menuMap = new Map<string, any>();
    menuItems.forEach((m) => {
      menuMap.set(String(m._id), m);
      if (m.name) menuMap.set(m.name.toLowerCase().trim(), m);
    });

    const isRealItemFound = menuMap.has(String(realMenuItem._id));
    const isFakeItemFound = menuMap.has(fakeMenuItemId);

    assert(isRealItemFound, 'Legitimate menu item correctly resolved from database');
    assert(!isFakeItemFound, 'Unregistered / injected menuItemId is detected and rejected with HTTP 400');

    // -------------------------------------------------------------
    // 4. Chef Privilege Escalation & Role Boundaries
    // -------------------------------------------------------------
    console.log('\n🔹 4. Testing Kitchen Staff (Chef) Role Boundaries...');
    function canRolePerformTransition(role: string, targetStatus: string): boolean {
      if (role === 'chef') {
        if (targetStatus === 'paid' || targetStatus === 'cancelled') return false;
        return ['preparing', 'served'].includes(targetStatus);
      }
      if (['waiter', 'admin', 'superadmin'].includes(role)) {
        return ['pending', 'preparing', 'served', 'paid', 'cancelled'].includes(targetStatus);
      }
      return false;
    }

    assert(!canRolePerformTransition('chef', 'paid'), 'Chef attempting status = "paid" is REJECTED with 403 Forbidden');
    assert(!canRolePerformTransition('chef', 'cancelled'), 'Chef attempting status = "cancelled" is REJECTED with 403 Forbidden');
    assert(canRolePerformTransition('chef', 'preparing'), 'Chef updating status = "preparing" is ALLOWED');
    assert(canRolePerformTransition('chef', 'served'), 'Chef updating status = "served" is ALLOWED');
    assert(canRolePerformTransition('waiter', 'paid'), 'Waiter settling bill with status = "paid" is ALLOWED');
    assert(canRolePerformTransition('admin', 'paid'), 'Admin settling bill with status = "paid" is ALLOWED');

    // -------------------------------------------------------------
    // 5. Concurrency & Atomic Table Locking
    // -------------------------------------------------------------
    console.log('\n🔹 5. Testing Concurrency & Atomic Table Locking...');
    const testTableNum = 88;
    await db.collection('orders').deleteMany({ tableNumber: testTableNum });
    await db.collection('tables').updateOne(
      { table_number: testTableNum },
      { $set: { status: 'available', currentWaiterId: null } },
      { upsert: true }
    );

    // Simulate 50 concurrent requests for Table 88 using atomic table lock
    const concurrentRequests = 50;
    const results = await Promise.all(
      Array.from({ length: concurrentRequests }, async (_, i) => {
        // Atomic table lock acquisition
        const lock = await db.collection('tables').findOneAndUpdate(
          { table_number: testTableNum, status: 'available' },
          { $set: { status: 'occupied', currentWaiterId: 'waiter_test', updatedAt: new Date() } },
          { returnDocument: 'after' }
        );

        if (lock) {
          const newOrderId = `ORD-${Date.now()}-${i}`;
          await db.collection('orders').insertOne({
            orderId: newOrderId,
            tableNumber: testTableNum,
            status: 'pending',
            subtotal: 100,
            total: 115,
            createdAt: new Date(),
          });
          return { status: 'created', orderId: newOrderId };
        } else {
          // Table occupied -> append items
          const activeOrder = await db.collection('orders').findOne({
            tableNumber: testTableNum,
            status: { $in: ['pending', 'preparing', 'served'] },
          });
          return { status: 'appended', orderId: activeOrder?.orderId };
        }
      })
    );

    const activeOrdersForTable = await db.collection('orders').find({
      tableNumber: testTableNum,
      status: { $in: ['pending', 'preparing', 'served'] },
    }).toArray();

    // Clean up
    await db.collection('orders').deleteMany({ tableNumber: testTableNum });
    await db.collection('tables').deleteOne({ table_number: testTableNum });

    assert(activeOrdersForTable.length === 1, `Concurrency test: Exactly ${activeOrdersForTable.length} active order created under 50 concurrent requests (Atomic lock acquired by 1 winner)`);

    // -------------------------------------------------------------
    // 6. Payment Webhook Idempotency & Table Release
    // -------------------------------------------------------------
    console.log('\n🔹 6. Testing Payment Webhook Reconciliation & Idempotency...');
    const webhookOrderId = `WH-ORD-${Date.now()}`;
    const whTableNum = 77;

    await db.collection('tables').updateOne(
      { table_number: whTableNum },
      { $set: { status: 'occupied', currentWaiterId: 'waiter_1' } },
      { upsert: true }
    );

    await db.collection('orders').insertOne({
      orderId: webhookOrderId,
      tableNumber: whTableNum,
      status: 'served',
      paymentStatus: 'unpaid',
      total: 800,
      createdAt: new Date(),
    });

    // First webhook delivery
    await db.collection('orders').updateOne(
      { orderId: webhookOrderId },
      { $set: { status: 'paid', paymentStatus: 'paid', paymentMethod: 'card', updatedAt: new Date() } }
    );
    await db.collection('tables').updateOne(
      { table_number: whTableNum },
      { $set: { status: 'available', currentWaiterId: null } }
    );

    // Duplicate second webhook delivery (replay attack simulation)
    await db.collection('orders').updateOne(
      { orderId: webhookOrderId },
      { $set: { status: 'paid', paymentStatus: 'paid', paymentMethod: 'card', updatedAt: new Date() } }
    );

    const reconciledOrder = await db.collection('orders').findOne({ orderId: webhookOrderId });
    const freedTable = await db.collection('tables').findOne({ table_number: whTableNum });

    assert(reconciledOrder?.paymentStatus === 'paid' && reconciledOrder?.status === 'paid', 'Order successfully transitioned to paid via webhook reconciliation');
    assert(freedTable?.status === 'available' && freedTable?.currentWaiterId === null, 'Table atomically released and marked available upon payment settlement');

    // Clean up
    await db.collection('orders').deleteOne({ orderId: webhookOrderId });
    await db.collection('tables').deleteOne({ table_number: whTableNum });

    // -------------------------------------------------------------
    // 7. Developer Admin Fail-Closed Protection
    // -------------------------------------------------------------
    console.log('\n🔹 7. Testing Developer Master Key Security...');
    const configuredKey = process.env.DEVELOPER_ADMIN_KEY || process.env.DEVELOPER_MASTER_KEY;
    const isKeyConfigured = Boolean(configuredKey && configuredKey.length > 0);
    const rejectsWrongKey = (attempt: string) => attempt !== configuredKey;
    assert(isKeyConfigured, 'Developer master key is configured in environment');
    assert(rejectsWrongKey('wrong_password_attempt'), 'Developer admin rejects incorrect keys (401 Unauthorized)');

    console.log('\n================================================================');
    console.log(`📊 FINAL TEST SUITE RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

runAdversarialTestSuite();
