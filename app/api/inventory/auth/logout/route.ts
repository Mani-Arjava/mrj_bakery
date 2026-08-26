import { NextResponse } from 'next/server';
import { inventoryCookie } from '@/lib/inventory/auth';
export async function POST() { const response = NextResponse.json({ ok: true }); response.cookies.set(inventoryCookie.name, '', { ...inventoryCookie.options, maxAge: 0 }); return response; }
