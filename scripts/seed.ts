import { MongoClient } from 'mongodb';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URI;

// Helper to clean CSV text
function clean(text: string) {
  return text ? text.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '').replace(/["']/g, '').trim() : '';
}

// AUTO-IMAGE GENERATOR
function getImageForFood(name: string, category: string): string {
  const n = name.toLowerCase();
  if (n.includes('paneer')) return 'https://source.unsplash.com/400x300/?paneer,curry';
  if (n.includes('pizza')) return 'https://source.unsplash.com/400x300/?pizza';
  if (n.includes('burger')) return 'https://source.unsplash.com/400x300/?burger';
  if (n.includes('pasta')) return 'https://source.unsplash.com/400x300/?pasta';
  if (n.includes('soup')) return 'https://source.unsplash.com/400x300/?soup';
  if (n.includes('salad')) return 'https://source.unsplash.com/400x300/?salad';
  if (n.includes('rice') || n.includes('biryani')) return 'https://source.unsplash.com/400x300/?biryani';
  if (n.includes('roti') || n.includes('naan')) return 'https://source.unsplash.com/400x300/?naan';
  if (n.includes('drink') || n.includes('cola') || n.includes('lassi')) return 'https://source.unsplash.com/400x300/?drink';
  if (n.includes('ice cream') || category.toLowerCase().includes('dessert')) return 'https://source.unsplash.com/400x300/?dessert';
  
  // Default based on category
  if (category.toLowerCase().includes('chinese')) return 'https://source.unsplash.com/400x300/?chinese,food';
  if (category.toLowerCase().includes('south')) return 'https://source.unsplash.com/400x300/?dosa';
  
  return 'https://source.unsplash.com/400x300/?restaurant,food';
}

async function seed() {
  if (!MONGODB_URI) { console.error('No Mongo URI'); process.exit(1); }
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db('restaurant_pos');

    console.log('🧹 Clearing old data...');
    await db.collection('users').deleteMany({});
    await db.collection('menu_items').deleteMany({});
    await db.collection('tables').deleteMany({});
    await db.collection('orders').deleteMany({});

   console.log('👤 Creating Staff...');
    const users = [
      { name: 'Super Admin', role: 'superadmin', pin: '7896' }, // NEW
      { name: 'Admin', role: 'admin', pin: '9999' },
      { name: 'Waiter 1', role: 'waiter', pin: '1234' },
      { name: 'Waiter 2', role: 'waiter', pin: '4567' },
      { name: 'Waiter 3', role: 'waiter', pin: '8901' },
      { name: 'Waiter 4', role: 'waiter', pin: '2345' },
    ];

    for (const user of users) {
      const hashedPin = await bcrypt.hash(user.pin, 10);
      await db.collection('users').insertOne({
        email: `${user.name.replace(' ', '').toLowerCase()}@pos.com`,
        name: user.name,
        role: user.role,
        pinHash: hashedPin,
        createdAt: new Date(), updatedAt: new Date(),
      });
    }

    // TABLES
    console.log('🪑 Importing Tables...');
    const setupPath = path.join(process.cwd(), 'setup.csv');
    if (fs.existsSync(setupPath)) {
        const fileContent = fs.readFileSync(setupPath, 'utf-8');
        const lines = fileContent.split(/\r?\n/);
        const headers = lines[0].split(',').map(h => clean(h).toUpperCase());
        const tableColIdx = headers.findIndex(h => h.includes('TABLE') || h.includes('GARDEN'));

        if (tableColIdx > -1) {
            const tables = [];
            let counter = 1;
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                const row = lines[i].split(',');
                const tableName = clean(row[tableColIdx]);
                if (tableName) {
                    tables.push({
                        name: tableName,
                        table_number: counter++,
                        seating_capacity: 4,
                        status: 'available',
                        currentWaiterId: null, // Reset lock
                        createdAt: new Date(), updatedAt: new Date(),
                    });
                }
            }
            if (tables.length > 0) await db.collection('tables').insertMany(tables);
        }
    } else {
        // Default tables
        const defaults = Array.from({ length: 10 }, (_, i) => ({
            name: `Table ${i+1}`,
            table_number: i + 1,
            seating_capacity: 4,
            status: 'available',
            currentWaiterId: null,
            createdAt: new Date(), updatedAt: new Date(),
        }));
        await db.collection('tables').insertMany(defaults);
    }

    // MENU
    console.log('🍕 Importing Menu with Images...');
    const menuPath = path.join(process.cwd(), 'menu.csv');
    if (fs.existsSync(menuPath)) {
        const lines = fs.readFileSync(menuPath, 'utf-8').split(/\r?\n/);
        const headers = lines[0].split(',').map(h => clean(h).toUpperCase());
        
        const nameIdx = headers.findIndex(h => h.includes('NAME'));
        const priceIdx = headers.findIndex(h => h.includes('RATE') || h.includes('PRICE'));
        const catIdx = headers.findIndex(h => h.includes('CATEGORY'));

        const menuItems = [];
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(clean);
            
            const name = row[nameIdx];
            const price = parseFloat(row[priceIdx]);
            const categoryRaw = catIdx > -1 ? row[catIdx] : 'Main Course';

            if (name && !isNaN(price)) {
                // Normalize Category
                let category = categoryRaw.trim();
                // Important: Match casing for filtering
                if (category.toLowerCase().includes('soup')) category = 'Soup';
                else if (category.toLowerCase().includes('chinese')) category = 'Chinese';
                else if (category.toLowerCase().includes('south')) category = 'South Indian';
                else if (category.toLowerCase().includes('drink')) category = 'Drinks';
                else if (category.toLowerCase().includes('starter')) category = 'Starters';
                else if (category.toLowerCase().includes('dessert')) category = 'Desserts';
                else if (category.toLowerCase().includes('sizzler')) category = 'Sizzler';
                else if (category.toLowerCase().includes('roti') || category.toLowerCase().includes('tandoor')) category = 'Tandoor';

                menuItems.push({
                    name: name,
                    category: category, 
                    price: price,
                    description: '',
                    image: getImageForFood(name, category), // AUTO IMAGE
                    available: true,
                    createdAt: new Date(), updatedAt: new Date(),
                });
            }
        }
        if (menuItems.length > 0) await db.collection('menu_items').insertMany(menuItems);
    }

    console.log('✨ System Ready!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}
seed();