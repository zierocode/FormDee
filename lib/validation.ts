// Re-export schemas from the new schemas directory for backward compatibility
export { fieldSchema, type FieldData } from '@/schemas/fieldSchema'
export { formConfigSchema, formSubmissionSchema } from '@/schemas/formSchema'
export type { FormConfigData, FormSubmissionData } from '@/schemas/formSchema'
export {
  loginSchema,
  settingsSchema,
  type LoginData,
  type SettingsData,
} from '@/schemas/authSchema'
import type { FormConfigData } from '@/schemas/formSchema'

// Legacy type exports for backward compatibility
export type FormConfigInput = FormConfigData

export function sanitizeText(input: unknown, maxLen = 1000) {
  const s = typeof input === 'string' ? input : String(input ?? '')
  return s.replace(/[\x00-\x1F\x7F]/g, '').slice(0, maxLen)
}
