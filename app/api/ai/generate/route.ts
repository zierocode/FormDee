import { NextRequest, NextResponse } from 'next/server'
import { verifyApiKey } from '@/lib/auth'

const GAS_BASE_URL = process.env.GAS_BASE_URL || ''

export async function POST(request: NextRequest) {
  try {
    const { authorized, error } = await verifyApiKey(request)
    if (!authorized) {
      return NextResponse.json(
        { error: error || 'Unauthorized' },
        { status: 401 }
      )
    }

    const { prompt } = await request.json()

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    const adminApiKey = process.env.ADMIN_API_KEY
    if (!adminApiKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // First, get the AI settings from the backend
    const settingsResponse = await fetch(`${GAS_BASE_URL}?op=settings&apiKey=${adminApiKey}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const settingsResult = await settingsResponse.json()
    console.log('AI Settings fetched:', { 
      ok: settingsResult.ok, 
      hasApiKey: !!settingsResult.data?.aiApiKey,
      model: settingsResult.data?.aiModel
    })
    
    if (!settingsResult.ok || !settingsResult.data?.aiApiKey) {
      return NextResponse.json(
        { error: 'AI not configured. Please go to Settings and configure your AI model and API key first.' },
        { status: 400 }
      )
    }

    const { aiModel, aiApiKey } = settingsResult.data

    // Call OpenAI API to generate form structure
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiApiKey}`
      },
      body: JSON.stringify({
        model: aiModel === 'gpt-5-mini' ? 'gpt-4o-mini' : (aiModel || 'gpt-4o-mini'),
        messages: [
          {
            role: 'system',
            content: `You are a form builder assistant. Generate a form structure based on the user's request.
            
            Return a JSON object with the following structure:
            {
              "title": "Form Title",
              "description": "Form Description",
              "fields": [
                {
                  "key": "unique_field_key",
                  "label": "Field Label",
                  "type": "text|email|number|date|textarea|select|radio|checkbox|file",
                  "required": true|false,
                  "placeholder": "Optional placeholder text",
                  "options": ["option1", "option2"] // Only for select, radio, checkbox types
                }
              ]
            }
            
            Important rules:
            - Field keys must be unique, lowercase, with underscores instead of spaces
            - Include appropriate field types based on the context
            - Add validation where appropriate (required fields, email format, etc.)
            - For select/radio/checkbox fields, provide sensible default options
            - Keep the form focused and not too long
            - Return ONLY valid JSON, no additional text`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json().catch(() => ({}))
      console.error('OpenAI API error:', openaiResponse.status, errorData)
      
      // Provide more specific error messages
      if (openaiResponse.status === 401) {
        return NextResponse.json(
          { error: 'Invalid API key. Please check your Settings and ensure your API key is correct.' },
          { status: 400 }
        )
      } else if (openaiResponse.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again in a moment.' },
          { status: 429 }
        )
      }
      
      return NextResponse.json(
        { error: errorData.error?.message || 'Failed to generate form. Please check your Settings and try again.' },
        { status: 500 }
      )
    }

    const aiData = await openaiResponse.json()
    const content = aiData.choices[0]?.message?.content

    if (!content) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      )
    }

    try {
      // Parse the AI response as JSON
      const formStructure = JSON.parse(content)
      
      // Validate the structure
      if (!formStructure.title || !formStructure.fields || !Array.isArray(formStructure.fields)) {
        throw new Error('Invalid form structure')
      }

      // Ensure all fields have required properties
      formStructure.fields = formStructure.fields.map((field: any, index: number) => ({
        key: field.key || `field_${index + 1}`,
        label: field.label || `Field ${index + 1}`,
        type: field.type || 'text',
        required: field.required || false,
        placeholder: field.placeholder || '',
        ...(field.options && { options: field.options })
      }))

      return NextResponse.json(formStructure)
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError)
      console.error('AI response content:', content)
      return NextResponse.json(
        { error: 'Failed to parse AI response. Please try again.' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('AI generate error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}