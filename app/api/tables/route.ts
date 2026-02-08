import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { Table } from '@/lib/schemas';

export async function GET() {
  try {
    const tablesCollection = await getCollection('tables');

    const tables = (await tablesCollection
      .find({})
      .sort({ table_number: 1 })
      .toArray()) as Table[];

    return NextResponse.json({
      tables,
    });
  } catch (error) {
    console.error('Tables fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tables' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { tableId, status } = await request.json();

    const tablesCollection = await getCollection('tables');

    const result = await tablesCollection.updateOne(
      { _id: tableId },
      {
        $set: {
          status,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Table status updated',
    });
  } catch (error) {
    console.error('Table update error:', error);
    return NextResponse.json(
      { error: 'Failed to update table' },
      { status: 500 }
    );
  }
}
