import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { MenuItem } from '@/lib/schemas';

export async function GET() {
  try {
    const menuCollection = await getCollection('menu_items');

    // Fetch all available menu items
    const items = (await menuCollection
      .find({ available: true })
      .sort({ category: 1, name: 1 })
      .toArray()) as MenuItem[];

    // Group items by category for easier display
    const categories = [
      'starters',
      'main_course',
      'desserts',
      'drinks',
    ];

    const groupedItems = categories.reduce(
      (acc, cat) => {
        acc[cat] = items.filter((item) => item.category === cat);
        return acc;
      },
      {} as Record<string, MenuItem[]>
    );

    return NextResponse.json({
      categories: categories.map((cat) => ({
        id: cat,
        name: cat
          .split('_')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' '),
      })),
      items,
      grouped: groupedItems,
    });
  } catch (error) {
    console.error('Menu fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch menu' },
      { status: 500 }
    );
  }
}
