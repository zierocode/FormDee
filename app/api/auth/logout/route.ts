import { NextResponse } from 'next/server'
import { removeAdminKeyCookie } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    await removeAdminKeyCookie()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
