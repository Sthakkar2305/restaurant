import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCollection } from '@/lib/mongodb';

export interface AuthenticatedUser {
  userId: string;
  name: string;
  role: 'waiter' | 'chef' | 'admin' | 'superadmin';
  email?: string;
  sessionId: string;
}

/**
 * 🔒 In-Memory Rate Limiter with Sliding Window & Throttling
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  limit: number = 10,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetInMs: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetInMs: windowMs };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetInMs: Math.max(0, entry.resetAt - now) };
  }

  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count, resetInMs: Math.max(0, entry.resetAt - now) };
}

/**
 * 🔑 Get Authenticated User from MongoDB Session Collection
 */
export async function getAuthenticatedUser(request?: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    let sessionId: string | undefined;

    if (request) {
      sessionId = request.cookies.get('sessionId')?.value;
    } else {
      const cookieStore = await cookies();
      sessionId = cookieStore.get('sessionId')?.value;
    }

    if (!sessionId) {
      return null;
    }

    const sessionsCollection = await getCollection('sessions');
    const session = await sessionsCollection.findOne({ sessionId });

    if (!session) {
      return null;
    }

    // Check expiration
    if (session.expiresAt && new Date(session.expiresAt).getTime() <= Date.now()) {
      await sessionsCollection.deleteOne({ sessionId });
      return null;
    }

    return {
      userId: session.userId || String(session._id),
      name: session.userName || 'Staff',
      role: (session.userRole as any) || 'waiter',
      email: session.userEmail,
      sessionId,
    };
  } catch (error) {
    console.error('Session authentication error:', error);
    return null;
  }
}

/**
 * 🛡️ Require Authentication Middleware for Route Handlers
 */
export async function requireAuth(request: NextRequest): Promise<{
  user: AuthenticatedUser | null;
  response: NextResponse | null;
}> {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 }
      ),
    };
  }
  return { user, response: null };
}

/**
 * 🛡️ Require Specific Role(s) for Route Handlers
 */
export async function requireRole(
  request: NextRequest,
  allowedRoles: Array<'waiter' | 'chef' | 'admin' | 'superadmin'>
): Promise<{
  user: AuthenticatedUser | null;
  response: NextResponse | null;
}> {
  const auth = await requireAuth(request);
  if (auth.response || !auth.user) {
    return auth;
  }

  if (!allowedRoles.includes(auth.user.role)) {
    return {
      user: null,
      response: NextResponse.json(
        {
          error: `Forbidden: Requires one of [${allowedRoles.join(', ')}] role. Current role: ${auth.user.role}`,
        },
        { status: 403 }
      ),
    };
  }

  return { user: auth.user, response: null };
}

export const requireSuperAdmin = (req: NextRequest) => requireRole(req, ['superadmin']);
export const requireAdmin = (req: NextRequest) => requireRole(req, ['admin', 'superadmin']);
export const requireStaff = (req: NextRequest) =>
  requireRole(req, ['waiter', 'chef', 'admin', 'superadmin']);

/**
 * 💰 Authoritative Server-Side Financial Calculations
 */
export function calculateAuthoritativeTotals(
  items: Array<{ price: number; quantity: number }>,
  discountAmount: number = 0,
  gstPercent: number = 5,
  serviceChargePercent: number = 10
) {
  const subtotal = items.reduce((sum, item) => {
    const p = Math.max(0, Number(item.price) || 0);
    const q = Math.max(1, Math.floor(Number(item.quantity) || 1));
    return sum + p * q;
  }, 0);

  const tax = Math.round(subtotal * (gstPercent / 100) * 100) / 100;
  const serviceCharge = Math.round(subtotal * (serviceChargePercent / 100) * 100) / 100;
  const safeDiscount = Math.max(0, Math.min(subtotal + tax + serviceCharge, Number(discountAmount) || 0));
  const total = Math.max(0, Math.round(subtotal + tax + serviceCharge - safeDiscount));

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax,
    serviceCharge,
    discount: safeDiscount,
    total,
  };
}

/**
 * 💱 Currency Formatter
 */
export function formatCurrency(amount: number, currency: string = 'INR'): string {
  if (currency === 'INR') {
    return `₹${amount.toFixed(2)}`;
  }
  return `$${amount.toFixed(2)}`;
}

/**
 * 🕒 Date-Time Formatter
 */
export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleString('en-IN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 🧾 Generate Sequential-Format Invoice Number
 */
export function generateInvoiceNumber(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `INV-${timestamp}-${random}`;
}
