import { NextRequest, NextResponse } from 'next/server'
import { verifyApiKey } from '@/lib/auth'

const GAS_BASE_URL = process.env.GAS_BASE_URL || ''

export async function GET(request: NextRequest) {
  try {
    const { authorized, error } = await verifyApiKey(request)
    if (!authorized) {
      console.error('Settings API auth failed:', error)
      return NextResponse.json(
        { error: error || 'Unauthorized' },
        { status: 401 }
      )
    }

    const adminApiKey = process.env.ADMIN_API_KEY
    if (!adminApiKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    console.log('Fetching settings from GAS:', `${GAS_BASE_URL}?op=settings&apiKey=${adminApiKey.substring(0, 10)}...`)
    const response = await fetch(`${GAS_BASE_URL}?op=settings&apiKey=${adminApiKey}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const result = await response.json()
    console.log('GAS settings response:', result)

    if (!result.ok) {
      console.error('GAS settings error:', result.error)
      return NextResponse.json(
        { error: result.error?.message || result.error || 'Failed to get settings' },
        { status: 400 }
      )
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, error } = await verifyApiKey(request)
    if (!authorized) {
      return NextResponse.json(
        { error: error || 'Unauthorized' },
        { status: 401 }
      )
    }

    const adminApiKey = process.env.ADMIN_API_KEY
    if (!adminApiKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const body = await request.json()

    const response = await fetch(`${GAS_BASE_URL}?op=settings&apiKey=${adminApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const result = await response.json()

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error?.message || 'Failed to update settings' },
        { status: 400 }
      )
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('Settings POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}