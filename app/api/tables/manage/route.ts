import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const { name, number } = await request.json();
    const tables = await getCollection('tables');
    
    await tables.insertOne({
      name,
      table_number: parseInt(number),
      seating_capacity: 4,
      status: 'available',
      currentWaiterId: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  const tables = await getCollection('tables');
  const { ObjectId } = require('mongodb');
  await tables.deleteOne({ _id: new ObjectId(id) });
  
  return NextResponse.json({ success: true });
}