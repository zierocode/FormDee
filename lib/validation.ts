import { z } from 'zod'

export const fieldSchema = z.object({
  key: z.string().min(1).regex(/^[a-zA-Z0-9_\-]+$/),
  label: z.string().min(1),
  type: z.enum(['text', 'textarea', 'email', 'number', 'select', 'radio', 'checkbox', 'date', 'file']),
  required: z.boolean().optional().default(false),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  options: z.array(z.string().min(1)).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  acceptedTypes: z.array(z.string()).optional(),
  maxFileSize: z.number().optional(),
  allowMultiple: z.boolean().optional(),
})

export const formConfigSchema = z.object({
  refKey: z.string().min(1).regex(/^[a-zA-Z0-9_\-]+$/),
  title: z.string().min(1),
  description: z.string().optional(),
  responseSheetUrl: z.string().min(1),
  slackWebhookUrl: z.string().url().optional(),
  uploadFolderUrl: z.string().url().optional(),
  fields: z.array(fieldSchema).min(1),
})

export type FormConfigInput = z.infer<typeof formConfigSchema>

export function sanitizeText(input: unknown, maxLen = 1000) {
  const s = typeof input === 'string' ? input : String(input ?? '')
  return s.replace(/[\x00-\x1F\x7F]/g, '').slice(0, maxLen)
}

