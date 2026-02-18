import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { getCollection, generateId } from '@/lib/mongodb';

export async function GET() {
  const users = await getCollection('users');
  const allWaiters = await users.find({ role: 'waiter' }).toArray();
  return NextResponse.json({ waiters: allWaiters });
}

export async function POST(request: NextRequest) {
  try {
    const { name, pin } = await request.json();
    const users = await getCollection('users');
    
    // Hash PIN
    const hashedPin = await bcrypt.hash(pin, 10);
    
    await users.insertOne({
      name,
      role: 'waiter',
      pinHash: hashedPin,
      email: `${name.replace(/\s+/g, '').toLowerCase()}@pos.com`,
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
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  const users = await getCollection('users');
  const { ObjectId } = require('mongodb');
  await users.deleteOne({ _id: new ObjectId(id) });
  
  return NextResponse.json({ success: true });
}