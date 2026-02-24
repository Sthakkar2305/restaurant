import { MongoClient } from 'mongodb';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URI;

function clean(text: string) {
  return text ? text.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '').replace(/["']/g, '').trim() : '';
}

/* ----------------------------------
   THE PERFECT INDIAN FOOD IMAGE MAPPER
   (Hand-picked, high-quality images matched to YOUR exact menu)
---------------------------------- */
function getPerfectImage(name: string): string {
  const n = name.toLowerCase();

  // 1. Drinks
  if (n.includes('lassi') || n.includes('butter milk') || n.includes('curd')) 
    return 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=500&q=80'; // Glass of rich lassi
  if (n.includes('cold drink')) 
    return 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&q=80'; // Cola with ice

  // 2. Soups
  if (n.includes('soup')) 
    return 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=500&q=80'; // Restaurant Soup bowl

  // 3. Starters / Chinese
  if (n.includes('noodle')) 
    return 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=500&q=80'; // Hakka Noodles
  if (n.includes('manchurian') || n.includes('chilli') || n.includes('crispy') || n.includes('bhel')) 
    return 'https://images.unsplash.com/photo-1625944230945-1b7dd12ece63?w=500&q=80'; // Gobi/Paneer Chilli Dry
  if (n.includes('fries') || n.includes('chips')) 
    return 'https://images.unsplash.com/photo-1576107232684-1279f390859f?w=500&q=80'; // French fries
  if (n.includes('papad') || n.includes('kabab') || n.includes('tikka dry')) 
    return 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&q=80'; // Samosa/Indian Starter plate

  // 4. Salads
  if (n.includes('salad')) 
    return 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&q=80'; // Fresh healthy salad

  // 5. Sizzlers
  if (n.includes('sizzler')) 
    return 'https://images.unsplash.com/photo-1544025162-83151834241e?w=500&q=80'; // Smoke sizzler pan

  // 6. Main Course (Paneer & Veg)
  if (n.includes('palak') || n.includes('hariyali')) 
    return 'https://images.unsplash.com/photo-1601050690117-94f5f6bd9fc8?w=500&q=80'; // Green Palak Paneer
  if (n.includes('paneer') && (n.includes('butter') || n.includes('tikka') || n.includes('makhani'))) 
    return 'https://images.unsplash.com/photo-1631452180519-c014fe946bc0?w=500&q=80'; // Rich Red Paneer Gravy
  if (n.includes('kaju') || n.includes('kofta') || n.includes('korma') || n.includes('veg')) 
    return 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=500&q=80'; // Yellow/Rich Mix Veg Curry

  // 7. Dal
  if (n.includes('dal')) 
    return 'https://images.unsplash.com/photo-1546833999-28185880bc89?w=500&q=80'; // Dal Fry/Tadka

  // 8. Breads (Roti / Naan / Paratha)
  if (n.includes('roti') || n.includes('naan') || n.includes('kulcha') || n.includes('paratha')) 
    return 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=500&q=80'; // Butter Naan basket

  // 9. Rice & Biryani
  if (n.includes('biryani')) 
    return 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80'; // Dum Biryani in pot
  if (n.includes('rice') || n.includes('pulav')) 
    return 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=500&q=80'; // Jeera/Fried Rice

  // 10. South Indian
  if (n.includes('dosa') || n.includes('uttapam')) 
    return 'https://images.unsplash.com/photo-1589301760014-d929f39ce9b1?w=500&q=80'; // Crispy Dosa with chutney

  // Fallback for anything else
  return 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=500&q=80';
}

/* ----------------------------------
   Seed Function
---------------------------------- */
async function seed() {
  if (!MONGODB_URI) {
    console.error('❌ No MongoDB URI provided');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db('restaurant_pos');

    console.log('🧹 Clearing old tables and orders...');
    await Promise.all([
      db.collection('users').deleteMany({}),
      db.collection('tables').deleteMany({}),
      db.collection('orders').deleteMany({}),
    ]);

    console.log('👤 Creating Staff...');
    const users = [
      { name: 'Super Admin', role: 'superadmin', pin: '7896' },
      { name: 'Admin', role: 'admin', pin: '9999' },
      { name: 'Waiter 1', role: 'waiter', pin: '1234' },
      { name: 'Waiter 2', role: 'waiter', pin: '4567' },
      { name: 'Waiter 3', role: 'waiter', pin: '8901' },
      { name: 'Waiter 4', role: 'waiter', pin: '2345' },
    ];

    for (const user of users) {
      const hashedPin = await bcrypt.hash(user.pin, 10);
      await db.collection('users').insertOne({
        email: `${user.name.replace(/\s/g, '').toLowerCase()}@pos.com`,
        name: user.name,
        role: user.role,
        pinHash: hashedPin,
        createdAt: new Date(), updatedAt: new Date(),
      });
    }

    console.log('🪑 Creating Default Tables...');
    const defaultTables = Array.from({ length: 10 }, (_, i) => ({
      name: `Table ${i + 1}`, table_number: i + 1, seating_capacity: 4, status: 'available', currentWaiterId: null, createdAt: new Date(), updatedAt: new Date(),
    }));
    await db.collection('tables').insertMany(defaultTables);

    console.log('\n🍕 Fixing Menu Images (Applying Perfect Image Map)...');
    const menuPath = path.join(process.cwd(), 'menu.csv');

    if (!fs.existsSync(menuPath)) {
      console.log('⚠ No menu.csv found');
      process.exit(0);
    }

    const lines = fs.readFileSync(menuPath, 'utf-8').split(/\r?\n/);
    const headers = lines[0].split(',').map(h => clean(h).toUpperCase());
    const nameIdx = headers.findIndex(h => h.includes('NAME'));
    const priceIdx = headers.findIndex(h => h.includes('RATE') || h.includes('PRICE'));
    const catIdx = headers.findIndex(h => h.includes('CATEGORY'));

    let updatedCount = 0;

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(clean);
      const name = row[nameIdx];
      const price = parseFloat(row[priceIdx]);
      const category = catIdx > -1 ? row[catIdx] : 'Main Course';

      if (!name || isNaN(price)) continue;

      // Get the perfect image instantly based on the name!
      const perfectImageUrl = getPerfectImage(name);

      const existing = await db.collection('menu_items').findOne({ name });

      if (existing) {
        // Force update the item to use our perfect image
        await db.collection('menu_items').updateOne(
          { _id: existing._id },
          { $set: { image: perfectImageUrl, updatedAt: new Date() } }
        );
      } else {
        await db.collection('menu_items').insertOne({
          name, category: category.trim() || 'Main Course', price, description: '',
          image: perfectImageUrl, available: true, createdAt: new Date(), updatedAt: new Date(),
        });
      }
      updatedCount++;
    }

    console.log(`\n✅ Finished. Perfectly updated ${updatedCount} menu items!\n`);
    process.exit(0);

  } catch (err) {
    console.error('❌ Seed Error:', err);
    process.exit(1);
  }
}

seed();