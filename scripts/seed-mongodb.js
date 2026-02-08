// This script seeds MongoDB with sample data
// Run with: node scripts/seed-mongodb.js

const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

async function seedDatabase() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB || 'restaurant_pos');

    console.log('Connected to MongoDB');

    // Clear existing data
    console.log('Clearing existing data...');
    await db.collection('users').deleteMany({});
    await db.collection('menu_items').deleteMany({});
    await db.collection('tables').deleteMany({});

    // Seed Users
    const hashedPassword = await bcrypt.hash('password123', 10);
    await db.collection('users').insertMany([
      {
        email: 'waiter@restaurant.com',
        passwordHash: hashedPassword,
        name: 'John Waiter',
        role: 'waiter',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        email: 'admin@restaurant.com',
        passwordHash: hashedPassword,
        name: 'Admin Manager',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    console.log('✓ Seeded users');

    // Seed Menu Items
    const menuItems = [
      // Starters
      {
        name: 'Vegetable Spring Rolls',
        description: 'Crispy spring rolls filled with fresh vegetables',
        price: 180,
        category: 'starters',
        image: 'https://via.placeholder.com/200?text=Spring+Rolls',
        available: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Paneer Tikka',
        description: 'Marinated cottage cheese grilled with spices',
        price: 220,
        category: 'starters',
        image: 'https://via.placeholder.com/200?text=Paneer+Tikka',
        available: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Chicken Tikka',
        description: 'Tender chicken pieces grilled with aromatic spices',
        price: 250,
        category: 'starters',
        image: 'https://via.placeholder.com/200?text=Chicken+Tikka',
        available: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // Main Course
      {
        name: 'Butter Chicken',
        description: 'Tender chicken in creamy tomato sauce',
        price: 380,
        category: 'main_course',
        image: 'https://via.placeholder.com/200?text=Butter+Chicken',
        available: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Paneer Tikka Masala',
        description: 'Cottage cheese in spiced cream sauce',
        price: 340,
        category: 'main_course',
        image: 'https://via.placeholder.com/200?text=Paneer+Masala',
        available: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Biryani',
        description: 'Fragrant basmati rice with meat or vegetables',
        price: 320,
        category: 'main_course',
        image: 'https://via.placeholder.com/200?text=Biryani',
        available: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Dal Makhani',
        description: 'Creamy lentils cooked overnight',
        price: 280,
        category: 'main_course',
        image: 'https://via.placeholder.com/200?text=Dal+Makhani',
        available: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // Desserts
      {
        name: 'Gulab Jamun',
        description: 'Soft dough balls in sugar syrup',
        price: 120,
        category: 'desserts',
        image: 'https://via.placeholder.com/200?text=Gulab+Jamun',
        available: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Kheer',
        description: 'Rice pudding with cardamom and nuts',
        price: 100,
        category: 'desserts',
        image: 'https://via.placeholder.com/200?text=Kheer',
        available: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // Drinks
      {
        name: 'Mango Lassi',
        description: 'Yogurt-based mango drink',
        price: 80,
        category: 'drinks',
        image: 'https://via.placeholder.com/200?text=Mango+Lassi',
        available: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Masala Chai',
        description: 'Spiced Indian tea',
        price: 50,
        category: 'drinks',
        image: 'https://via.placeholder.com/200?text=Masala+Chai',
        available: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Cold Coffee',
        description: 'Chilled coffee with ice cream',
        price: 120,
        category: 'drinks',
        image: 'https://via.placeholder.com/200?text=Cold+Coffee',
        available: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    await db.collection('menu_items').insertMany(menuItems);
    console.log('✓ Seeded menu items');

    // Seed Tables
    const tables = Array.from({ length: 20 }, (_, i) => ({
      table_number: i + 1,
      seating_capacity: i % 3 === 0 ? 6 : i % 2 === 0 ? 4 : 2,
      status: 'available',
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await db.collection('tables').insertMany(tables);
    console.log('✓ Seeded tables');

    console.log('\n✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('Error during database seeding:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seedDatabase();
