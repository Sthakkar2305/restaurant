import { MongoClient } from 'mongodb';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URI;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

if (!UNSPLASH_ACCESS_KEY) {
  console.error('❌ UNSPLASH_ACCESS_KEY missing in .env');
  process.exit(1);
}

/* ----------------------------------
   Helper: Clean CSV Text
---------------------------------- */
function clean(text: string) {
  return text
    ? text.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '')
        .replace(/["']/g, '')
        .trim()
    : '';
}

/* ----------------------------------
   Unsplash Image Fetcher
---------------------------------- */
async function getImageForFood(name: string): Promise<string | null> {
  try {
    const response = await axios.get(
      'https://api.unsplash.com/search/photos',
      {
        params: {
          query: `${name} food dish`,
          per_page: 1,
          orientation: 'landscape',
        },
        headers: {
          Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        },
      }
    );

    const results = response.data.results;

    if (results.length > 0) {
      return results[0].urls.regular;
    }

    return null;

  } catch (err: any) {
    if (err.response?.status === 403) {
      console.log('\n⛔ UNSPLASH RATE LIMIT REACHED (50/hour)');
      console.log('👉 Run this script again after 1 hour.\n');
      process.exit(0);
    }

    console.error(`Image fetch failed for ${name}`);
    return null;
  }
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

    console.log('🧹 Clearing users & tables (menu will NOT be cleared)...');

    await Promise.all([
      db.collection('users').deleteMany({}),
      db.collection('tables').deleteMany({}),
      db.collection('orders').deleteMany({}),
    ]);

    /* ----------------------------------
       USERS
    ---------------------------------- */
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
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    /* ----------------------------------
       TABLES
    ---------------------------------- */
    console.log('🪑 Creating Default Tables...');

    const defaultTables = Array.from({ length: 10 }, (_, i) => ({
      name: `Table ${i + 1}`,
      table_number: i + 1,
      seating_capacity: 4,
      status: 'available',
      currentWaiterId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await db.collection('tables').insertMany(defaultTables);

    /* ----------------------------------
       MENU WITH AUTO RESUME
    ---------------------------------- */
    console.log('\n🍕 Importing Menu (Smart Auto-Resume Enabled)...');

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

    let processedCount = 0;

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;

      const row = lines[i]
        .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
        .map(clean);

      const name = row[nameIdx];
      const price = parseFloat(row[priceIdx]);
      const category = catIdx > -1 ? row[catIdx] : 'Main Course';

      if (!name || isNaN(price)) continue;

      // 1. Check if it's already in the database
      const existing = await db.collection('menu_items').findOne({ name });

      // 2. SMART CHECK: Skip ONLY if it exists AND it does NOT have a placeholder image
      if (existing && existing.image && !existing.image.includes('placeholder.com')) {
        console.log(`⏭ Skipping (Already has real image): ${name}`);
        continue;
      }

      console.log(`🔎 Fetching real image for: ${name}`);

      const imageUrl = await getImageForFood(name);
      const finalImage = imageUrl || 'https://via.placeholder.com/400x300?text=Food';

      if (existing) {
        // It's in the DB, but had a fake image. Update it!
        await db.collection('menu_items').updateOne(
          { _id: existing._id },
          { $set: { image: finalImage, updatedAt: new Date() } }
        );
        console.log(`🔄 Updated existing item with real image: ${name}`);
      } else {
        // Not in DB at all. Insert new.
        await db.collection('menu_items').insertOne({
          name,
          category: category.trim() || 'Main Course',
          price,
          description: '',
          image: finalImage,
          available: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`✅ Inserted new item: ${name}`);
      }

      processedCount++;
    }

    console.log(`\n✅ Finished. Processed ${processedCount} items.\n`);
    process.exit(0);

  } catch (err) {
    console.error('❌ Seed Error:', err);
    process.exit(1);
  }
}

seed();