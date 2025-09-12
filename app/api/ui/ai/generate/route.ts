import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth } from '@/lib/auth-supabase'
import { ERROR_MESSAGES, HTTP_STATUS } from '@/lib/constants'
import { logger } from '@/lib/logger'
import { supabase } from '@/lib/supabase'

/**
 * UI-only endpoint for AI form generation
 *
 * IMPORTANT: This endpoint is ONLY for UI/browser access
 * - Uses UI authentication (cookie-based)
 * - DO NOT modify to accept API keys
 * - For API access, use /api/ai/generate instead
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
 * POST /api/ui/ai/generate - Generate form fields using AI
 * Body: { prompt: string }
 */
export async function POST(req: NextRequest) {
  try {
    // Validate UI authentication
    const auth = await withApiAuth(req, 'ui')
    if (!auth.authenticated) {
      return errorResponse(auth.error || ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
    }

    const body = await req.json()
    const { prompt } = body

    if (!prompt) {
      return errorResponse('Prompt is required', HTTP_STATUS.BAD_REQUEST)
    }

    logger.info('[UI API] AI form generation request', { promptLength: prompt.length })

    // Get API settings from database
    const { data: settings } = await supabase.from('Settings').select('*').single()

    if (!settings?.api_key) {
      return errorResponse(
        'AI API key not configured. Please configure it in settings.',
        HTTP_STATUS.BAD_REQUEST
      )
    }

    const model = settings.ai_model === 'gpt-5-mini' ? 'gpt-4o-mini' : settings.ai_model

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.api_key}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: `You are a form builder assistant. Generate form fields based on the user's description.
Return a JSON object with this structure:
{
  "title": "Form title",
  "description": "Form description",
  "fields": [
    {
      "name": "field_name",
      "label": "Field Label",
      "type": "text|email|number|date|textarea|select|radio|checkbox|file",
      "required": true|false,
      "placeholder": "optional placeholder",
      "options": ["option1", "option2"] // for select/radio/checkbox only
    }
  ]
}`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      const errorMessage = errorData?.error?.message || 'AI generation failed'
      logger.error('[UI API] AI generation failed', { error: errorMessage })
      return errorResponse(errorMessage, HTTP_STATUS.BAD_REQUEST)
    }

    const data = await response.json()
    const generatedContent = JSON.parse(data.choices[0].message.content)

    logger.info('[UI API] AI form generation successful', {
      fieldsCount: generatedContent.fields?.length || 0,
    })

    return NextResponse.json({
      ok: true,
      data: generatedContent,
    })
  } catch (error: any) {
    logger.error('[UI API] AI generate error:', error)
    return errorResponse(
      error?.message || 'Failed to generate form',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    )
  }
}
