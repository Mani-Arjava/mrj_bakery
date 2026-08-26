import { NextResponse } from 'next/server';
import { inventoryCookie, makeSession, validCredentials } from '@/lib/inventory/auth';

export async function POST(request: Request) {
  const body = await request.json() as { username?: string; password?: string };
  if (!validCredentials(body.username || '', body.password || '')) return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
  const response = NextResponse.json({ ok: true }); response.cookies.set(inventoryCookie.name, makeSession(), inventoryCookie.options); return response;
}
