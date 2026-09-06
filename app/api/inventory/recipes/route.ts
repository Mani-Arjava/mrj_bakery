import { NextResponse } from 'next/server';
import { isInventoryAuthenticated } from '@/lib/inventory/auth';
import { getRecipeForProduct, saveRecipe } from '@/lib/inventory/excel';

export async function GET(request: Request) {
  if (!await isInventoryAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const url = new URL(request.url);
    const productId = url.searchParams.get('productId');
    if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 });
    const recipe = await getRecipeForProduct(productId);
    return NextResponse.json(recipe || { productId, productName: '', lines: [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not fetch recipe.' }, { status: 400 });
  }
}

export async function POST(request: Request) {
  if (!await isInventoryAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { productId, lines } = await request.json();
    if (!productId || !Array.isArray(lines)) {
      return NextResponse.json({ error: 'productId and lines array required' }, { status: 400 });
    }
    await saveRecipe(productId, lines);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not save recipe.' }, { status: 400 });
  }
}
