import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('sessionId')?.value;
    if (!sessionId) return NextResponse.json({ error: 'No session' }, { status: 401 });

    const sessions = await getCollection('sessions');
    const session = await sessions.findOne({ sessionId });

    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    return NextResponse.json({ 
        userId: session.userId, 
        name: session.userName,
        role: session.userRole 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}