import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { getCollection, generateId } from '@/lib/mongodb';
import { checkRateLimit } from '@/lib/api-helpers';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    
    // Rate limit: 8 attempts per minute per IP
    const rateCheck = checkRateLimit(`login-${ip}`, 8, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many login attempts. Please wait ${Math.ceil(rateCheck.resetInMs / 1000)} seconds.` },
        { status: 429 }
      );
    }

    const { name, pin } = await request.json();

    if (!name || !pin || typeof name !== 'string' || typeof pin !== 'string') {
      return NextResponse.json({ error: 'User name and PIN are required' }, { status: 400 });
    }

    const cleanName = name.trim();
    const cleanPin = pin.trim();

    if (cleanPin.length < 4 || cleanPin.length > 8) {
      return NextResponse.json({ error: 'PIN must be 4 digits' }, { status: 400 });
    }

    const usersCollection = await getCollection('users');
    
    // Find user by Name (case-insensitive)
    const user = await usersCollection.findOne({
      name: { $regex: new RegExp(`^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid staff credentials' }, { status: 401 });
    }

    // Verify PIN
    const isPinValid = await bcrypt.compare(cleanPin, user.pinHash);

    if (!isPinValid) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }

    // Create session
    const sessionId = generateId();
    const sessionsCollection = await getCollection('sessions');
    
    await sessionsCollection.insertOne({
      sessionId,
      userId: String(user._id),
      userName: user.name,
      userRole: user.role,
      userEmail: user.email || '',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    const response = NextResponse.json({
      success: true,
      user: { name: user.name, role: user.role, email: user.email },
    });

    response.cookies.set('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 86400,
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}