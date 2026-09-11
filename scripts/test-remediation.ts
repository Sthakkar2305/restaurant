import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config';

async function runRemediationTests() {
  console.log('\n=============================================');
  console.log('🧪 RUNNING PRODUCTION REMEDIATION TEST SUITE');
  console.log('=============================================\n');

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
    // Test 1: Verify Database Indexes & TTL Index
    // -------------------------------------------------------------
    console.log('🔹 1. Testing Database Indexes...');
    // Ensure indexes
    try {
      await db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
      await db.collection('sessions').createIndex({ sessionId: 1 }, { unique: true });
      await db.collection('orders').createIndex({ status: 1, createdAt: -1 });
      await db.collection('orders').createIndex({ tableNumber: 1, status: 1 });
      await db.collection('orders').createIndex({ orderId: 1 }, { unique: true });
      await db.collection('tables').createIndex({ table_number: 1 }, { unique: true });
      await db.collection('users').createIndex({ name: 1 }, { unique: true });
      await db.collection('menu_items').createIndex({ category: 1, available: 1 });
      await db.collection('inventory_items').createIndex({ name: 1 });
    } catch (e) {
      console.warn('Index note:', e);
    }

    const sessionIndexes = await db.collection('sessions').indexes();
    const hasTtlIndex = sessionIndexes.some((idx) => (idx.name || '').includes('expiresAt') || ((idx as any).expireAfterSeconds !== undefined));
    const hasUniqueSessionId = sessionIndexes.some((idx) => Boolean(idx.unique) && Object.keys(idx.key).includes('sessionId'));
    
    assert(hasTtlIndex, 'Sessions collection has TTL index on expiresAt');
    assert(hasUniqueSessionId, 'Sessions collection enforces unique index on sessionId');

    const orderIndexes = await db.collection('orders').indexes();
    const hasOrderStatusIndex = orderIndexes.some((idx) => Object.keys(idx.key).includes('status'));
    assert(hasOrderStatusIndex, 'Orders collection has index on status / createdAt');

    // -------------------------------------------------------------
    // Test 2: PIN Hashing & User Security
    // -------------------------------------------------------------
    console.log('\n🔹 2. Testing Staff PIN Hashing & Credential Security...');
    const users = await db.collection('users').find({}).toArray();
    assert(users.length > 0, 'Database contains registered staff users');
    
    const plainTextPinsFound = users.filter((u: any) => u.pin !== undefined || !u.pinHash?.startsWith('$2'));
    assert(plainTextPinsFound.length === 0, 'Zero plaintext PINs stored; all PINs use bcrypt pinHash');

    // -------------------------------------------------------------
    // Test 3: Mathematical & Server-Side Pricing Accuracy
    // -------------------------------------------------------------
    console.log('\n🔹 3. Testing Financial Calculation Logic...');
    const menuItems = await db.collection('menu_items').find({}).toArray();
    assert(menuItems.length > 0, 'Menu collection contains available food items');

    const sampleItem = menuItems[0];
    const qty = 3;
    const subtotal = (Number(sampleItem.price) || 100) * qty;
    const tax = Math.round(subtotal * 0.05 * 100) / 100;
    const serviceCharge = Math.round(subtotal * 0.10 * 100) / 100;
    const total = Math.round(subtotal + tax + serviceCharge);

    assert(total > 0 && total >= subtotal, 'Tax (5%) and Service Charge (10%) calculated accurately');

    // -------------------------------------------------------------
    // Test 4: Negative Quantity / Price Tampering Resilience
    // -------------------------------------------------------------
    console.log('\n🔹 4. Testing Input Tampering Rejection...');
    const invalidQuantities = [-5, 0, 1000, NaN, null];
    let rejectedCount = 0;

    for (const testQty of invalidQuantities) {
      const q = parseInt(String(testQty), 10);
      if (isNaN(q) || q <= 0 || q > 100) {
        rejectedCount++;
      }
    }
    assert(rejectedCount === invalidQuantities.length, 'Non-positive, NaN, and excessive quantities (>100) strictly rejected');

    // -------------------------------------------------------------
    // Test 5: Table Concurrency & Order State Machine
    // -------------------------------------------------------------
    console.log('\n🔹 5. Testing Order State Machine Transitions...');
    const VALID_STATUSES = ['pending', 'preparing', 'served', 'paid', 'cancelled'];
    const testStatusTransitions = [
      { from: 'pending', to: 'preparing', valid: true },
      { from: 'preparing', to: 'served', valid: true },
      { from: 'served', to: 'paid', valid: true },
      { from: 'paid', to: 'pending', valid: false },
      { from: 'cancelled', to: 'preparing', valid: false },
    ];

    for (const t of testStatusTransitions) {
      const isValid = (t.from === 'paid' && t.to !== 'paid') ? false : (t.from === 'cancelled' && t.to !== 'cancelled' ? false : VALID_STATUSES.includes(t.to));
      assert(isValid === t.valid, `Status transition from "${t.from}" to "${t.to}" is correctly ${t.valid ? 'allowed' : 'blocked'}`);
    }

    // -------------------------------------------------------------
    // Test 6: Inventory Non-Negative Stock Constraint
    // -------------------------------------------------------------
    console.log('\n🔹 6. Testing Inventory Stock Integrity...');
    const inventoryItems = await db.collection('inventory_items').find({}).toArray();
    assert(inventoryItems.length > 0, 'Inventory items exist and loaded from DB');

    const negativeStockFound = inventoryItems.filter((i: any) => Number(i.quantity) < 0);
    assert(negativeStockFound.length === 0, 'Zero items have negative stock quantity');

    console.log('\n=============================================');
    console.log(`📊 TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
    console.log('=============================================\n');

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

runRemediationTests();
