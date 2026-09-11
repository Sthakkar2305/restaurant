import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';

// GET: Fetch restaurant profile settings
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

// POST: Save or update restaurant profile settings
export async function POST(request: NextRequest) {
  try {
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

    if (!restaurantName || !restaurantName.trim()) {
      return NextResponse.json({ error: 'Restaurant Name is required' }, { status: 400 });
    }

    const settingsCollection = await getCollection('restaurant_profile');

    const updateDoc = {
      restaurantName: restaurantName.trim(),
      tagline: tagline || '',
      address: address || '',
      phone: phone || '',
      email: email || '',
      gstin: gstin || '',
      fssai: fssai || '',
      serviceChargePercent: Number(serviceChargePercent ?? 10),
      gstPercent: Number(gstPercent ?? 5),
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
