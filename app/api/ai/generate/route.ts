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
  return `You are a professional form design expert with deep knowledge of user experience, conversion optimization, and business requirements. Analyze the user's request thoroughly and create a high-quality, context-aware form that precisely meets their needs.

## USER REQUEST
"${userPrompt}"

## CRITICAL REQUIREMENTS

### 1. CONTEXT ANALYSIS FIRST
Before generating the form, understand:
- **Primary Purpose**: What is this form trying to accomplish?
- **Target Audience**: Who will fill this out? (professionals, customers, general public, etc.)
- **Business Context**: Is this for lead generation, service delivery, compliance, feedback, etc.?
- **Data Sensitivity**: What level of information are we collecting?

### 2. SMART COMPLETION MANDATE
- **Auto-Generate ALL Fields**: Never leave fields empty or generic
- **Industry-Specific Defaults**: Apply domain expertise (legal forms need different fields than restaurant feedback)
- **Professional Copy**: Write clear, actionable labels and help text
- **Intelligent Validation**: Add appropriate constraints, patterns, and requirements
- **Complete Configuration**: Set proper file types, size limits, date ranges, number bounds

### 3. QUALITY STANDARDS
- **Crystal Clear Purpose**: Title and description must immediately convey the form's value
- **Logical Flow**: Fields should follow natural user mental models
- **Professional Language**: Use industry-appropriate terminology
- **Accessibility**: Labels and help text that work for all users
- **Conversion Optimized**: Minimize friction while collecting necessary data

## REQUIRED JSON STRUCTURE
{
  "title": "Specific, benefit-focused title (not generic)",
  "description": "Clear explanation of purpose, time to complete, and what happens after submission",
  "refKey": "descriptive-kebab-case-key-max-30-chars",
  "fields": [
    {
      "key": "semantic_field_key",
      "label": "Action-oriented field label",
      "type": "most_appropriate_field_type",
      "required": true_or_false_based_on_business_need,
      "placeholder": "Specific, helpful example text",
      "helpText": "Clear guidance when field might be confusing",
      "options": ["Contextually relevant options"], // for select/radio/checkbox
      "min": contextual_minimum, // for number/date fields
      "max": contextual_maximum, // for number/date fields
      // Enhanced validation system - use these instead of raw regex
      "validationRule": "user_friendly_validation_rule", // e.g., "phone_number", "email_domain", "letters_only", "url", etc.
      "customPattern": "custom_regex_if_using_custom_regex_rule", // only for validationRule: "custom_regex"
      "validationDomain": "domain.com", // only for validationRule: "email_domain"
      "pattern": "fallback_regex_for_backward_compatibility", // deprecated - use validationRule instead
      "acceptedTypes": [".relevant", ".file", ".types"], // for file fields
      "maxFileSize": reasonable_size_in_bytes, // for file fields
      "allowMultiple": true_or_false_based_on_need // for file fields
    }
  ]
}

## CONTEXT-AWARE FIELD SUGGESTIONS

### Contact/Lead Forms
- Full name (first_name, last_name or full_name based on formality)
- Professional email with email validation
- Phone with proper format pattern
- Company/organization if B2B
- Specific inquiry type (select dropdown)
- Detailed message with helpful placeholder

### Registration/Application Forms
- Required identification fields
- Contact information with validation
- Qualification questions (experience, location, availability)
- Document uploads with specific file types
- Agreement checkboxes where legally required

### Feedback/Survey Forms
- Rating scales (1-5 or 1-10 based on context)
- Categorical selections for specific feedback areas
- Open text for detailed feedback
- Optional demographic fields
- Recommendation likelihood (NPS)

### E-commerce/Order Forms
- Product selection with clear options
- Quantity with reasonable min/max
- Customer details with validation
- Delivery/billing information
- Special instructions
- Terms acceptance

### Event/Booking Forms
- Event/service selection
- Date/time preferences with appropriate constraints
- Participant information
- Special requirements/accommodations
- Contact details for confirmation

## INTELLIGENT DEFAULTS BY INDUSTRY

### Professional Services
- Formal language, comprehensive contact info
- Business-focused field labels
- Professional file types (.pdf, .docx)
- Longer text areas for detailed requests

### Retail/Consumer
- Casual, friendly language
- Simple, quick-to-complete fields
- Image uploads for product issues
- Rating systems for satisfaction

### Healthcare/Legal
- Compliance-focused language
- Required consent fields
- Secure file uploads
- Detailed information collection

### Education
- Student/parent information
- Academic-relevant options
- Document submissions
- Emergency contacts

## VALIDATION & UX RULES
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
2. **Email fields**: Always use email type (no additional validation needed)
3. **Phone fields**: Use text type with validationRule: "phone_number"
4. **Date fields**: Set realistic min/max ranges
5. **File uploads**: Specify relevant file types and reasonable size limits
6. **Required fields**: Only mark as required if absolutely necessary for the form's purpose
7. **Select options**: Provide 3-8 relevant choices, avoid overwhelming users
8. **Text areas**: Set appropriate placeholder text showing expected length/format

## FINAL CHECK
Before responding, verify:
- ✅ Every field has contextual, helpful content (no generic placeholders)
- ✅ Form title directly relates to user's request
- ✅ Field progression makes logical sense
- ✅ Appropriate validation for all input types
- ✅ Professional, clear language throughout
- ✅ Complete technical configuration (file types, sizes, patterns)

Generate only valid JSON. No additional text or formatting.`
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
          // Enhanced validation system support
          validationRule: field.validationRule || undefined,
          pattern: field.pattern || undefined,
          customPattern: field.customPattern || undefined,
          validationDomain: field.validationDomain || undefined,
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
