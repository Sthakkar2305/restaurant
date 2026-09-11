import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/api-helpers';

// GET: Fetch restaurant profile settings (Public for receipt & invoice branding)
export async function GET() {
  try {
    const settingsCollection = await getCollection('restaurant_profile');
    let profile = await settingsCollection.findOne({ key: 'main_profile' });

    if (!profile) {
      profile = {
        key: 'main_profile',
        restaurantName: 'Restaurant POS',
        tagline: 'Delicious Food & Fast Service',
        address: 'Main Street, City',
        phone: '+91 98765 43210',
        email: 'contact@restaurant.com',
        gstin: '24AAAAA0000A1Z5',
        fssai: '10019021000000',
        serviceChargePercent: 10,
        gstPercent: 5,
        updatedAt: new Date().toISOString(),
      };
      await settingsCollection.insertOne(profile);
    }

    return NextResponse.json({ success: true, profile });
  } catch (error: any) {
    console.error('Fetch profile error:', error);
    return NextResponse.json({
      success: true,
      profile: {
        restaurantName: 'Restaurant POS',
        tagline: 'Delicious Food & Fast Service',
        address: 'Main Street, City',
        phone: '+91 98765 43210',
        gstin: '',
      },
    });
  }
}

// POST: Save or update restaurant profile settings (ADMIN / SUPERADMIN ONLY)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const body = await request.json();
    const {
      restaurantName,
      tagline,
      address,
      phone,
      email,
      gstin,
      fssai,
      serviceChargePercent,
      gstPercent,
    } = body;

    if (!restaurantName || !String(restaurantName).trim()) {
      return NextResponse.json({ error: 'Restaurant Name is required' }, { status: 400 });
    }

    const settingsCollection = await getCollection('restaurant_profile');

    const updateDoc = {
      restaurantName: String(restaurantName).trim().slice(0, 100),
      tagline: tagline ? String(tagline).trim().slice(0, 150) : '',
      address: address ? String(address).trim().slice(0, 250) : '',
      phone: phone ? String(phone).trim().slice(0, 30) : '',
      email: email ? String(email).trim().slice(0, 100) : '',
      gstin: gstin ? String(gstin).trim().slice(0, 30) : '',
      fssai: fssai ? String(fssai).trim().slice(0, 30) : '',
      serviceChargePercent: Math.max(0, Math.min(30, Number(serviceChargePercent ?? 10))),
      gstPercent: Math.max(0, Math.min(30, Number(gstPercent ?? 5))),
      updatedAt: new Date().toISOString(),
    };

    await settingsCollection.updateOne(
      { key: 'main_profile' },
      { $set: updateDoc },
      { upsert: true }
    );

    return NextResponse.json({ success: true, profile: updateDoc });
  } catch (error: any) {
    console.error('Save profile error:', error);
    return NextResponse.json({ error: error.message || 'Failed to save profile' }, { status: 500 });
  }
}
