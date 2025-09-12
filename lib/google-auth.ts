import { google } from 'googleapis'

export interface GoogleAuth {
  accessToken: string
  refreshToken: string
  expiryDate?: number
  email?: string
  name?: string
  picture?: string
}

export interface GoogleUserInfo {
  id: string
  email: string
  name: string
  picture?: string
}

/**
 * Create OAuth2 client for Google authentication
 */
export function createOAuth2Client() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  return oauth2Client
}

/**
 * Generate Google OAuth2 authorization URL
 */
export function getAuthUrl(isPopup: boolean = false, refKey?: string): string {
  const oauth2Client = createOAuth2Client()

  const scopes = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ]

  // Create state parameter with both popup info and refKey
  const state = JSON.stringify({
    type: isPopup ? 'popup' : 'redirect',
    refKey: refKey || null,
  })

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // Force consent to get refresh token
    // Add state parameter to track popup vs redirect and refKey
    state: state,
  })

  return url
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<GoogleAuth> {
  const oauth2Client = createOAuth2Client()

  try {
    const { tokens } = await oauth2Client.getToken(code)

    if (!tokens.access_token) {
      throw new Error('No access token received')
    }

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || '',
      expiryDate: tokens.expiry_date || undefined,
    }
  } catch (error) {
    console.error('Error exchanging code for tokens:', error)
    throw new Error('Failed to exchange authorization code for tokens')
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<GoogleAuth> {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ refresh_token: refreshToken })

  try {
    const { credentials } = await oauth2Client.refreshAccessToken()

    if (!credentials.access_token) {
      throw new Error('No access token received from refresh')
    }

    return {
      accessToken: credentials.access_token,
      refreshToken: credentials.refresh_token || refreshToken, // Keep original if not returned
      expiryDate: credentials.expiry_date || undefined,
    }
  } catch (error) {
    console.error('Error refreshing access token:', error)
    throw new Error('Failed to refresh access token')
  }
}

/**
 * Get user info from Google API
 */
export async function getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })

  try {
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const { data } = await oauth2.userinfo.get()

    return {
      id: data.id || '',
      email: data.email || '',
      name: data.name || '',
      picture: data.picture || undefined,
    }
  } catch (error) {
    console.error('Error getting user info:', error)
    throw new Error('Failed to get user information')
  }
}

/**
 * Create authenticated Google Sheets client
 */
export function createSheetsClient(accessToken: string) {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })

  return google.sheets({ version: 'v4', auth: oauth2Client })
}

/**
 * Validate if access token is still valid
 * Updated to always return true - tokens are considered valid forever
 * Refresh will be handled automatically by Google OAuth client when needed
 */
export async function validateAccessToken(_accessToken: string): Promise<boolean> {
  // Always return true - we'll rely on refresh tokens to get new access tokens when needed
  // This prevents unnecessary re-authentication prompts
  return true
}

// Cookie-based authentication functions removed - using database-only authentication

/**
 * Get Google auth from database by form's refKey
 */
export async function getGoogleAuthFromDatabase(refKey: string): Promise<GoogleAuth | null> {
  try {
    const { supabase } = await import('@/lib/supabase')

    // First, try to get form's Google auth ID
    const { data: form } = await supabase
      .from('Forms')
      .select('google_auth_id')
      .eq('refKey', refKey)
      .single()

    // If form has google_auth_id, use it
    if (form?.google_auth_id) {
      // Get Google auth credentials by ID
      const { data: googleAuth } = await supabase
        .from('GoogleAuth')
        .select('*')
        .eq('id', form.google_auth_id)
        .single()

      if (!googleAuth) {
        return null
      }

      // Update last used timestamp
      await supabase
        .from('GoogleAuth')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', googleAuth.id)

      return {
        accessToken: googleAuth.access_token,
        refreshToken: googleAuth.refresh_token,
        expiryDate: googleAuth.expiry_date,
        email: googleAuth.email,
        name: googleAuth.name,
        picture: googleAuth.picture,
      }
    }

    // If form doesn't have google_auth_id, return null
    // The form needs to be linked to a GoogleAuth record via google_auth_id
    return null
  } catch (error) {
    console.error('Error getting Google auth from database:', error)
    return null
  }
}

/**
 * Get most recent Google auth from database (for fallback)
 */
export async function getMostRecentGoogleAuth(): Promise<GoogleAuth | null> {
  try {
    const { supabase } = await import('@/lib/supabase')

    // Get most recent Google auth
    const { data: googleAuth } = await supabase
      .from('GoogleAuth')
      .select('*')
      .order('last_used_at', { ascending: false })
      .limit(1)
      .single()

    if (!googleAuth) {
      return null
    }

    // Update last used timestamp
    await supabase
      .from('GoogleAuth')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', googleAuth.id)

    return {
      accessToken: googleAuth.access_token,
      refreshToken: googleAuth.refresh_token,
      expiryDate: googleAuth.expiry_date,
    }
  } catch (error) {
    console.error('Error getting most recent Google auth:', error)
    return null
  }
}
