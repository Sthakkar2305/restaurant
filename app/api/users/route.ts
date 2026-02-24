import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET() {
  const users = await getCollection('users');
  const waiters = await users.find({ role: 'waiter' }).toArray();
  const chefs = await users.find({ role: 'chef' }).toArray(); // Fetch Chefs
  return NextResponse.json({ waiters, chefs });
}

export async function POST(request: NextRequest) {
  try {
    const { name, pin, role } = await request.json(); // Accept Role
    const users = await getCollection('users');
    const hashedPin = await bcrypt.hash(pin, 10);
    
    await users.insertOne({
      name,
      role: role || 'waiter', // Default to waiter if missing
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
  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }
  const users = await getCollection('users');
  await users.deleteOne({ _id: new ObjectId(id) });
  return NextResponse.json({ success: true });
}