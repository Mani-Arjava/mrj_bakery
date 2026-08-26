import { NextResponse } from 'next/server';
import { isInventoryAuthenticated } from '@/lib/inventory/auth';
import { postExpense, postProduction, postPurchase, postSale } from '@/lib/inventory/excel';
import type { ExpenseInput, ProductionInput, PurchaseInput, SaleInput } from '@/lib/inventory/types';

export async function POST(request: Request, context: { params: Promise<{ type: string }> }) {
  if (!await isInventoryAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { const { type } = await context.params; const body = await request.json();
    if (type === 'purchase') return NextResponse.json(await postPurchase(body as PurchaseInput), { status: 201 });
    if (type === 'production') return NextResponse.json(await postProduction(body as ProductionInput), { status: 201 });
    if (type === 'sale') return NextResponse.json(await postSale(body as SaleInput), { status: 201 });
    if (type === 'expense') return NextResponse.json(await postExpense(body as ExpenseInput), { status: 201 });
    return NextResponse.json({ error: 'Unknown transaction type.' }, { status: 404 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not post transaction.' }, { status: 400 }); }
}
