import { NextResponse } from 'next/server';
import { isInventoryAuthenticated } from '@/lib/inventory/auth';
import { initializeWorkbook, sheetsConfigured } from '@/lib/inventory/excel';
export async function POST() { if (!await isInventoryAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); if (!sheetsConfigured()) return NextResponse.json({ error: 'Local Excel storage is not available.' }, { status: 400 }); try { await initializeWorkbook(); return NextResponse.json({ ok: true }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Workbook setup failed.' }, { status: 502 }); } }
