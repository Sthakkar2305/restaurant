import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET() {
  try {
    const menuCollection = await getCollection('menu_items');
    const items = await menuCollection.find({}).sort({ category: 1, name: 1 }).toArray();
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Menu GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch menu items' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { name, description, price, category, image, available } = data;

    if (!name || price === undefined || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const menuCollection = await getCollection('menu_items');
    
    const newItem = {
      name,
      description: description || '',
      price: parseFloat(price),
      category,
      image: image || '',
      available: available !== undefined ? available : true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await menuCollection.insertOne(newItem);

    return NextResponse.json({ success: true, id: result.insertedId });
  } catch (error) {
    console.error('Menu POST error:', error);
    return NextResponse.json({ error: 'Failed to add menu item' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const { _id, name, description, price, category, image, available } = data;

    if (!_id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    const menuCollection = await getCollection('menu_items');
    
    const updateData: any = {
      updatedAt: new Date()
    };

    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (category) updateData.category = category;
    if (image !== undefined) updateData.image = image;
    if (available !== undefined) updateData.available = available;

    await menuCollection.updateOne(
      { _id: new ObjectId(_id) },
      { $set: updateData }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Menu PUT error:', error);
    return NextResponse.json({ error: 'Failed to update menu item' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const action = searchParams.get('action');

    const menuCollection = await getCollection('menu_items');

    if (action === 'deleteAll') {
      await menuCollection.deleteMany({});
      return NextResponse.json({ success: true });
    }

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await menuCollection.deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Menu DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete menu item(s)' }, { status: 500 });
  }
}
