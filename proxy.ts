import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (!path.startsWith('/inventory-management') || path.endsWith('/login')) return NextResponse.next();
  const token = request.cookies.get('im_session')?.value;
  if (!token) return NextResponse.redirect(new URL('/inventory-management/login', request.url));
  return NextResponse.next();
}
export const config = { matcher: ['/inventory-management/:path*'] };
