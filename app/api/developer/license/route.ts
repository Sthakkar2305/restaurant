import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { checkRateLimit } from '@/lib/api-helpers';

interface SystemLicenseDoc {
  key: string;
  hotelName: string;
  expiresAt: string;
  isManualLock: boolean;
  contactPhone: string;
  contactEmail: string;
  customMessage: string;
  createdAt?: string;
  updatedAt?: string;
}

// Helper to get or create default license
async function getLicenseConfig() {
  const collection = await getCollection('system_license');
  const found = await collection.findOne({ key: 'main_license' });
  let license: SystemLicenseDoc;

  if (!found) {
    // Default to 1 year from today
    const defaultExpiry = new Date();
    defaultExpiry.setFullYear(defaultExpiry.getFullYear() + 1);

    const defaultDoc: SystemLicenseDoc = {
      key: 'main_license',
      hotelName: 'Restaurant POS',
      expiresAt: defaultExpiry.toISOString(),
      isManualLock: false,
      contactPhone: '+91 98765 43210',
      contactEmail: 'support@pos.com',
      customMessage: 'Your restaurant POS subscription has expired. Please contact the developer to renew your license.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await collection.insertOne(defaultDoc);
    license = defaultDoc;
  } else {
    license = found as unknown as SystemLicenseDoc;
  }

  const now = new Date();
  const expiryDate = new Date(license.expiresAt);
  const isExpired = license.isManualLock || now.getTime() > expiryDate.getTime();
  const remainingMs = Math.max(0, expiryDate.getTime() - now.getTime());
  const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));

  return {
    hotelName: license.hotelName || 'Restaurant POS',
    expiresAt: license.expiresAt,
    isManualLock: Boolean(license.isManualLock),
    isExpired,
    remainingDays,
    remainingMs,
    contactPhone: license.contactPhone || '',
    contactEmail: license.contactEmail || '',
    customMessage: license.customMessage || '',
  };
}

// GET: Check system license status (Public for client-side license guard)
export async function GET() {
  try {
    const license = await getLicenseConfig();
    return NextResponse.json({ success: true, license });
  } catch (error: any) {
    console.error('License check error:', error);
    return NextResponse.json({
      success: true,
      license: {
        hotelName: 'Restaurant POS',
        expiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
        isManualLock: false,
        isExpired: false,
        remainingDays: 365,
        remainingMs: 365 * 86400000,
        contactPhone: '',
        contactEmail: '',
        customMessage: '',
      },
    });
  }
}

// POST: Update license settings (STRICTLY PROTECTED BY DEVELOPER KEY WITH RATE LIMITING)
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';

    // Rate limit: 5 attempts per minute per IP to prevent brute forcing
    const rateCheck = checkRateLimit(`dev-lock-${ip}`, 5, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many failed attempts. Please wait ${Math.ceil(rateCheck.resetInMs / 1000)} seconds.` },
        { status: 429 }
      );
    }

    const devMasterKey = process.env.DEVELOPER_ADMIN_KEY || process.env.DEVELOPER_MASTER_KEY;
    if (!devMasterKey) {
      console.error('DEVELOPER_ADMIN_KEY is not defined in environment variables');
      return NextResponse.json(
        { error: 'Server security configuration error: DEVELOPER_ADMIN_KEY is not set in .env' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { devKey, expiresAt, hotelName, isManualLock, contactPhone, contactEmail, customMessage } = body;

    if (!devKey || devKey !== devMasterKey) {
      return NextResponse.json({ error: 'Invalid Developer Authorization Key' }, { status: 401 });
    }

    const collection = await getCollection('system_license');

    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if (expiresAt) updateData.expiresAt = new Date(expiresAt).toISOString();
    if (hotelName !== undefined) updateData.hotelName = String(hotelName).trim().slice(0, 100);
    if (isManualLock !== undefined) updateData.isManualLock = Boolean(isManualLock);
    if (contactPhone !== undefined) updateData.contactPhone = String(contactPhone).trim().slice(0, 30);
    if (contactEmail !== undefined) updateData.contactEmail = String(contactEmail).trim().slice(0, 100);
    if (customMessage !== undefined) updateData.customMessage = String(customMessage).trim().slice(0, 300);

    await collection.updateOne(
      { key: 'main_license' },
      { $set: updateData },
      { upsert: true }
    );

    const updatedLicense = await getLicenseConfig();
    return NextResponse.json({ success: true, license: updatedLicense });
  } catch (error: any) {
    console.error('License update error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update license' }, { status: 500 });
  }
}
