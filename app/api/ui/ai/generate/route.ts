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
            content: `You are a professional form design expert. Analyze the user's request and create a context-aware, high-quality form.

CRITICAL REQUIREMENTS:
1. UNDERSTAND CONTEXT: Determine the form's purpose, audience, and business context
2. SMART COMPLETION: Auto-generate ALL field details - never leave generic placeholders
3. PROFESSIONAL QUALITY: Use clear, actionable language and appropriate validation

Return a JSON object with this structure:
{
  "title": "Specific, benefit-focused title",
  "description": "Clear purpose and what happens after submission",
  "fields": [
    {
      "name": "semantic_field_name",
      "label": "Action-oriented field label",
      "type": "text|email|number|date|textarea|select|radio|checkbox|file",
      "required": true_or_false_based_on_business_need,
      "placeholder": "Specific, helpful example text",
      "options": ["Contextually relevant options"], // for select/radio/checkbox
      // Enhanced validation system - use these instead of raw regex
      "validationRule": "user_friendly_validation_rule", // e.g., "phone_number", "email_domain", "letters_only", "url", etc.
      "customPattern": "custom_regex_if_using_custom_regex_rule", // only for validationRule: "custom_regex"
      "validationDomain": "domain.com", // only for validationRule: "email_domain"
      "pattern": "fallback_regex_for_backward_compatibility", // deprecated - use validationRule instead
      "min": contextual_minimum, // for number/date fields
      "max": contextual_maximum, // for number/date fields
      "acceptedTypes": [".relevant", ".file", ".types"], // for file fields
      "maxFileSize": 5242880 // reasonable size in bytes for files
    }
  ]
}

VALIDATION RULES:
1. **Text fields with validation**: Use validationRule instead of raw regex patterns:
   - "letters_only" - Only letters (A-Z, a-z)
   - "letters_numbers" - Letters and numbers only
   - "letters_numbers_spaces" - Letters, numbers, and spaces
   - "phone_number" - Phone number format
   - "postal_code" - ZIP/postal code format
   - "numbers_only" - Only numeric digits
   - "url" - Website URL validation
   - "email_domain" - Email from specific domain (set validationDomain)
   - "no_special_chars" - Letters, numbers, spaces, hyphens, underscores
   - "username" - Valid username format (3-20 chars)
   - "custom_regex" - Custom pattern (set customPattern)
   - "none" - No validation
2. **Email fields**: Use email type (no additional validation needed)
3. **Phone fields**: Use text type with validationRule: "phone_number"
4. **File uploads**: Set relevant file types and size limits
5. **Required fields**: Only if absolutely necessary
6. **Select options**: Provide 3-8 relevant choices

Generate complete, professional forms with contextual field details.`,
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

    // Transform field format from AI response (name) to UI format (key)
    if (generatedContent.fields && Array.isArray(generatedContent.fields)) {
      generatedContent.fields = generatedContent.fields.map((field: any) => ({
        ...field,
        key: field.name || field.key, // Map 'name' to 'key' for UI compatibility
        label: field.label,
        type: field.type,
        required: field.required || false,
        placeholder: field.placeholder || '',
        helpText: field.helpText || '',
        options: field.options,
        // Enhanced validation system support
        validationRule: field.validationRule,
        pattern: field.pattern,
        customPattern: field.customPattern,
        validationDomain: field.validationDomain,
        min: field.min,
        max: field.max,
        acceptedTypes: field.acceptedTypes,
        maxFileSize: field.maxFileSize,
        allowMultiple: field.allowMultiple,
      }))
    }

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
