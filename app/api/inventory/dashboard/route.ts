import { NextResponse } from 'next/server';
import { isInventoryAuthenticated } from '@/lib/inventory/auth';
import { dashboard } from '@/lib/inventory/excel';
export async function GET() { if (!await isInventoryAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); try { return NextResponse.json(await dashboard()); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to read inventory data.' }, { status: 502 }); } }
