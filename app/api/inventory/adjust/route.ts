import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getCollection } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/api-helpers';

// POST: Adjust stock level (+ inward or - outward) (ADMIN / SUPERADMIN ONLY)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const { id, type, amount, reason } = await request.json();

    if (!id || amount === undefined) {
      return NextResponse.json({ error: 'Item ID and adjustment amount are required' }, { status: 400 });
    }

    const qtyChange = Number(amount);
    if (isNaN(qtyChange) || qtyChange <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }

    const multiplier = type === 'outward' ? -1 : 1;
    const netChange = qtyChange * multiplier;

    const inventoryCollection = await getCollection('inventory_items');
    const transactionsCollection = await getCollection('inventory_transactions');

    let query: any;
    try {
      query = { _id: new ObjectId(id) };
    } catch {
      query = { _id: id };
    }

    const item = await inventoryCollection.findOne(query);
    if (!item) {
      return NextResponse.json({ error: 'Stock item not found' }, { status: 404 });
    }

    const currentQty = Number(item.quantity) || 0;
    const newQuantity = Math.max(0, currentQty + netChange);

    await inventoryCollection.updateOne(
      query,
      { $set: { quantity: newQuantity, updatedAt: new Date() } }
    );

    // Record transaction audit log
    await transactionsCollection.insertOne({
      itemId: id,
      itemName: item.name,
      type: type === 'outward' ? 'outward' : 'inward',
      amount: qtyChange,
      previousQuantity: currentQty,
      newQuantity,
      unit: item.unit,
      adjustedBy: auth.user?.name || 'Admin',
      reason: reason ? String(reason).slice(0, 200) : (type === 'outward' ? 'Kitchen Usage / Wastage' : 'Stock Purchase Inward'),
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: `Stock updated: ${item.name} is now ${newQuantity} ${item.unit}`,
      newQuantity,
    });
  } catch (error: any) {
    console.error('Adjust stock error:', error);
    return NextResponse.json({ error: error.message || 'Failed to adjust stock' }, { status: 500 });
  }
}
