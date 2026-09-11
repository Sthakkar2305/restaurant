import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/api-helpers';

// Default initial inventory items for restaurant
const DEFAULT_STOCK_ITEMS = [
  { name: 'Atta (Wheat Flour)', category: 'Grains & Flour', quantity: 50, unit: 'kg', minLevel: 15, costPrice: 42, supplier: 'Shreeji Traders' },
  { name: 'Basmati Rice', category: 'Grains & Flour', quantity: 40, unit: 'kg', minLevel: 10, costPrice: 90, supplier: 'Shreeji Traders' },
  { name: 'Potatoes (Aloo)', category: 'Vegetables', quantity: 30, unit: 'kg', minLevel: 10, costPrice: 28, supplier: 'Fresh Veggies Mandi' },
  { name: 'Onions (Pyaz)', category: 'Vegetables', quantity: 25, unit: 'kg', minLevel: 10, costPrice: 35, supplier: 'Fresh Veggies Mandi' },
  { name: 'Tomatoes', category: 'Vegetables', quantity: 20, unit: 'kg', minLevel: 8, costPrice: 40, supplier: 'Fresh Veggies Mandi' },
  { name: 'Fresh Paneer', category: 'Dairy', quantity: 12, unit: 'kg', minLevel: 4, costPrice: 380, supplier: 'Amul Dairy' },
  { name: 'Milk (Full Cream)', category: 'Dairy', quantity: 20, unit: 'ltr', minLevel: 5, costPrice: 65, supplier: 'Amul Dairy' },
  { name: 'Cooking Oil (Sunflower)', category: 'Oil & Spices', quantity: 35, unit: 'ltr', minLevel: 10, costPrice: 135, supplier: 'Fortune Wholesale' },
  { name: 'Mineral Water Bottles (1L)', category: 'Beverages', quantity: 72, unit: 'bottles', minLevel: 24, costPrice: 12, supplier: 'Bisleri Agency' },
  { name: 'Cold Drinks (Assorted)', category: 'Beverages', quantity: 48, unit: 'bottles', minLevel: 18, costPrice: 30, supplier: 'Coca-Cola Distributor' },
  { name: 'Takeaway Packaging Boxes', category: 'Packaging', quantity: 150, unit: 'pieces', minLevel: 50, costPrice: 6, supplier: 'Eco Pack Co.' },
];

// GET: List all inventory items (ADMIN / SUPERADMIN ONLY)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const inventoryCollection = await getCollection('inventory_items');
    let items = await inventoryCollection.find({}).sort({ category: 1, name: 1 }).toArray();

    // Auto-seed default stock if empty
    if (items.length === 0) {
      const seeded = DEFAULT_STOCK_ITEMS.map((item) => ({
        ...item,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      await inventoryCollection.insertMany(seeded);
      items = await inventoryCollection.find({}).sort({ category: 1, name: 1 }).toArray();
    }

    const lowStockCount = items.filter((i) => i.quantity <= (i.minLevel || 10)).length;
    const totalInventoryValue = items.reduce(
      (sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.costPrice) || 0),
      0
    );

    return NextResponse.json({
      success: true,
      items,
      summary: {
        totalItems: items.length,
        lowStockCount,
        totalInventoryValue: Math.round(totalInventoryValue),
      },
    });
  } catch (error: any) {
    console.error('Fetch inventory error:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
  }
}

// POST: Add new inventory item (ADMIN / SUPERADMIN ONLY)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const { name, category, quantity, unit, minLevel, costPrice, supplier } = await request.json();

    if (!name || quantity === undefined) {
      return NextResponse.json({ error: 'Item Name and Quantity are required' }, { status: 400 });
    }

    const inventoryCollection = await getCollection('inventory_items');

    const newItem = {
      name: String(name).trim(),
      category: category ? String(category).trim() : 'General',
      quantity: Math.max(0, Number(quantity) || 0),
      unit: unit ? String(unit).trim() : 'kg',
      minLevel: Math.max(0, Number(minLevel) || 10),
      costPrice: Math.max(0, Number(costPrice) || 0),
      supplier: supplier ? String(supplier).trim() : '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await inventoryCollection.insertOne(newItem);

    return NextResponse.json({ success: true, item: { _id: result.insertedId, ...newItem } });
  } catch (error: any) {
    console.error('Add inventory error:', error);
    return NextResponse.json({ error: error.message || 'Failed to add item' }, { status: 500 });
  }
}

// PUT: Update inventory item (ADMIN / SUPERADMIN ONLY)
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const { id, name, category, quantity, unit, minLevel, costPrice, supplier } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    const inventoryCollection = await getCollection('inventory_items');
    const updateDoc: any = { updatedAt: new Date() };

    if (name) updateDoc.name = String(name).trim();
    if (category) updateDoc.category = String(category).trim();
    if (quantity !== undefined) updateDoc.quantity = Math.max(0, Number(quantity));
    if (unit) updateDoc.unit = String(unit).trim();
    if (minLevel !== undefined) updateDoc.minLevel = Math.max(0, Number(minLevel));
    if (costPrice !== undefined) updateDoc.costPrice = Math.max(0, Number(costPrice));
    if (supplier !== undefined) updateDoc.supplier = String(supplier).trim();

    let query: any;
    try {
      query = { _id: new ObjectId(id) };
    } catch {
      query = { _id: id };
    }

    const result = await inventoryCollection.updateOne(query, { $set: updateDoc });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Stock updated successfully' });
  } catch (error: any) {
    console.error('Update inventory error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update stock' }, { status: 500 });
  }
}

// DELETE: Delete stock item (ADMIN / SUPERADMIN ONLY)
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    const inventoryCollection = await getCollection('inventory_items');

    let query: any;
    try {
      query = { _id: new ObjectId(id) };
    } catch {
      query = { _id: id };
    }

    const result = await inventoryCollection.deleteOne(query);

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Stock item deleted successfully' });
  } catch (error: any) {
    console.error('Delete inventory error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete item' }, { status: 500 });
  }
}
