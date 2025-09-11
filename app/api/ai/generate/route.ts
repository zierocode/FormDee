import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { z } from 'zod'
import { isAuthenticated } from '@/lib/auth-server'
import { logger } from '@/lib/logger'
import { supabase } from '@/lib/supabase'
import { FormField, FieldType } from '@/lib/types'

const aiGenerateSchema = z.object({
  prompt: z.string().min(10, 'Prompt must be at least 10 characters long'),
})

interface AIFormResponse {
  title: string
  description: string
  fields: FormField[]
  refKey: string
}

// Get AI settings from database
async function getAISettings() {
  const { data, error } = await supabase.from('Settings').select('*').eq('id', 1).single()

  if (error) {
    throw new Error('AI configuration not found. Please configure AI settings first.')
  }

  if (!data.api_key || !data.ai_model) {
    throw new Error('AI API key or model not configured. Please update your settings.')
  }

  return {
    apiKey: data.api_key,
    model: data.ai_model,
  }
}

// Create a comprehensive prompt for AI form generation
function createFormGenerationPrompt(userPrompt: string): string {
  return `You are an expert form builder AI. Create a comprehensive, professional form configuration based on the user's request.

User Request: "${userPrompt}"

Generate a JSON response with the following structure:
{
  "title": "Clear, professional form title",
  "description": "Brief description of the form's purpose",
  "refKey": "kebab-case-reference-key-max-30-chars",
  "fields": [
    {
      "key": "unique_field_key",
      "label": "User-friendly field label",
      "type": "field_type",
      "required": boolean,
      "placeholder": "helpful placeholder text",
      "helpText": "optional help text for complex fields",
      "options": ["option1", "option2"], // only for select/radio/checkbox
      "min": number, // for number/date fields
      "max": number, // for number/date fields
      "pattern": "regex_pattern", // for validation
      "acceptedTypes": [".pdf", ".doc"], // for file fields
      "maxFileSize": 5242880, // 5MB in bytes for file fields
      "allowMultiple": false // for file fields
    }
  ]
}

Available field types: text, textarea, email, number, select, radio, checkbox, date, file

Best Practices:
1. Use semantic field keys (snake_case)
2. Make essential fields required, optional ones not required
3. Add helpful placeholders and help text
4. For contact forms: include name, email, and message
5. For registration: include name, email, phone
6. For feedback: include rating options and comment fields
7. For job applications: include resume upload with proper file types
8. Use appropriate validation (email format, number ranges, etc.)
9. Create logical field groupings and flow
10. Keep forms concise but comprehensive
11. Use select/radio for limited options, text for open responses
12. Add file uploads when documents/attachments are needed

Ensure the response is valid JSON only, no additional text.`
}

// Call the AI API to generate form using OpenAI SDK
async function generateFormWithAI(prompt: string): Promise<AIFormResponse> {
  const settings = await getAISettings()
  const systemPrompt = createFormGenerationPrompt(prompt)

  // Initialize OpenAI client
  const openai = new OpenAI({
    apiKey: settings.apiKey,
  })

  try {
    // Determine the correct parameters based on model
    const isGPT5Model = settings.model.startsWith('gpt-5')
    const isGPT5Nano = settings.model === 'gpt-5-nano'
    const isGPT5Mini = settings.model === 'gpt-5-mini'

    // Configure parameters based on model type
    const completionParams: any = {
      model: settings.model,
      messages: [
        {
          role: 'system',
          content: isGPT5Model
            ? 'You are a professional form builder AI. You MUST generate actual JSON content in your response. Do not use all tokens for reasoning - ensure you output the required JSON structure. Always respond with valid JSON only, no additional text or formatting.'
            : 'You are a professional form builder AI. Always respond with valid JSON only, no additional text or formatting.',
        },
        {
          role: 'user',
          content: systemPrompt,
        },
      ],
      response_format: { type: 'json_object' },
    }

    if (isGPT5Model) {
      // GPT-5 models use max_completion_tokens and default temperature
      if (isGPT5Nano) {
        completionParams.max_completion_tokens = 2000
      } else if (isGPT5Mini) {
        completionParams.max_completion_tokens = 4000
      } else {
        completionParams.max_completion_tokens = 8000
      }
      // No temperature parameter for GPT-5 (uses default 1)
    } else {
      // GPT-4 and older models use max_tokens and custom temperature
      completionParams.max_tokens = 2000
      completionParams.temperature = 0.1
    }

    logger.info('Making API call with OpenAI SDK', {
      model: settings.model,
      tokenParams: isGPT5Model
        ? { max_completion_tokens: completionParams.max_completion_tokens }
        : { max_tokens: completionParams.max_tokens },
      temperature: completionParams.temperature || 'default',
    })

    const completion = await openai.chat.completions.create(completionParams)

    logger.debug('Full API response for model', { model: settings.model, completion })

    const aiResponse = completion.choices[0]?.message?.content
    if (!aiResponse || aiResponse.trim() === '') {
      logger.error(
        'AI returned empty content. Finish reason:',
        completion.choices[0]?.finish_reason
      )
      logger.error('Usage details:', completion.usage)

      // For GPT-5 models with reasoning tokens but empty content, provide a helpful error
      if (
        isGPT5Model &&
        completion.usage?.completion_tokens_details?.reasoning_tokens &&
        completion.usage.completion_tokens_details.reasoning_tokens > 0
      ) {
        throw new Error(
          'AI model used reasoning tokens but generated no content. Try using GPT-4o instead of GPT-5 models for form generation.'
        )
      }

      throw new Error('No response content from AI')
    }

    logger.debug('AI response content', { aiResponse })

    try {
      const parsedResponse = JSON.parse(aiResponse)

      // Validate the response structure
      if (
        !parsedResponse.title ||
        !parsedResponse.fields ||
        !Array.isArray(parsedResponse.fields)
      ) {
        throw new Error('Invalid AI response structure')
      }

      // Ensure all required field properties are present
      parsedResponse.fields = parsedResponse.fields.map((field: any) => {
        if (!field.key || !field.label || !field.type) {
          throw new Error(`Invalid field structure: ${JSON.stringify(field)}`)
        }
        return {
          key: field.key,
          label: field.label,
          type: field.type as FieldType,
          required: field.required || false,
          placeholder: field.placeholder || '',
          helpText: field.helpText || '',
          options: field.options || undefined,
          min: field.min || undefined,
          max: field.max || undefined,
          pattern: field.pattern || undefined,
          acceptedTypes: field.acceptedTypes || undefined,
          maxFileSize: field.maxFileSize || undefined,
          allowMultiple: field.allowMultiple || undefined,
        }
      })

      return {
        title: parsedResponse.title,
        description: parsedResponse.description || `Form generated from: "${prompt}"`,
        refKey: parsedResponse.refKey || generateRefKeyFromPrompt(prompt),
        fields: parsedResponse.fields,
      }
    } catch (parseError) {
      logger.error('Failed to parse AI response', { aiResponse })
      throw new Error('AI returned invalid JSON format')
    }
  } catch (error: any) {
    logger.error('AI generation error', error)
    // Re-throw the error instead of falling back to mock data
    throw error
  }
}

// Generate ref key from prompt
function generateRefKeyFromPrompt(prompt: string): string {
  return (
    prompt
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 30)
      .replace(/-+$/, '') || 'ai-generated-form'
  )
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication using cookie-based auth OR header-based auth
    const authenticated = await isAuthenticated()

    // Also check for x-admin-key header for direct API testing
    const adminKey = request.headers.get('x-admin-key')

    if (!authenticated && !adminKey) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 })
    }

    // If adminKey is provided, validate it against ADMIN_API_KEY
    if (adminKey && !authenticated) {
      const validApiKey = process.env.ADMIN_API_KEY
      if (!validApiKey || adminKey !== validApiKey) {
        return NextResponse.json({ error: 'Invalid admin key' }, { status: 401 })
      }
    }

    const body = await request.json()

    // Validate the request
    const validation = aiGenerateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { prompt } = validation.data

    try {
      // Generate form using AI API
      const generatedForm = await generateFormWithAI(prompt)

      return NextResponse.json(generatedForm)
    } catch (error: any) {
      logger.error('AI generation failed', error)
      return NextResponse.json(
        { error: error.message || 'Failed to generate form with AI' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    logger.error('AI Generate error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
