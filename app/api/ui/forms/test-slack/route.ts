import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth } from '@/lib/auth-supabase'
import { ERROR_MESSAGES, HTTP_STATUS } from '@/lib/constants'
import { logger } from '@/lib/logger'

/**
 * UI-only endpoint for testing Slack webhooks
 *
 * IMPORTANT: This endpoint is ONLY for UI/browser access
 * - Uses UI authentication (cookie-based)
 * - DO NOT modify to accept API keys
 * - For API access, use /api/forms/test-slack instead
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
 * POST /api/ui/forms/test-slack - Test Slack webhook
 * Body: { refKey: string, slackWebhookUrl: string }
 */
export async function POST(req: NextRequest) {
  try {
    // Validate UI authentication
    const auth = await withApiAuth(req, 'ui')
    if (!auth.authenticated) {
      return errorResponse(auth.error || ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
    }

    const body = await req.json()
    const { refKey, slackWebhookUrl } = body

    if (!slackWebhookUrl) {
      return errorResponse('Slack webhook URL is required', HTTP_STATUS.BAD_REQUEST)
    }

    logger.info('[UI API] Testing Slack webhook', { refKey })

    // Send test message to Slack
    const testMessage = {
      text: `🧪 Test message from FormDee`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🧪 Test Notification',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `This is a test message from your form: *${refKey || 'New Form'}*`,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Status:*\n✅ Connected`,
            },
            {
              type: 'mrkdwn',
              text: `*Time:*\n${new Date().toLocaleString()}`,
            },
          ],
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: 'Form submissions will be sent to this channel.',
            },
          ],
        },
      ],
    }

    const slackResponse = await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testMessage),
    })

    if (!slackResponse.ok) {
      const errorText = await slackResponse.text()
      logger.error('[UI API] Slack webhook test failed', { error: errorText })
      return errorResponse(`Slack webhook test failed: ${errorText}`, HTTP_STATUS.BAD_REQUEST)
    }

    logger.info('[UI API] Slack webhook test successful')

    return NextResponse.json({
      ok: true,
      message: 'Slack webhook test successful',
    })
  } catch (error: any) {
    logger.error('[UI API] Slack test error:', error)
    return errorResponse(
      error?.message || 'Failed to test Slack webhook',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    )
  }
}
