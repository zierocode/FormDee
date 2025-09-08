import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const COOKIE_NAME = 'admin_key';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function validateAdminKey(key: string): Promise<boolean> {
  const adminKey = process.env.ADMIN_UI_KEY;
  return key === adminKey;
}

export async function verifyApiKey(request: NextRequest): Promise<{ authorized: boolean; error?: string }> {
  const adminKey = request.headers.get('x-admin-key');
  
  if (!adminKey) {
    return { authorized: false, error: 'Admin key required' };
  }
  
  const isValid = await validateAdminKey(adminKey);
  if (!isValid) {
    return { authorized: false, error: 'Invalid admin key' };
  }
  
  return { authorized: true };
}

export async function setAdminKeyCookie(key: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, key, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/'
  });
}

export async function getAdminKeyCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

export async function removeAdminKeyCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function isAuthenticated(): Promise<boolean> {
  const key = await getAdminKeyCookie();
  if (!key) return false;
  return validateAdminKey(key);
}