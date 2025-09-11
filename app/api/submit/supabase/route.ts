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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

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
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      request.ip ||
      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Prepare response data
    const responseData = {
      refKey: body.refKey,
      formData: body.values,
      ip: ip,
      userAgent: userAgent,
      files: body.files || [],
      slackNotificationSent: false,
      slackNotificationError: null as string | null,
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
    console.error('Submit error:', error)
    return errorResponse(
      error?.message || ERROR_MESSAGES.SUBMISSION_FAILED,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    )
  }
}

// OPTIONS endpoint for CORS
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
