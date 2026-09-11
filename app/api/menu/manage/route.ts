import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/mongodb';
import { requireAdmin, requireStaff } from '@/lib/api-helpers';

// GET: List all menu items including unavailable items for management
export async function GET(request: NextRequest) {
  try {
    const auth = await requireStaff(request);
    if (auth.response) return auth.response;

    const menuCollection = await getCollection('menu_items');
    const items = await menuCollection.find({}).sort({ category: 1, name: 1 }).toArray();

    // Dynamically retrieve unique categories
    const categories = Array.from(new Set(items.map((i) => i.category || 'general')));

    return NextResponse.json({ success: true, items, categories });
  } catch (error: any) {
    console.error('Fetch manage menu error:', error);
    return NextResponse.json({ error: 'Failed to fetch menu items' }, { status: 500 });
  }
}

// POST: Add new menu item (ADMIN / SUPERADMIN ONLY)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const { name, category, price, description, foodType = 'veg', available = true, image } = await request.json();

    if (!name || price === undefined) {
      return NextResponse.json({ error: 'Name and price are required' }, { status: 400 });
    }

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      return NextResponse.json({ error: 'Price must be a valid non-negative number' }, { status: 400 });
    }

    const menuCollection = await getCollection('menu_items');

    const newItem = {
      name: String(name).trim(),
      category: category ? String(category).toLowerCase().replace(/\s+/g, '_') : 'general',
      price: numPrice,
      description: description ? String(description).slice(0, 500) : '',
      foodType: ['veg', 'non-veg', 'egg', 'beverage'].includes(foodType) ? foodType : 'veg',
      available: Boolean(available),
      image: image || '/placeholder.jpg',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await menuCollection.insertOne(newItem);

    return NextResponse.json({ success: true, item: { _id: result.insertedId, ...newItem } });
  } catch (error: any) {
    console.error('Add menu item error:', error);
    return NextResponse.json({ error: error.message || 'Failed to add item' }, { status: 500 });
  }
}

// PUT: Update existing menu item (ADMIN / SUPERADMIN ONLY)
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const { id, name, category, price, description, foodType, available, image } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    const menuCollection = await getCollection('menu_items');
    const updateDoc: any = { updatedAt: new Date() };

    if (name) updateDoc.name = String(name).trim();
    if (category) updateDoc.category = String(category).toLowerCase().replace(/\s+/g, '_');
    if (price !== undefined) {
      const p = Number(price);
      if (isNaN(p) || p < 0) {
        return NextResponse.json({ error: 'Price must be a valid non-negative number' }, { status: 400 });
      }
      updateDoc.price = p;
    }
    if (description !== undefined) updateDoc.description = String(description).slice(0, 500);
    if (foodType && ['veg', 'non-veg', 'egg', 'beverage'].includes(foodType)) updateDoc.foodType = foodType;
    if (available !== undefined) updateDoc.available = Boolean(available);
    if (image !== undefined) updateDoc.image = image;

    let query: any;
    try {
      query = { _id: new ObjectId(id) };
    } catch {
      query = { _id: id };
    }

    const result = await menuCollection.updateOne(query, { $set: updateDoc });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Item updated successfully' });
  } catch (error: any) {
    console.error('Update menu item error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update item' }, { status: 500 });
  }
}

// DELETE: Delete menu item (ADMIN / SUPERADMIN ONLY)
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    const menuCollection = await getCollection('menu_items');

    let query: any;
    try {
      query = { _id: new ObjectId(id) };
    } catch {
      query = { _id: id };
    }

    const result = await menuCollection.deleteOne(query);

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Item deleted successfully' });
  } catch (error: any) {
    console.error('Delete menu item error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete item' }, { status: 500 });
  }
}
