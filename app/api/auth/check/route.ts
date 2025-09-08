import { NextResponse } from 'next/server';
import { isAuthenticated, getAdminKeyCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const authenticated = await isAuthenticated();
    
    if (authenticated) {
      const adminKey = await getAdminKeyCookie();
      return NextResponse.json({ 
        authenticated: true,
        adminKey: adminKey 
      });
    } else {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}