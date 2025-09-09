import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth-server'
import { supabaseAdmin } from '@/lib/supabase'

// We'll use a dedicated settings table in Supabase
// For now, we'll store settings as a single record with id = 1

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated (has valid admin cookie)
    const authenticated = await isAuthenticated()

    // Also check for x-admin-key header for backward compatibility
    const adminKey = request.headers.get('x-admin-key')

    if (!authenticated && !adminKey) {
      console.error('Settings API auth failed: No authentication')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // If adminKey is provided, validate it against ADMIN_API_KEY
    if (adminKey && !authenticated) {
      const validApiKey = process.env.ADMIN_API_KEY
      if (!validApiKey || adminKey !== validApiKey) {
        return NextResponse.json({ error: 'Invalid admin key' }, { status: 401 })
      }
    }

    // Fetch settings from Supabase
    const { data, error: supabaseError } = await supabaseAdmin
      .from('Settings')
      .select('*')
      .eq('id', 1)
      .single()

    if (supabaseError) {
      // If no settings exist yet, return empty settings
      if (supabaseError.code === 'PGRST116') {
        console.log('No settings found, returning defaults')
        return NextResponse.json({
          aiModel: 'gpt-5-mini',
          apiKey: '',
        })
      }

      console.error('Supabase error fetching settings:', supabaseError)
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }

    return NextResponse.json({
      aiModel: data.ai_model || 'gpt-5-mini',
      apiKey: data.api_key || '',
    })
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated (has valid admin cookie)
    const authenticated = await isAuthenticated()

    // Also check for x-admin-key header for backward compatibility
    const adminKey = request.headers.get('x-admin-key')

    if (!authenticated && !adminKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // If adminKey is provided, validate it against ADMIN_API_KEY
    if (adminKey && !authenticated) {
      const validApiKey = process.env.ADMIN_API_KEY
      if (!validApiKey || adminKey !== validApiKey) {
        return NextResponse.json({ error: 'Invalid admin key' }, { status: 401 })
      }
    }

    const body = await request.json()
    const { aiModel, apiKey } = body

    // Validate required fields
    if (!aiModel || !apiKey) {
      return NextResponse.json({ error: 'AI model and API key are required' }, { status: 400 })
    }

    // Check if settings already exist
    const { data: existingSettings } = await supabaseAdmin
      .from('Settings')
      .select('*')
      .eq('id', 1)
      .single()

    let result
    if (existingSettings) {
      // Update existing settings
      result = await supabaseAdmin
        .from('Settings')
        .update({
          ai_model: aiModel,
          api_key: apiKey,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1)
        .select()
        .single()
    } else {
      // Insert new settings
      result = await supabaseAdmin
        .from('Settings')
        .insert({
          id: 1,
          ai_model: aiModel,
          api_key: apiKey,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()
    }

    if (result.error) {
      console.error('Supabase error saving settings:', result.error)
      return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        aiModel: result.data.ai_model,
        apiKey: result.data.api_key,
      },
    })
  } catch (error) {
    console.error('Settings POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
