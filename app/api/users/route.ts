import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/mongodb';
import { getAuthenticatedUser, requireSuperAdmin } from '@/lib/api-helpers';

// GET: Publicly returns non-sensitive waiter/chef profiles for login screen,
// or full staff list for authenticated Super Admin.
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    const usersCollection = await getCollection('users');

    // If caller is an authenticated Super Admin or Admin, return all users
    if (user && (user.role === 'superadmin' || user.role === 'admin')) {
      const allUsers = await usersCollection
        .find({}, { projection: { pinHash: 0 } })
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
    }

    // For unauthenticated login screen: ONLY return public Waiter and Chef display names
    const publicStaff = await usersCollection
      .find({ role: { $in: ['waiter', 'chef'] } }, { projection: { name: 1, role: 1 } })
      .sort({ name: 1 })
      .toArray();

    const waiters = publicStaff.filter((u) => u.role === 'waiter');
    const chefs = publicStaff.filter((u) => u.role === 'chef');

    return NextResponse.json({
      success: true,
      waiters,
      chefs,
      admins: [],
    });
  } catch (error: any) {
    console.error('Fetch users error:', error);
    return NextResponse.json({ error: 'Failed to fetch staff list' }, { status: 500 });
  }
}

// POST: Create a new user (STRICTLY SUPERADMIN ONLY)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request);
    if (auth.response) return auth.response;

    const { name, role = 'waiter', pin, email } = await request.json();

    if (!name || !pin) {
      return NextResponse.json({ error: 'Name and 4-digit PIN are required' }, { status: 400 });
    }

    const cleanPin = String(pin).trim();
    if (cleanPin.length < 4 || cleanPin.length > 8) {
      return NextResponse.json({ error: 'PIN must be between 4 and 8 digits' }, { status: 400 });
    }

    if (!['waiter', 'chef', 'admin', 'superadmin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 });
    }

    const usersCollection = await getCollection('users');

    // Check if name already exists
    const existing = await usersCollection.findOne({
      name: { $regex: new RegExp(`^${name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });

    if (existing) {
      return NextResponse.json({ error: `A user with name "${name}" already exists` }, { status: 400 });
    }

    const hashedPin = await bcrypt.hash(cleanPin, 10);
    const userEmail = email ? email.trim() : `${name.trim().replace(/\s+/g, '').toLowerCase()}@pos.com`;

    const newUser = {
      name: name.trim(),
      role,
      pinHash: hashedPin,
      email: userEmail,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await usersCollection.insertOne(newUser);

    return NextResponse.json({
      success: true,
      user: { _id: result.insertedId, name: newUser.name, role: newUser.role, email: userEmail },
    });
  } catch (error: any) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create user' }, { status: 500 });
  }
}

// PUT: Update an existing user (STRICTLY SUPERADMIN ONLY)
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request);
    if (auth.response) return auth.response;

    const { id, name, role, pin, email } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const usersCollection = await getCollection('users');
    const updateDoc: any = { updatedAt: new Date() };

    if (name) updateDoc.name = name.trim();
    if (role && ['waiter', 'chef', 'admin', 'superadmin'].includes(role)) {
      updateDoc.role = role;
    }
    if (email) updateDoc.email = email.trim();
    if (pin && String(pin).trim().length >= 4) {
      updateDoc.pinHash = await bcrypt.hash(String(pin).trim(), 10);
    }

    let query: any;
    try {
      query = { _id: new ObjectId(id) };
    } catch {
      query = { _id: id };
    }

    const result = await usersCollection.updateOne(query, { $set: updateDoc });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'User updated successfully' });
  } catch (error: any) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update user' }, { status: 500 });
  }
}

// DELETE: Remove a user (STRICTLY SUPERADMIN ONLY)
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const usersCollection = await getCollection('users');

    let query: any;
    try {
      query = { _id: new ObjectId(id) };
    } catch {
      query = { _id: id };
    }

    const result = await usersCollection.deleteOne(query);

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete user' }, { status: 500 });
  }
}