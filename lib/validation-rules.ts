/**
 * User-friendly validation rules system
 * Replaces regex-only validation with predefined, easy-to-understand options
 */

export type ValidationRuleType =
  | 'none'
  | 'letters_only'
  | 'letters_numbers'
  | 'letters_numbers_spaces'
  | 'phone_number'
  | 'postal_code'
  | 'numbers_only'
  | 'url'
  | 'email_domain'
  | 'no_special_chars'
  | 'username'
  | 'custom_regex'

export interface ValidationRule {
  type: ValidationRuleType
  label: string
  description: string
  pattern?: string
  example?: string
  category: 'text' | 'contact' | 'numeric' | 'web' | 'custom'
}

export const VALIDATION_RULES: Record<ValidationRuleType, ValidationRule> = {
  none: {
    type: 'none',
    label: 'No validation',
    description: 'Accept any input',
    category: 'text',
  },

  letters_only: {
    type: 'letters_only',
    label: 'Letters only',
    description: 'Only alphabetic characters (A-Z, a-z)',
    pattern: '^[A-Za-z]+$',
    example: 'John',
    category: 'text',
  },

  letters_numbers: {
    type: 'letters_numbers',
    label: 'Letters and numbers',
    description: 'Only letters and numbers (no spaces or symbols)',
    pattern: '^[A-Za-z0-9]+$',
    example: 'User123',
    category: 'text',
  },

  letters_numbers_spaces: {
    type: 'letters_numbers_spaces',
    label: 'Letters, numbers, and spaces',
    description: 'Letters, numbers, and spaces only',
    pattern: '^[A-Za-z0-9\\s]+$',
    example: 'John Doe 123',
    category: 'text',
  },

  phone_number: {
    type: 'phone_number',
    label: 'Phone number',
    description: 'Phone number format with optional country code',
    pattern: '^[\\+]?[0-9\\s\\-\\(\\)]{7,15}$',
    example: '+1 (555) 123-4567',
    category: 'contact',
  },

  postal_code: {
    type: 'postal_code',
    label: 'Postal/ZIP code',
    description: 'Postal code or ZIP code format',
    pattern: '^[A-Za-z0-9\\s\\-]{3,10}$',
    example: '12345 or SW1A 1AA',
    category: 'contact',
  },

  numbers_only: {
    type: 'numbers_only',
    label: 'Numbers only',
    description: 'Only numeric digits (0-9)',
    pattern: '^[0-9]+$',
    example: '12345',
    category: 'numeric',
  },

  url: {
    type: 'url',
    label: 'Website URL',
    description: 'Valid website URL starting with http:// or https://',
    pattern: '^https?://[\\w\\-]+(\\.[\\w\\-]+)+[/#?]?.*$',
    example: 'https://example.com',
    category: 'web',
  },

  email_domain: {
    type: 'email_domain',
    label: 'Email domain restriction',
    description: 'Email must be from specific domain (set in help text)',
    pattern: '^[\\w\\.-]+@DOMAIN$', // Will be replaced with actual domain
    example: 'user@company.com',
    category: 'contact',
  },

  no_special_chars: {
    type: 'no_special_chars',
    label: 'No special characters',
    description: 'Letters, numbers, spaces, hyphens, and underscores only',
    pattern: '^[A-Za-z0-9\\s\\-_]+$',
    example: 'My-Project_Name',
    category: 'text',
  },

  username: {
    type: 'username',
    label: 'Username format',
    description: 'Valid username: letters, numbers, underscore, hyphen (3-20 chars)',
    pattern: '^[A-Za-z0-9_-]{3,20}$',
    example: 'user_name123',
    category: 'text',
  },

  custom_regex: {
    type: 'custom_regex',
    label: 'Custom pattern',
    description: 'Enter your own regular expression pattern',
    category: 'custom',
  },
}

export function getValidationRulesByCategory() {
  const categories = {
    text: [] as ValidationRule[],
    contact: [] as ValidationRule[],
    numeric: [] as ValidationRule[],
    web: [] as ValidationRule[],
    custom: [] as ValidationRule[],
  }

  Object.values(VALIDATION_RULES).forEach((rule) => {
    categories[rule.category].push(rule)
  })

  return categories
}

export function getPatternForRule(
  ruleType: ValidationRuleType,
  customPattern?: string,
  domain?: string
): string | undefined {
  if (ruleType === 'none') return undefined
  if (ruleType === 'custom_regex') return customPattern

  const rule = VALIDATION_RULES[ruleType]
  if (!rule.pattern) return undefined

  // Special handling for email domain restriction
  if (ruleType === 'email_domain' && domain) {
    return rule.pattern.replace('DOMAIN', domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  }

  return rule.pattern
}

export function validateInput(
  value: string,
  ruleType: ValidationRuleType,
  customPattern?: string,
  domain?: string
): boolean {
  if (ruleType === 'none') return true

  const pattern = getPatternForRule(ruleType, customPattern, domain)
  if (!pattern) return true

  try {
    const regex = new RegExp(pattern)
    return regex.test(value)
  } catch {
    return true // If regex is invalid, don't block the input
  }
}

export function getValidationErrorMessage(ruleType: ValidationRuleType): string {
  const rule = VALIDATION_RULES[ruleType]
  if (!rule) return 'Invalid input format'

  switch (ruleType) {
    case 'letters_only':
      return 'Only letters are allowed'
    case 'letters_numbers':
      return 'Only letters and numbers are allowed'
    case 'letters_numbers_spaces':
      return 'Only letters, numbers, and spaces are allowed'
    case 'phone_number':
      return 'Please enter a valid phone number'
    case 'postal_code':
      return 'Please enter a valid postal/ZIP code'
    case 'numbers_only':
      return 'Only numbers are allowed'
    case 'url':
      return 'Please enter a valid website URL (starting with http:// or https://)'
    case 'email_domain':
      return 'Email must be from the specified domain'
    case 'no_special_chars':
      return 'Special characters are not allowed'
    case 'username':
      return 'Username must be 3-20 characters long and contain only letters, numbers, underscore, or hyphen'
    default:
      return `Please match the required format: ${rule.description}`
  }
}
