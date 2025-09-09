import { z } from 'zod'

export const loginSchema = z.object({
  adminKey: z.string().min(32, 'Admin key must be at least 32 characters'),
  returnUrl: z.string().optional(),
})

export type LoginData = z.infer<typeof loginSchema>

export const settingsSchema = z.object({
  aiModel: z.string().min(1, 'AI model is required'),
  apiKey: z.string().min(1, 'API key is required'),
  baseUrl: z.string().url('Invalid base URL').optional(),
  maxTokens: z
    .number()
    .min(1, 'Max tokens must be positive')
    .max(32000, 'Max tokens too high')
    .optional(),
})

export type SettingsData = z.infer<typeof settingsSchema>
