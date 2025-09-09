import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth } from '@/lib/auth-supabase'
import { ERROR_MESSAGES, HTTP_STATUS } from '@/lib/constants'

async function handlePost(req: NextRequest) {
  try {
    // Validate authentication
    const auth = await withApiAuth(req, 'any')

    if (!auth.authenticated) {
      return NextResponse.json(
        { ok: false, error: auth.error || ERROR_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      )
    }

    const body = await req.json()
    const { refKey, slackWebhookUrl } = body

    if (!slackWebhookUrl) {
      return NextResponse.json(
        { ok: false, error: 'Slack webhook URL is required' },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    // Send test message to Slack
    const testMessage = {
      text: `🧪 Test notification from FormDee`,
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
            text: `This is a test notification from FormDee form: *${refKey || 'Unknown Form'}*`,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Status:* ✅ Connected`,
            },
            {
              type: 'mrkdwn',
              text: `*Time:* ${new Date().toLocaleString()}`,
            },
          ],
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: 'If you see this message, your Slack integration is working correctly!',
            },
          ],
        },
      ],
    }

    const slackResponse = await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage),
    })

    const responseText = await slackResponse.text()

    if (slackResponse.ok && responseText === 'ok') {
      return NextResponse.json({
        ok: true,
        message: 'Test message sent successfully!',
      })
    } else {
      return NextResponse.json(
        {
          ok: false,
          error: `Slack API error: ${responseText || 'Unknown error'}`,
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }
  } catch (error: any) {
    console.error('[API] Test Slack error:', error)
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || ERROR_MESSAGES.GENERIC,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    )
  }
}

export const POST = handlePost
