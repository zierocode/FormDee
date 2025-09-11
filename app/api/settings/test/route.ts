import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth-server'

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated (has valid admin cookie)
    const authenticated = await isAuthenticated()

    // Also check for x-admin-key header for backward compatibility
    const adminKey = request.headers.get('x-admin-key')

    if (!authenticated && !adminKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // If adminKey is provided, validate it using Supabase Auth
    if (adminKey && !authenticated) {
      const { validateApiKey } = await import('@/lib/auth-supabase')
      const validation = await validateApiKey(adminKey, 'ui')
      if (!validation.isValid) {
        return NextResponse.json({ error: 'Invalid admin key' }, { status: 401 })
      }
    }

    const { aiModel, aiApiKey } = await request.json()

    if (!aiModel || !aiApiKey) {
      return NextResponse.json({ error: 'AI model and API key are required' }, { status: 400 })
    }

    try {
      // Make an actual API call to test the configuration
      // Using OpenAI API format as an example (adjust based on your AI provider)

      // Simple test prompt to validate the API key works
      const testPrompt = "Respond with 'OK' if you can read this message."

      // For OpenAI-compatible APIs
      const apiUrl = 'https://api.openai.com/v1/chat/completions'

      // Determine the correct parameters based on model
      const isGPT5Model = aiModel.startsWith('gpt-5')
      const tokenParams = isGPT5Model ? { max_completion_tokens: 10 } : { max_tokens: 10 }

      // GPT-5 models only support default temperature (1)
      const temperatureParams = isGPT5Model
        ? {} // Use default temperature for GPT-5
        : { temperature: 0 }

      const testResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${aiApiKey}`,
        },
        body: JSON.stringify({
          model: aiModel, // Use the model directly
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant for testing API connectivity.',
            },
            {
              role: 'user',
              content: testPrompt,
            },
          ],
          ...tokenParams,
          ...temperatureParams,
        }),
      })

      if (!testResponse.ok) {
        const errorData = await testResponse.json().catch(() => ({}))
        console.error('AI API test failed:', testResponse.status, errorData)

        // Handle specific error codes
        if (testResponse.status === 401) {
          return NextResponse.json(
            { error: 'Invalid API key. Please check your credentials.' },
            { status: 400 }
          )
        } else if (testResponse.status === 429) {
          return NextResponse.json(
            { error: 'Rate limit exceeded. Please try again later.' },
            { status: 400 }
          )
        } else if (testResponse.status === 404) {
          return NextResponse.json(
            { error: 'Invalid model. Please check the model name.' },
            { status: 400 }
          )
        }

        return NextResponse.json(
          { error: errorData.error?.message || 'Failed to connect to AI provider.' },
          { status: 400 }
        )
      }

      const responseData = await testResponse.json()

      // Verify we got a valid response
      if (!responseData.choices || responseData.choices.length === 0) {
        return NextResponse.json({ error: 'Invalid response from AI provider.' }, { status: 400 })
      }

      // Test successful
      return NextResponse.json({
        success: true,
        message: 'AI configuration tested successfully',
        model: aiModel,
        provider: 'OpenAI',
        response: responseData.choices[0].message?.content || 'OK',
        usage: responseData.usage,
      })
    } catch (apiError) {
      console.error('AI API test error:', apiError)
      return NextResponse.json(
        {
          error:
            'Failed to connect to AI provider. Please check your API key and network connection.',
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Settings test error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
