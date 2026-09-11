import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/mongodb';

// GET: List all menu items including unavailable items for management
export async function GET() {
  try {
    const menuCollection = await getCollection('menu_items');
    const items = await menuCollection.find({}).sort({ category: 1, name: 1 }).toArray();

    // Get unique categories
    const categories = Array.from(new Set(items.map((i) => i.category || 'general')));

    return NextResponse.json({ success: true, items, categories });
  } catch (error: any) {
    console.error('Fetch manage menu error:', error);
    return NextResponse.json({ error: 'Failed to fetch menu items' }, { status: 500 });
  }
}

// POST: Add new menu item
export async function POST(request: NextRequest) {
  try {
    const { name, category, price, description, foodType = 'veg', available = true, image } = await request.json();

    if (!name || price === undefined) {
      return NextResponse.json({ error: 'Name and price are required' }, { status: 400 });
    }

    const menuCollection = await getCollection('menu_items');

    const newItem = {
      name,
      category: category ? category.toLowerCase().replace(/\s+/g, '_') : 'general',
      price: Number(price),
      description: description || '',
      foodType,
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

// PUT: Update existing menu item
export async function PUT(request: NextRequest) {
  try {
    const { id, name, category, price, description, foodType, available, image } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    const menuCollection = await getCollection('menu_items');
    const updateDoc: any = {
      updatedAt: new Date(),
    };

    if (name) updateDoc.name = name;
    if (category) updateDoc.category = category.toLowerCase().replace(/\s+/g, '_');
    if (price !== undefined) updateDoc.price = Number(price);
    if (description !== undefined) updateDoc.description = description;
    if (foodType) updateDoc.foodType = foodType;
    if (available !== undefined) updateDoc.available = Boolean(available);
    if (image !== undefined) updateDoc.image = image;

    const result = await menuCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateDoc }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Item updated successfully' });
  } catch (error: any) {
    console.error('Update menu item error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update item' }, { status: 500 });
  }
}

// DELETE: Delete menu item
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    const menuCollection = await getCollection('menu_items');
    const result = await menuCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Item deleted successfully' });
  } catch (error: any) {
    console.error('Delete menu item error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete item' }, { status: 500 });
  }
}
