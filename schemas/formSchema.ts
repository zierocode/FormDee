import { z } from 'zod'
import { fieldSchema } from './fieldSchema'

export const formConfigSchema = z.object({
  refKey: z
    .string()
    .min(1, 'Reference key is required')
    .regex(
      /^[a-zA-Z0-9_\-]+$/,
      'Reference key must contain only letters, numbers, underscores, and hyphens'
    ),
  title: z.string().min(1, 'Form title is required'),
  description: z.string().optional(),
  slackWebhookUrl: z.string().url('Invalid Slack webhook URL').optional(),
  fields: z.array(fieldSchema).min(1, 'At least one field is required'),
})

export type FormConfigData = z.infer<typeof formConfigSchema>

// Form submission schema
export const formSubmissionSchema = z.object({
  refKey: z.string().min(1, 'Form reference key is required'),
  values: z.record(z.any()),
  files: z
    .array(
      z.object({
        fieldKey: z.string(),
        fileName: z.string(),
        fileUrl: z.string(),
        fileSize: z.number(),
        fileType: z.string(),
      })
    )
    .optional(),
})

export type FormSubmissionData = z.infer<typeof formSubmissionSchema>
