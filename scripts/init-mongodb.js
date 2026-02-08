// This script initializes MongoDB collections and indexes
// Run with: node scripts/init-mongodb.js
// Make sure MONGODB_URI environment variable is set

const { MongoClient } = require('mongodb');

async function initializeDatabase() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB || 'restaurant_pos');

    console.log('Connected to MongoDB');

    // Create collections if they don't exist
    const collections = [
      'users',
      'menu_items',
      'tables',
      'orders',
      'payments',
      'invoices',
      'sessions',
    ];

    for (const collectionName of collections) {
      try {
        await db.createCollection(collectionName);
        console.log(`✓ Created collection: ${collectionName}`);
      } catch (error) {
        if (error.codeName === 'NamespaceExists') {
          console.log(`✓ Collection already exists: ${collectionName}`);
        } else {
          throw error;
        }
      }
    }

    // Create indexes
    const usersCollection = db.collection('users');
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    console.log('✓ Created index on users.email');

    const menuCollection = db.collection('menu_items');
    await menuCollection.createIndex({ category: 1 });
    console.log('✓ Created index on menu_items.category');

    const tablesCollection = db.collection('tables');
    await tablesCollection.createIndex({ table_number: 1 }, { unique: true });
    console.log('✓ Created index on tables.table_number');

    const ordersCollection = db.collection('orders');
    await ordersCollection.createIndex({ orderId: 1 }, { unique: true });
    await ordersCollection.createIndex({ tableNumber: 1 });
    await ordersCollection.createIndex({ status: 1 });
    await ordersCollection.createIndex({ createdAt: -1 });
    console.log('✓ Created indexes on orders collection');

    const paymentsCollection = db.collection('payments');
    await paymentsCollection.createIndex({ sessionId: 1 }, { unique: true });
    await paymentsCollection.createIndex({ orderId: 1 });
    await paymentsCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
    console.log('✓ Created indexes on payments collection');

    const invoicesCollection = db.collection('invoices');
    await invoicesCollection.createIndex({ invoiceNumber: 1 }, { unique: true });
    await invoicesCollection.createIndex({ orderId: 1 });
    console.log('✓ Created indexes on invoices collection');

    const sessionsCollection = db.collection('sessions');
    await sessionsCollection.createIndex({ sessionId: 1 }, { unique: true });
    await sessionsCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
    console.log('✓ Created indexes on sessions collection');

    console.log('\n✅ Database initialization completed successfully!');
  } catch (error) {
    console.error('Error during database initialization:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

initializeDatabase();
