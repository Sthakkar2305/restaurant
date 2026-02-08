// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { getCollection, generateId } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const { name, pin } = await request.json();

    if (!name || !pin) {
      return NextResponse.json({ error: 'User and PIN required' }, { status: 400 });
    }

    const usersCollection = await getCollection('users');
    
    // Find user by Name (e.g., "Waiter 1")
    const user = await usersCollection.findOne({ name });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // Verify PIN
    const isPinValid = await bcrypt.compare(pin, user.pinHash);

    if (!isPinValid) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }

    // Create session
    const sessionId = generateId();
    const sessionsCollection = await getCollection('sessions');
    
    await sessionsCollection.insertOne({
      sessionId,
      userId: user._id.toString(),
      userName: user.name,
      userRole: user.role,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    const response = NextResponse.json({
      success: true,
      user: { name: user.name, role: user.role },
    });

    response.cookies.set('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400,
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}