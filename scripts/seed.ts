import { MongoClient } from 'mongodb';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URI;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

// -------------------------------
// Helper: Clean CSV Text
// -------------------------------
function clean(text: string) {
  return text
    ? text.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '')
        .replace(/["']/g, '')
        .trim()
    : '';
}

// -------------------------------
// Unsplash Image Fetcher
// -------------------------------
const imageCache: Record<string, string> = {};

async function getImageForFood(name: string): Promise<string> {
  if (!UNSPLASH_ACCESS_KEY) {
    return 'https://via.placeholder.com/400x300?text=Food';
  }

  if (imageCache[name]) return imageCache[name];

  try {
    const response = await axios.get(
      'https://api.unsplash.com/search/photos',
      {
        params: {
          query: `${name} food`,
          per_page: 1,
          orientation: 'landscape',
        },
        headers: {
          Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        },
      }
    );

    if (response.data.results.length > 0) {
      const imageUrl = response.data.results[0].urls.small;
      imageCache[name] = imageUrl;
      return imageUrl;
    }
  } catch (err) {
    console.error(`Image fetch failed for ${name}`);
  }

  const fallback = 'https://via.placeholder.com/400x300?text=Food';
  imageCache[name] = fallback;
  return fallback;
}

// -------------------------------
// Seed Function
// -------------------------------
async function seed() {
  if (!MONGODB_URI) {
    console.error('❌ No MongoDB URI provided');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db('restaurant_pos');

    console.log('🧹 Clearing old data...');
    await Promise.all([
      db.collection('users').deleteMany({}),
      db.collection('menu_items').deleteMany({}),
      db.collection('tables').deleteMany({}),
      db.collection('orders').deleteMany({}),
    ]);

    // -------------------------------
    // USERS
    // -------------------------------
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
        email: `${user.name.replace(' ', '').toLowerCase()}@pos.com`,
        name: user.name,
        role: user.role,
        pinHash: hashedPin,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // -------------------------------
    // TABLES
    // -------------------------------
    console.log('🪑 Importing Tables...');
    const setupPath = path.join(process.cwd(), 'setup.csv');

    if (fs.existsSync(setupPath)) {
      const fileContent = fs.readFileSync(setupPath, 'utf-8');
      const lines = fileContent.split(/\r?\n/);
      const headers = lines[0].split(',').map(h => clean(h).toUpperCase());
      const tableColIdx = headers.findIndex(h =>
        h.includes('TABLE') || h.includes('GARDEN')
      );

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
            currentWaiterId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }

      if (tables.length) {
        await db.collection('tables').insertMany(tables);
      }
    } else {
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
    }

    // -------------------------------
    // MENU
    // -------------------------------
    console.log('🍕 Importing Menu with Real Images...');
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

    const menuItems = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;

      const row = lines[i]
        .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
        .map(clean);

      const name = row[nameIdx];
      const price = parseFloat(row[priceIdx]);
      const category = catIdx > -1 ? row[catIdx] : 'Main Course';

      if (name && !isNaN(price)) {
        console.log(`Fetching image for: ${name}`);

        const imageUrl = await getImageForFood(name);

        menuItems.push({
          name,
          category: category.trim() || 'Main Course',
          price,
          description: '',
          image: imageUrl,
          available: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    if (menuItems.length) {
      await db.collection('menu_items').insertMany(menuItems);
    }

    console.log('✨ Seed Completed Successfully!');
    process.exit(0);

  } catch (err) {
    console.error('❌ Seed Error:', err);
    process.exit(1);
  }
}

seed();
