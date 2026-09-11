import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/api-helpers';

// POST: Add new table (ADMIN / SUPERADMIN ONLY)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const { name, number, capacity = 4, section = 'Main Hall' } = await request.json();
    const tablesCollection = await getCollection('tables');

    const tableNumber = parseInt(String(number), 10);
    if (isNaN(tableNumber) || tableNumber <= 0) {
      return NextResponse.json({ error: 'Valid positive table number is required' }, { status: 400 });
    }

    // Check if table number already exists
    const existing = await tablesCollection.findOne({ table_number: tableNumber });
    if (existing) {
      return NextResponse.json({ error: `Table number ${tableNumber} already exists` }, { status: 400 });
    }

    const newTable = {
      name: name ? String(name).trim() : `Table ${tableNumber}`,
      table_number: tableNumber,
      seating_capacity: parseInt(String(capacity), 10) || 4,
      section: section ? String(section).trim() : 'Main Hall',
      status: 'available',
      currentWaiterId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await tablesCollection.insertOne(newTable);

    return NextResponse.json({ success: true, table: { _id: result.insertedId, ...newTable } });
  } catch (error: any) {
    console.error('Add table error:', error);
    return NextResponse.json({ error: error.message || 'Failed to add table' }, { status: 500 });
  }
}

// PUT: Update existing table (ADMIN / SUPERADMIN ONLY)
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const { id, name, number, capacity, section, status } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Table ID is required' }, { status: 400 });
    }

    const tablesCollection = await getCollection('tables');
    const updateDoc: any = { updatedAt: new Date() };

    if (name) updateDoc.name = String(name).trim();
    if (number !== undefined) updateDoc.table_number = parseInt(String(number), 10);
    if (capacity !== undefined) updateDoc.seating_capacity = parseInt(String(capacity), 10);
    if (section !== undefined) updateDoc.section = String(section).trim();
    if (status !== undefined) {
      updateDoc.status = status;
      if (status === 'available') updateDoc.currentWaiterId = null;
    }

    let query: any;
    try {
      query = { _id: new ObjectId(id) };
    } catch {
      query = { _id: id };
    }

    const result = await tablesCollection.updateOne(query, { $set: updateDoc });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Table updated successfully' });
  } catch (error: any) {
    console.error('Update table error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update table' }, { status: 500 });
  }
}

// DELETE: Delete table (ADMIN / SUPERADMIN ONLY)
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Table ID is required' }, { status: 400 });
    }

    const tablesCollection = await getCollection('tables');

    let query: any;
    try {
      query = { _id: new ObjectId(id) };
    } catch {
      query = { _id: id };
    }

    const result = await tablesCollection.deleteOne(query);

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Table deleted successfully' });
  } catch (error: any) {
    console.error('Delete table error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete table' }, { status: 500 });
  }
}