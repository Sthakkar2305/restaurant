import { MongoClient } from 'mongodb';
import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URI;

// Helper to generate a random ID
function generateId() {
  return new Date().getTime().toString(36) + Math.random().toString(36).substr(2, 5);
}

async function generateTestOrders() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined in .env');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    const db = client.db('restaurant_pos');

    // 1. Fetch existing data to use for random orders
    const waiters = await db.collection('users').find({ role: 'waiter' }).toArray();
    const menuItems = await db.collection('menu_items').find({}).toArray();
    const tables = await db.collection('tables').find({}).toArray();

    if (waiters.length === 0 || menuItems.length === 0 || tables.length === 0) {
      console.error('❌ Missing waiters, menu items, or tables. Run `npx ts-node scripts/seed.ts` first.');
      process.exit(1);
    }

    console.log('🚀 Generating 15 Random Test Orders...');

    // We weight "paid" heavily so your Super Admin dashboard shows good income
    const statuses = ['pending', 'preparing', 'served', 'paid', 'paid', 'paid']; 

    for (let i = 0; i < 15; i++) {
      // Pick random data
      const waiter = waiters[Math.floor(Math.random() * waiters.length)];
      const table = tables[Math.floor(Math.random() * tables.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      // Pick 1 to 4 random menu items
      const numItems = Math.floor(Math.random() * 4) + 1;
      const orderItems = [];
      let subtotal = 0;

      for (let j = 0; j < numItems; j++) {
        const item = menuItems[Math.floor(Math.random() * menuItems.length)];
        const quantity = Math.floor(Math.random() * 3) + 1; // 1 to 3 items
        const itemSubtotal = item.price * quantity;

        orderItems.push({
          menuItemId: item._id.toString(),
          itemName: item.name,
          price: item.price,
          quantity: quantity,
          subtotal: itemSubtotal
        });
        subtotal += itemSubtotal;
      }

      // Calculate taxes
      const tax = subtotal * 0.05;
      const serviceCharge = subtotal * 0.1;
      const total = subtotal + tax + serviceCharge;

      // Randomize the date slightly (within the last few days)
      const date = new Date();
      date.setHours(date.getHours() - Math.floor(Math.random() * 72)); // Spread over 3 days

      // Create order object
      const order = {
        orderId: generateId(),
        tableNumber: table.table_number,
        waiterId: waiter._id.toString(),
        waiterName: waiter.name,
        customerName: `Test Guest ${i + 1}`,
        customerEmail: `guest${i + 1}@example.com`,
        items: orderItems,
        status: status,
        subtotal: subtotal,
        tax: tax,
        serviceCharge: serviceCharge,
        total: total,
        paymentStatus: status === 'paid' ? 'paid' : 'unpaid',
        createdAt: date,
        updatedAt: date,
      };

      await db.collection('orders').insertOne(order);

      // If the order is NOT paid, lock the table to simulate real usage
      if (status !== 'paid' && status !== 'cancelled') {
         await db.collection('tables').updateOne(
            { _id: table._id },
            { $set: { status: 'occupied', currentWaiterId: waiter._id.toString() } }
         );
      }
    }

    console.log('✅ Successfully generated 15 test orders!');
    console.log('👉 Check your Admin and Super Admin dashboards to see the results.');

  } catch (error) {
    console.error('❌ Error generating test orders:', error);
  } finally {
    await client.close();
  }
}

generateTestOrders();