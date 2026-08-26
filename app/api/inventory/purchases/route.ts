import { NextResponse } from 'next/server';
import { isInventoryAuthenticated } from '@/lib/inventory/auth';
import { purchaseHistory } from '@/lib/inventory/excel';
export async function GET(request: Request) { if (!await isInventoryAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); const url = new URL(request.url); try { return NextResponse.json(await purchaseHistory(url.searchParams.get('date') || new Date().toISOString().slice(0, 10))); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to read purchase history.' }, { status: 502 }); } }
