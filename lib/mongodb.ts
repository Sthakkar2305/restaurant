import { MongoClient, Db } from 'mongodb';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

let indexesInitialized = false;

export async function ensureIndexes(db: Db) {
  if (indexesInitialized) return;
  try {
    // 1. Sessions TTL index for automatic cleanup of expired sessions
    await db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await db.collection('sessions').createIndex({ sessionId: 1 }, { unique: true });

    // 2. Orders indexing for fast retrieval & status queries
    await db.collection('orders').createIndex({ status: 1, createdAt: -1 });
    await db.collection('orders').createIndex({ tableNumber: 1, status: 1 });
    await db.collection('orders').createIndex({ orderId: 1 }, { unique: true });

    // 3. Tables index
    await db.collection('tables').createIndex({ table_number: 1 }, { unique: true });

    // 4. Users index
    await db.collection('users').createIndex({ name: 1 });
    await db.collection('users').createIndex({ role: 1 });

    // 5. Menu items index
    await db.collection('menu_items').createIndex({ category: 1, available: 1 });

    // 6. Inventory index
    await db.collection('inventory_items').createIndex({ name: 1 });

    indexesInitialized = true;
  } catch (err) {
    console.warn('Index initialization note:', err);
  }
}

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not defined');
  }

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB || 'restaurant_pos');
    
    cachedClient = client;
    cachedDb = db;

    // Initialize indexes in the background
    ensureIndexes(db).catch(console.error);

    return { client, db };
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

export async function getDatabase() {
  const { db } = await connectToDatabase();
  return db;
}

export async function getCollection(collectionName: string) {
  const db = await getDatabase();
  return db.collection(collectionName);
}

// Helper to generate IDs
export function generateId() {
  return new Date().getTime().toString(36) + Math.random().toString(36).substr(2);
}

