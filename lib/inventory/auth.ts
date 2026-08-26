import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

const cookieName = 'im_session';
const secret = () => process.env.INVENTORY_SESSION_SECRET || 'inventory-development-secret-change-me';
const signature = (value: string) => createHmac('sha256', secret()).update(value).digest('base64url');

export function validCredentials(username: string, password: string) {
  const expectedUser = process.env.INVENTORY_ADMIN_USERNAME || 'imran123';
  const expectedPassword = process.env.INVENTORY_ADMIN_PASSWORD || 'mrj@2026';
  return username === expectedUser && password === expectedPassword;
}
export function makeSession() { const value = `admin.${Date.now() + 1000 * 60 * 60 * 12}`; return `${value}.${signature(value)}`; }
export function verifySession(token?: string) {
  if (!token) return false;
  const last = token.lastIndexOf('.'); if (last < 0) return false;
  const value = token.slice(0, last); const sig = token.slice(last + 1); const expected = signature(value);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  const [, expiry] = value.split('.'); return Number(expiry) > Date.now();
}
export async function isInventoryAuthenticated() { return verifySession((await cookies()).get(cookieName)?.value); }
// The browser must send this session to both the protected UI route and /api/inventory.
export const inventoryCookie = { name: cookieName, options: { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 12 } };
