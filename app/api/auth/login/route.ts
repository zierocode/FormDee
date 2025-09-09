import { NextRequest, NextResponse } from 'next/server'
import { validateAdminKey, setAdminKeyCookie } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { adminKey } = await request.json()

    if (!adminKey) {
      return NextResponse.json({ error: 'Admin key is required' }, { status: 400 })
    }

    const isValid = await validateAdminKey(adminKey)

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid admin key' }, { status: 401 })
    }

    await setAdminKeyCookie(adminKey)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
