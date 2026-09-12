import { MongoClient } from 'mongodb';
import bcrypt from 'bcrypt';
import 'dotenv/config';

interface ProvisionOptions {
  hotelName: string;
  dbName: string;
  adminPin: string;
  superAdminPin: string;
  validityMonths: number;
  contactPhone: string;
  contactEmail: string;
  developerKey: string;
}

async function provisionRestaurant(options: ProvisionOptions) {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI is not set in environment.');
    process.exit(1);
  }

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log(`\n🚀 Connected to MongoDB cluster. Provisioning database: "${options.dbName}" for "${options.hotelName}"...`);

    const db = client.db(options.dbName);

    // 1. Create Indexes
    console.log('📌 Setting up database indexes...');
    await db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await db.collection('sessions').createIndex({ sessionId: 1 }, { unique: true });
    await db.collection('orders').createIndex({ status: 1, createdAt: -1 });
    await db.collection('orders').createIndex({ tableNumber: 1, status: 1 });
    await db.collection('orders').createIndex({ orderId: 1 }, { unique: true });
    await db.collection('orders').createIndex({ checkoutToken: 1 }, { sparse: true });
    await db.collection('orders').createIndex({ idempotencyKey: 1 }, { unique: true, sparse: true });
    await db.collection('tables').createIndex({ table_number: 1 }, { unique: true });
    await db.collection('users').createIndex({ name: 1 });
    await db.collection('users').createIndex({ role: 1 });
    await db.collection('menu_items').createIndex({ category: 1, available: 1 });
    await db.collection('inventory_items').createIndex({ name: 1 });

    // 2. Set Up System License & Expiration Timer
    console.log('🔑 Configuring license and expiry timer...');
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + options.validityMonths);

    const licenseDoc = {
      key: 'main_license',
      hotelName: options.hotelName,
      expiresAt: expiryDate.toISOString(),
      isManualLock: false,
      contactPhone: options.contactPhone || '+91 98765 43210',
      contactEmail: options.contactEmail || 'support@pos.com',
      customMessage: `Your POS subscription for ${options.hotelName} has expired. Please contact ${options.contactPhone || 'developer'} to renew.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection('system_license').updateOne(
      { key: 'main_license' },
      { $set: licenseDoc },
      { upsert: true }
    );

    // 3. Create Default Staff Accounts
    console.log('👤 Provisioning initial staff accounts...');
    const superAdminHash = await bcrypt.hash(options.superAdminPin, 10);
    const adminHash = await bcrypt.hash(options.adminPin, 10);
    const waiterHash = await bcrypt.hash('1234', 10);
    const chefHash = await bcrypt.hash('2345', 10);

    const initialUsers = [
      {
        name: 'Super Admin',
        role: 'superadmin',
        pinHash: superAdminHash,
        email: `superadmin@${options.dbName}.com`,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Manager Admin',
        role: 'admin',
        pinHash: adminHash,
        email: `admin@${options.dbName}.com`,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Waiter 1',
        role: 'waiter',
        pinHash: waiterHash,
        email: `waiter1@${options.dbName}.com`,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Chef 1',
        role: 'chef',
        pinHash: chefHash,
        email: `chef1@${options.dbName}.com`,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    for (const u of initialUsers) {
      await db.collection('users').updateOne(
        { role: u.role, name: u.name },
        { $set: u },
        { upsert: true }
      );
    }

    // 4. Create Default Tables (10 tables)
    console.log('🪑 Creating default dining tables...');
    for (let i = 1; i <= 10; i++) {
      await db.collection('tables').updateOne(
        { table_number: i },
        {
          $setOnInsert: {
            name: `Table ${i}`,
            table_number: i,
            seating_capacity: 4,
            status: 'available',
            currentWaiterId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );
    }

    // 5. Create Default Restaurant Profile
    console.log('🏢 Setting up restaurant business profile...');
    await db.collection('restaurant_profile').updateOne(
      { key: 'main_profile' },
      {
        $setOnInsert: {
          key: 'main_profile',
          restaurantName: options.hotelName,
          tagline: 'Fine Dining & Takeaway',
          address: 'Main Street, City',
          phone: options.contactPhone,
          email: options.contactEmail,
          gstin: '24AAAAA0000A1Z5',
          fssai: '10012345678901',
          serviceChargePercent: 5,
          gstPercent: 5,
          updatedAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    );

    console.log('\n================================================================');
    console.log(`✅ RESTAURANT PROVISIONED SUCCESSFULLY: ${options.hotelName}`);
    console.log('================================================================');
    console.log(`📂 Database Name     : ${options.dbName}`);
    console.log(`📅 Subscription Until : ${expiryDate.toLocaleDateString()} (${options.validityMonths} months)`);
    console.log(`🔑 SuperAdmin PIN    : ${options.superAdminPin}`);
    console.log(`🔑 Manager Admin PIN : ${options.adminPin}`);
    console.log(`🔑 Waiter 1 PIN      : 1234`);
    console.log(`🔑 Chef 1 PIN        : 2345`);
    console.log(`🛠️ Developer Admin    : /developer-admin (Key: ${options.developerKey})`);
    console.log('\n💡 TO DEPLOY THIS RESTAURANT INSTANCE:');
    console.log(`Set the following environment variable in their deployment (.env or Vercel/Cloud):`);
    console.log(`   MONGODB_DB=${options.dbName}`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('❌ Provisioning Error:', err);
  } finally {
    await client.close();
  }
}

// Read CLI arguments if provided, else use defaults or prompt
const args = process.argv.slice(2);
const hotelName = args[0] || 'Hotel Grand Royal';
const dbName = args[1] || `pos_${hotelName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
const months = parseInt(args[2] || '12', 10); // default 1 year (12 months)
const adminPin = args[3] || '9999';
const superAdminPin = args[4] || '7896';

provisionRestaurant({
  hotelName,
  dbName,
  validityMonths: months,
  adminPin,
  superAdminPin,
  contactPhone: '+91 98765 43210',
  contactEmail: 'developer@pos.com',
  developerKey: process.env.DEVELOPER_ADMIN_KEY || 'dev@1234',
});
