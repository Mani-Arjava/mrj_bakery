import { NextResponse } from 'next/server';
import { isInventoryAuthenticated } from '@/lib/inventory/auth';
import { postExpense, postProduction, postPurchase, postSale, postSupplierPayment, postCustomerPayment, postDailyClosing, getSupplierLedger, getCustomerLedger, getDailyClosingSummary, getRecipeForProduct, saveRecipe, getStockBalance } from '@/lib/inventory/excel';
import type { ExpenseInput, ProductionInput, PurchaseInput, SaleInput, SupplierPaymentInput, CustomerPaymentInput, DailyClosingInput } from '@/lib/inventory/types';

export async function POST(request: Request, context: { params: Promise<{ type: string }> }) {
  if (!await isInventoryAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { type } = await context.params;
    const body = await request.json();
    
    if (type === 'purchase') return NextResponse.json(await postPurchase(body as PurchaseInput), { status: 201 });
    if (type === 'production') return NextResponse.json(await postProduction(body as ProductionInput), { status: 201 });
    if (type === 'sale') return NextResponse.json(await postSale(body as SaleInput), { status: 201 });
    if (type === 'expense') return NextResponse.json(await postExpense(body as ExpenseInput), { status: 201 });
    if (type === 'supplier-payment') return NextResponse.json(await postSupplierPayment(body as SupplierPaymentInput), { status: 201 });
    if (type === 'customer-payment') return NextResponse.json(await postCustomerPayment(body as CustomerPaymentInput), { status: 201 });
    if (type === 'daily-closing') return NextResponse.json(await postDailyClosing(body as DailyClosingInput), { status: 201 });
    
    return NextResponse.json({ error: 'Unknown transaction type.' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not post transaction.' }, { status: 400 });
  }
}

export async function GET(request: Request, context: { params: Promise<{ type: string }> }) {
  if (!await isInventoryAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { type } = await context.params;
    const url = new URL(request.url);
    
    if (type === 'supplier-ledger') {
      const supplierId = url.searchParams.get('supplierId');
      if (!supplierId) return NextResponse.json({ error: 'supplierId required' }, { status: 400 });
      return NextResponse.json(await getSupplierLedger(supplierId));
    }
    
    if (type === 'customer-ledger') {
      const customerId = url.searchParams.get('customerId');
      if (!customerId) return NextResponse.json({ error: 'customerId required' }, { status: 400 });
      return NextResponse.json(await getCustomerLedger(customerId));
    }
    
    if (type === 'daily-closing') {
      const date = url.searchParams.get('date');
      if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });
      return NextResponse.json(await getDailyClosingSummary(date));
    }
    
    if (type === 'recipe') {
      const productId = url.searchParams.get('productId');
      if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 });
      const recipe = await getRecipeForProduct(productId);
      return NextResponse.json(recipe);
    }
    
    if (type === 'stock-balance') {
      const itemId = url.searchParams.get('itemId');
      if (!itemId) return NextResponse.json({ error: 'itemId required' }, { status: 400 });
      return NextResponse.json(await getStockBalance(itemId));
    }
    
    return NextResponse.json({ error: 'Unknown query type.' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not fetch data.' }, { status: 400 });
  }
}
