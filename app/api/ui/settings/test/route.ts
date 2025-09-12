import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth } from '@/lib/auth-supabase'
import { ERROR_MESSAGES, HTTP_STATUS } from '@/lib/constants'
import { logger } from '@/lib/logger'

/**
 * UI-only endpoint for testing settings configuration
 *
 * IMPORTANT: This endpoint is ONLY for UI/browser access
 * - Uses UI authentication (cookie-based)
 * - DO NOT modify to accept API keys
 * - For API access, use /api/settings/test instead
 *
 * Security: UI key only - never accept API keys here
 */

function errorResponse(message: string, code: number = HTTP_STATUS.BAD_REQUEST) {
  return NextResponse.json(
    { ok: false, error: { code: String(code), message } },
    { status: code as any }
  )
}

/**
 * POST /api/ui/settings/test - Test AI API configuration
 * Body: { aiModel: string, aiApiKey: string }
 */
export async function POST(req: NextRequest) {
  try {
    // Validate UI authentication
    const auth = await withApiAuth(req, 'ui')
    if (!auth.authenticated) {
      return errorResponse(auth.error || ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
    }

    const body = await req.json()
    const { aiModel, aiApiKey } = body

    if (!aiModel || !aiApiKey) {
      return errorResponse('AI model and API key are required', HTTP_STATUS.BAD_REQUEST)
    }

    logger.info('[UI API] Testing AI configuration', { model: aiModel })

    // Test the OpenAI API with a minimal request
    const testResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aiApiKey}`,
      },
      body: JSON.stringify({
        model: aiModel === 'gpt-5-mini' ? 'gpt-4o-mini' : aiModel,
        messages: [{ role: 'user', content: 'Say "test"' }],
        max_tokens: 5,
        temperature: 0,
      }),
    })

    if (!testResponse.ok) {
      const errorData = await testResponse.json().catch(() => null)
      const errorMessage = errorData?.error?.message || 'Invalid API key or model'
      logger.error('[UI API] AI configuration test failed', { error: errorMessage })
      return errorResponse(errorMessage, HTTP_STATUS.BAD_REQUEST)
    }

    logger.info('[UI API] AI configuration test successful')

    return NextResponse.json({
      ok: true,
      message: 'Configuration is valid',
    })
  } catch (error: any) {
    logger.error('[UI API] Settings test error:', error)
    return errorResponse(
      error?.message || 'Failed to test configuration',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    )
  }
}
