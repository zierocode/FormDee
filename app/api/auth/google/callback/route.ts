import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth } from '@/lib/auth-supabase'
import { exchangeCodeForTokens, getUserInfo } from '@/lib/google-auth'
import { supabase } from '@/lib/supabase'

// Force dynamic rendering since we use headers for auth
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Handle Google OAuth2 callback
 */
async function handleGet(req: NextRequest) {
  try {
    // Validate authentication first
    const auth = await withApiAuth(req, 'any')

    if (!auth.authenticated) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const stateParam = searchParams.get('state')

    // Parse the state parameter
    let state: { type: string; refKey?: string } = { type: 'redirect' }
    try {
      if (stateParam) {
        state = JSON.parse(stateParam)
      }
    } catch {
      // Fallback for old format
      state = { type: stateParam === 'popup' ? 'popup' : 'redirect' }
    }

    const isPopup = state.type === 'popup'
    const refKey = state.refKey

    if (error) {
      console.error('[Google OAuth] Authorization error:', error)
      if (isPopup) {
        return new NextResponse(
          `
          <html>
            <body>
              <script>
                window.opener && window.opener.postMessage({ 
                  type: 'GOOGLE_AUTH_ERROR', 
                  error: '${error}' 
                }, '*');
                window.close();
              </script>
            </body>
          </html>
        `,
          { headers: { 'Content-Type': 'text/html' } }
        )
      }
      return NextResponse.redirect(new URL('/builder?google_auth=error', req.url))
    }

    if (!code) {
      if (isPopup) {
        return new NextResponse(
          `
          <html>
            <body>
              <script>
                window.opener && window.opener.postMessage({ 
                  type: 'GOOGLE_AUTH_ERROR', 
                  error: 'missing_code' 
                }, '*');
                window.close();
              </script>
            </body>
          </html>
        `,
          { headers: { 'Content-Type': 'text/html' } }
        )
      }
      return NextResponse.redirect(new URL('/builder?google_auth=missing_code', req.url))
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code)

    // Get user info
    const userInfo = await getUserInfo(tokens.accessToken)

    // Store or update the Google auth in database
    const { data: existingAuth } = await supabase
      .from('GoogleAuth')
      .select('*')
      .eq('email', userInfo.email)
      .single()

    let googleAuthId: string

    if (existingAuth) {
      // Update existing auth
      const { data: updatedAuth, error: updateError } = await supabase
        .from('GoogleAuth')
        .update({
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken || existingAuth.refresh_token,
          expiry_date: tokens.expiryDate,
          name: userInfo.name,
          picture: userInfo.picture,
          updated_at: new Date().toISOString(),
          last_used_at: new Date().toISOString(),
        })
        .eq('id', existingAuth.id)
        .select('id')
        .single()

      if (updateError) {
        console.error('[Google OAuth] Failed to update auth in database:', updateError)
        throw new Error('Failed to update authentication')
      }

      googleAuthId = updatedAuth.id
    } else {
      // Create new auth
      const { data: newAuth, error: insertError } = await supabase
        .from('GoogleAuth')
        .insert({
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          expiry_date: tokens.expiryDate,
        })
        .select('id')
        .single()

      if (insertError) {
        console.error('[Google OAuth] Failed to store auth in database:', insertError)
        throw new Error('Failed to store authentication')
      }

      googleAuthId = newAuth.id
    }

    // Link the Google auth to the specific form if refKey is provided
    if (refKey) {
      const { error: linkError } = await supabase
        .from('Forms')
        .update({ google_auth_id: googleAuthId })
        .eq('refKey', refKey)

      if (linkError) {
        console.error('[Google OAuth] Failed to link auth to form:', linkError)
        // Don't throw error here, auth was successful
      }
    }

    // No longer using cookies - auth is stored in database only

    if (isPopup) {
      // For popup flow, return HTML that posts message to parent
      return new NextResponse(
        `
        <html>
          <body>
            <script>
              window.opener && window.opener.postMessage({ 
                type: 'GOOGLE_AUTH_SUCCESS', 
                user: ${JSON.stringify(userInfo)} 
              }, '*');
              window.close();
            </script>
          </body>
        </html>
      `,
        { headers: { 'Content-Type': 'text/html' } }
      )
    } else {
      // For redirect flow, redirect back to builder with success
      return NextResponse.redirect(new URL('/builder?google_auth=success', req.url))
    }
  } catch (error: any) {
    console.error('[API] Google OAuth callback error:', error)
    return NextResponse.redirect(new URL('/builder?google_auth=error', req.url))
  }
}

export const GET = handleGet
