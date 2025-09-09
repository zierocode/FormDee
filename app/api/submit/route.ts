import { NextRequest, NextResponse } from 'next/server'
import { ERROR_MESSAGES, HTTP_STATUS } from '@/lib/constants'
import { supabase } from '@/lib/supabase'

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
    console.error('Slack notification error:', error)
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
      console.error('Form lookup error:', formError)
      return errorResponse(`Form not found: ${body.refKey}`, HTTP_STATUS.NOT_FOUND)
    }

    // Parse fields if it's a string
    let formFields = form.fields
    if (typeof formFields === 'string') {
      try {
        formFields = JSON.parse(formFields)
      } catch (e) {
        console.error('Failed to parse form fields:', e)
        formFields = []
      }
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
      submittedAt: new Date().toISOString(),
      metadata: {
        formTitle: form.title,
        submissionSource: 'web',
        ...body.metadata,
      },
    }

    // Send Slack notification if configured
    if (form.slackWebhookUrl) {
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

    // Save to Supabase Responses table
    const { data: savedResponse, error: saveError } = await supabase
      .from('Responses')
      .insert(responseData)
      .select()
      .single()

    if (saveError) {
      console.error('Error saving response:', saveError)
      return errorResponse('Failed to save form submission', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    console.log('[SUBMIT API] Submission saved:', {
      responseId: savedResponse.id,
      refKey: body.refKey,
    })

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
    console.error('[API] Submit error:', error)
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
