import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/mongodb';
import { Table } from '@/lib/schemas';
import { requireStaff } from '@/lib/api-helpers';

export async function GET() {
  try {
    const tablesCollection = await getCollection('tables');

    const tables = (await tablesCollection
      .find({})
      .sort({ table_number: 1 })
      .toArray()) as Table[];

    return NextResponse.json({
      success: true,
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

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireStaff(request);
    if (auth.response) return auth.response;

    const { tableId, status } = await request.json();

    if (!tableId || !status) {
      return NextResponse.json({ error: 'tableId and status are required' }, { status: 400 });
    }

    const tablesCollection = await getCollection('tables');

    let query: any;
    try {
      query = { _id: new ObjectId(tableId) };
    } catch {
      query = { _id: tableId };
    }

    const updateData: any = { status, updatedAt: new Date() };
    if (status === 'available') {
      updateData.currentWaiterId = null;
    }

    const result = await tablesCollection.updateOne(query, { $set: updateData });

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
