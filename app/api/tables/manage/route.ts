import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/mongodb';

// POST: Add new table
export async function POST(request: NextRequest) {
  try {
    const { name, number, capacity = 4, section = 'Main Hall' } = await request.json();
    const tablesCollection = await getCollection('tables');

    const tableNumber = parseInt(String(number), 10);
    if (isNaN(tableNumber)) {
      return NextResponse.json({ error: 'Valid table number required' }, { status: 400 });
    }

    // Check if table number already exists
    const existing = await tablesCollection.findOne({ table_number: tableNumber });
    if (existing) {
      return NextResponse.json({ error: `Table number ${tableNumber} already exists` }, { status: 400 });
    }

    const newTable = {
      name: name || `Table ${tableNumber}`,
      table_number: tableNumber,
      seating_capacity: parseInt(String(capacity), 10) || 4,
      section: section || 'Main Hall',
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

// PUT: Update existing table
export async function PUT(request: NextRequest) {
  try {
    const { id, name, number, capacity, section, status } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Table ID is required' }, { status: 400 });
    }

    const tablesCollection = await getCollection('tables');
    const updateDoc: any = {
      updatedAt: new Date(),
    };

    if (name) updateDoc.name = name;
    if (number !== undefined) updateDoc.table_number = parseInt(String(number), 10);
    if (capacity !== undefined) updateDoc.seating_capacity = parseInt(String(capacity), 10);
    if (section !== undefined) updateDoc.section = section;
    if (status !== undefined) {
      updateDoc.status = status;
      if (status === 'available') updateDoc.currentWaiterId = null;
    }

    const result = await tablesCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateDoc }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Table updated successfully' });
  } catch (error: any) {
    console.error('Update table error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update table' }, { status: 500 });
  }
}

// DELETE: Delete table
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Table ID is required' }, { status: 400 });
    }

    const tablesCollection = await getCollection('tables');
    const result = await tablesCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Table deleted successfully' });
  } catch (error: any) {
    console.error('Delete table error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete table' }, { status: 500 });
  }
}