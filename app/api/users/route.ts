import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/mongodb';

// GET: List all users or grouped by roles
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get('role');

    const usersCollection = await getCollection('users');

    const query: any = {};
    if (roleFilter) {
      query.role = roleFilter;
    }

    const allUsers = await usersCollection
      .find(query, { projection: { pinHash: 0 } })
      .sort({ createdAt: -1 })
      .toArray();

    const waiters = allUsers.filter((u) => u.role === 'waiter');
    const chefs = allUsers.filter((u) => u.role === 'chef');
    const admins = allUsers.filter((u) => u.role === 'admin' || u.role === 'superadmin');

    return NextResponse.json({
      success: true,
      users: allUsers,
      waiters,
      chefs,
      admins,
    });
  } catch (error: any) {
    console.error('Fetch users error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST: Create a new user (Admin, Chef, Waiter)
export async function POST(request: NextRequest) {
  try {
    const { name, role = 'waiter', pin, email } = await request.json();

    if (!name || !pin) {
      return NextResponse.json({ error: 'Name and 4-digit PIN are required' }, { status: 400 });
    }

    if (!['waiter', 'chef', 'admin', 'superadmin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 });
    }

    const usersCollection = await getCollection('users');

    // Check if name already exists
    const existing = await usersCollection.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) {
      return NextResponse.json({ error: `A user with name "${name}" already exists` }, { status: 400 });
    }

    const hashedPin = await bcrypt.hash(String(pin), 10);
    const userEmail = email || `${name.replace(/\s+/g, '').toLowerCase()}@pos.com`;

    const newUser = {
      name,
      role,
      pinHash: hashedPin,
      email: userEmail,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await usersCollection.insertOne(newUser);

    return NextResponse.json({
      success: true,
      user: { _id: result.insertedId, name, role, email: userEmail },
    });
  } catch (error: any) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create user' }, { status: 500 });
  }
}

// PUT: Update an existing user
export async function PUT(request: NextRequest) {
  try {
    const { id, name, role, pin, email } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const usersCollection = await getCollection('users');

    const updateDoc: any = {
      updatedAt: new Date(),
    };

    if (name) updateDoc.name = name;
    if (role && ['waiter', 'chef', 'admin', 'superadmin'].includes(role)) {
      updateDoc.role = role;
    }
    if (email) updateDoc.email = email;
    if (pin && String(pin).trim().length > 0) {
      updateDoc.pinHash = await bcrypt.hash(String(pin).trim(), 10);
    }

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateDoc }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'User updated successfully' });
  } catch (error: any) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update user' }, { status: 500 });
  }
}

// DELETE: Remove a user
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const usersCollection = await getCollection('users');
    const result = await usersCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete user' }, { status: 500 });
  }
}