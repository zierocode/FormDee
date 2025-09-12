import { NextRequest, NextResponse } from 'next/server'
import { ERROR_MESSAGES, HTTP_STATUS } from '@/lib/constants'
import { logger } from '@/lib/logger'
import { supabase } from '@/lib/supabase'
import {
  validateInput,
  getValidationErrorMessage,
  type ValidationRuleType,
} from '@/lib/validation-rules'

function errorResponse(message: string, code: number = HTTP_STATUS.BAD_REQUEST) {
  return NextResponse.json(
    { ok: false, error: { code: String(code), message } },
    { status: code as any }
  )
}

/**
 * Send Slack notification for form submission
 */
async function sendSlackNotification(
  webhookUrl: string,
  formTitle: string,
  formFields: any[],
  submissionData: any
) {
  try {
    const fields = formFields.map((field) => {
      const value = submissionData[field.key] || 'N/A'
      return {
        title: field.label || field.key,
        value: typeof value === 'object' ? JSON.stringify(value) : String(value),
        short: true,
      }
    })

    const payload = {
      text: `New form submission: ${formTitle}`,
      attachments: [
        {
          color: 'good',
          fields: fields,
          footer: 'FormDee',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`Slack API returned ${response.status}`)
    }

    return true
  } catch (error) {
    logger.error('Slack notification error:', error)
    return false
  }
}

/**
 * Send form submission to Google Sheets using user authentication
 */
async function sendToGoogleSheets(
  sheetUrl: string,
  formTitle: string, // No longer used but kept for compatibility
  formFields: any[],
  submissionData: any,
  refKey: string,
  userAuth?: { accessToken: string; refreshToken?: string }
) {
  try {
    if (!userAuth || !userAuth.accessToken) {
      logger.error('[Google Sheets] No user authentication provided for Google Sheets integration')
      return false
    }

    // Import the user-authenticated Google Sheets service
    const { appendToGoogleSheetsWithUser } = await import('@/lib/google-sheets-user')

    // Prepare data for Google Sheets
    const headers = ['Timestamp', ...formFields.map((field) => field.label || field.key)]
    const values = [
      new Date().toISOString(),
      ...formFields.map((field) => {
        const value = submissionData[field.key] || ''
        return typeof value === 'object' ? JSON.stringify(value) : String(value)
      }),
    ]

    logger.info(`[Google Sheets] Sending data to Google Sheets with user auth:`, {
      formTitle,
      refKey,
      headers,
      values,
    })

    // Send to Google Sheets using user authentication (with fixed sheet name)
    const result = await appendToGoogleSheetsWithUser(sheetUrl, headers, values, userAuth)

    if (result.success) {
      logger.info(`[Google Sheets] Successfully appended ${result.rowsAppended || 1} row(s)`)
      return true
    } else {
      logger.error(`[Google Sheets] Failed to append data: ${result.error}`)
      return false
    }
  } catch (error) {
    logger.error('Google Sheets integration error:', error)
    return false
  }
}

async function handlePost(req: NextRequest) {
  try {
    const body = await req.json()

    // Validate required fields
    if (!body || !body.refKey) {
      return errorResponse('Form refKey required', HTTP_STATUS.BAD_REQUEST)
    }

    if (!body.values || typeof body.values !== 'object') {
      return errorResponse('Form values required', HTTP_STATUS.BAD_REQUEST)
    }

    // Get form configuration from Supabase
    const { data: form, error: formError } = await supabase
      .from('Forms')
      .select('*')
      .eq('refKey', body.refKey)
      .single()

    if (formError || !form) {
      logger.error('Form lookup error:', formError)
      return errorResponse(`Form not found: ${body.refKey}`, HTTP_STATUS.NOT_FOUND)
    }

    // Parse fields if it's a string
    let formFields = form.fields
    if (typeof formFields === 'string') {
      try {
        formFields = JSON.parse(formFields)
      } catch (e) {
        logger.error('Failed to parse form fields:', e)
        formFields = []
      }
    }

    // Server-side validation of submitted values against form field rules
    const validationErrors: string[] = []

    for (const field of formFields) {
      const value = body.values[field.key]

      // Check required fields
      if (field.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
        validationErrors.push(`${field.label || field.key} is required`)
        continue
      }

      // Skip validation for empty optional fields
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        continue
      }

      // Validate based on field type and validation rules
      const stringValue = String(value)

      // Enhanced validation system - check validationRule first, then pattern
      if (field.validationRule && field.validationRule !== 'none') {
        const isValid = validateInput(
          stringValue,
          field.validationRule as ValidationRuleType,
          field.customPattern,
          field.validationDomain
        )

        if (!isValid) {
          const errorMessage = getValidationErrorMessage(field.validationRule as ValidationRuleType)
          validationErrors.push(`${field.label || field.key}: ${errorMessage}`)
        }
      } else if (field.pattern) {
        // Fallback to legacy pattern validation
        try {
          const regex = new RegExp(field.pattern)
          if (!regex.test(stringValue)) {
            validationErrors.push(`${field.label || field.key}: Invalid format`)
          }
        } catch (e) {
          logger.warn(`Invalid regex pattern for field ${field.key}: ${field.pattern}`)
        }
      }

      // Type-specific validation
      if (field.type === 'email' && stringValue) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(stringValue)) {
          validationErrors.push(`${field.label || field.key}: Invalid email address`)
        }
      }

      if (field.type === 'number') {
        const numValue = Number(value)
        if (isNaN(numValue)) {
          validationErrors.push(`${field.label || field.key}: Must be a valid number`)
        } else {
          if (field.min !== undefined && numValue < field.min) {
            validationErrors.push(`${field.label || field.key}: Must be at least ${field.min}`)
          }
          if (field.max !== undefined && numValue > field.max) {
            validationErrors.push(`${field.label || field.key}: Must be at most ${field.max}`)
          }
        }
      }
    }

    // Return validation errors if any
    if (validationErrors.length > 0) {
      logger.warn('Form validation failed:', { refKey: body.refKey, errors: validationErrors })
      return errorResponse(
        `Validation failed: ${validationErrors.join(', ')}`,
        HTTP_STATUS.BAD_REQUEST
      )
    }

    // Get IP and User Agent
    const ip =
      req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || req.ip || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // Extract file URLs from form values
    const fileUrls: Record<string, any> = {}
    for (const field of formFields) {
      if (field.type === 'file' && body.values[field.key]) {
        fileUrls[field.key] = body.values[field.key]
      }
    }

    // Prepare response data for Supabase
    const responseData = {
      refKey: body.refKey,
      formData: body.values,
      ip: ip,
      userAgent: userAgent,
      files: fileUrls,
      slackNotificationSent: false,
      slackNotificationError: null as string | null,
      googleSheetsSent: false,
      googleSheetsError: null as string | null,
      submittedAt: new Date().toISOString(),
      metadata: {
        formTitle: form.title,
        submissionSource: 'web',
        ...body.metadata,
      },
    }

    // Send Slack notification if configured and enabled
    if (form.slackWebhookUrl && form.slackEnabled) {
      const slackSent = await sendSlackNotification(
        form.slackWebhookUrl,
        form.title,
        formFields,
        body.values
      )
      responseData.slackNotificationSent = slackSent
      if (!slackSent) {
        responseData.slackNotificationError = 'Failed to send Slack notification'
      }
    }

    // Send to Google Sheets if configured and enabled
    if (form.googleSheetUrl && form.googleSheetEnabled) {
      // Get Google auth from database only (no cookies)
      const { getGoogleAuthFromDatabase, getMostRecentGoogleAuth } = await import(
        '@/lib/google-auth'
      )

      // Try to get auth associated with this form
      let googleAuth = await getGoogleAuthFromDatabase(body.refKey)

      // If no auth associated with form, try to get the most recent auth
      if (!googleAuth) {
        googleAuth = await getMostRecentGoogleAuth()
      }

      if (googleAuth && googleAuth.accessToken) {
        const sheetsSent = await sendToGoogleSheets(
          form.googleSheetUrl,
          form.title,
          formFields,
          body.values,
          body.refKey,
          {
            accessToken: googleAuth.accessToken,
            refreshToken: googleAuth.refreshToken,
          }
        )
        responseData.googleSheetsSent = sheetsSent
        if (!sheetsSent) {
          responseData.googleSheetsError = 'Failed to send to Google Sheets'
        }
      } else {
        logger.warn(
          '[Google Sheets] No user authentication available for Google Sheets integration'
        )
        responseData.googleSheetsSent = false
        responseData.googleSheetsError = 'Google Sheets integration requires user authentication'
      }
    }

    // Save to Supabase Responses table
    const { data: savedResponse, error: saveError } = await supabase
      .from('Responses')
      .insert(responseData)
      .select()
      .single()

    if (saveError) {
      logger.error('Error saving response:', saveError)
      return errorResponse('Failed to save form submission', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    // Submission saved successfully

    // Return success response
    return NextResponse.json({
      ok: true,
      data: {
        message: 'Form submitted successfully',
        responseId: savedResponse.id,
        submittedAt: savedResponse.submittedAt,
      },
    })
  } catch (error: any) {
    logger.error('[API] Submit error:', error)
    return errorResponse(
      error?.message || ERROR_MESSAGES.SUBMISSION_FAILED,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    )
  }
}

// Simple exports without middleware
export const POST = handlePost

// Add OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  })
}
