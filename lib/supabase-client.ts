// Client-side API wrapper for TanStack Query
// All Supabase interactions go through API routes - no direct database calls

import { FormConfig, FormField } from './types'

export interface FormRecord {
  id?: number
  refKey: string
  title: string
  description?: string
  responseSheetUrl?: string
  slackWebhookUrl?: string
  fields: FormField[] | string // Can be JSON string from database
  created_at?: string
  updated_at?: string
}

export interface ResponseRecord {
  id?: number
  refKey: string
  submittedAt: string
  ip?: string
  userAgent?: string
  data: Record<string, any>
}

// Form operations - all use API routes
export const formsApi = {
  // Get single form (public)
  async getForm(refKey: string): Promise<FormConfig> {
    const response = await fetch(`/api/forms?refKey=${encodeURIComponent(refKey)}`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error?.message || data.error || 'Failed to fetch form')
    }

    return data.data
  },

  // Get all forms (admin)
  async getForms(): Promise<FormConfig[]> {
    const response = await fetch('/api/ui/forms')
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error?.message || data.error || 'Failed to fetch forms')
    }

    return data.data
  },

  // Create or update form (admin)
  async upsertForm(form: FormConfig): Promise<FormConfig> {
    const response = await fetch('/api/ui/forms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error?.message || data.error || 'Failed to save form')
    }

    return data.data
  },

  // Delete form (admin)
  async deleteForm(refKey: string): Promise<void> {
    const response = await fetch(`/api/ui/forms?refKey=${encodeURIComponent(refKey)}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error?.message || data.error || 'Failed to delete form')
    }
  },
}

// Response operations - all use API routes
export const responsesApi = {
  // Get responses for a form
  async getResponses(
    refKey: string,
    options: {
      limit?: number
      offset?: number
      startDate?: string
      endDate?: string
    } = {}
  ): Promise<{ data: ResponseRecord[]; count: number }> {
    const params = new URLSearchParams({
      refKey,
      ...(options.limit && { limit: options.limit.toString() }),
      ...(options.offset && { offset: options.offset.toString() }),
      ...(options.startDate && { startDate: options.startDate }),
      ...(options.endDate && { endDate: options.endDate }),
    })

    const response = await fetch(`/api/ui/responses?${params}`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error?.message || data.error || 'Failed to fetch responses')
    }

    return data.data
  },

  // Submit form response (public)
  async submitResponse(refKey: string, values: Record<string, any>): Promise<{ id: string }> {
    const response = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refKey, values }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error?.message || data.error || 'Submission failed')
    }

    return data.data
  },

  // Get response count
  async getResponseCount(refKey: string): Promise<number> {
    const response = await fetch(`/api/responses/count?refKey=${encodeURIComponent(refKey)}`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error?.message || data.error || 'Failed to fetch response count')
    }

    return data.count
  },

  // Get response statistics for a form
  async getResponseStats(refKey: string): Promise<{ count: number; lastResponseDate?: string }> {
    const response = await fetch(`/api/ui/responses?refKey=${encodeURIComponent(refKey)}&limit=1`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error?.message || data.error || 'Failed to fetch response stats')
    }

    return {
      count: data.pagination?.total || 0,
      lastResponseDate: data.data?.[0]?.submittedAt,
    }
  },
}

// Settings operations - all use API routes
export const settingsApi = {
  // Get settings (admin)
  async getSettings(): Promise<{ aiModel: string; apiKey: string }> {
    const response = await fetch('/api/ui/settings')
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch settings')
    }

    return data
  },

  // Update settings (admin)
  async updateSettings(settings: { aiModel: string; apiKey: string }): Promise<void> {
    const response = await fetch('/api/ui/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update settings')
    }
  },

  // Test settings configuration (admin)
  async testSettings(settings: { aiModel: string; apiKey: string }): Promise<void> {
    const response = await fetch('/api/ui/settings/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        aiModel: settings.aiModel,
        aiApiKey: settings.apiKey,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Configuration test failed')
    }
  },
}

// Auth operations
export const authApi = {
  // Check authentication status
  async checkAuth(): Promise<{ authenticated: boolean; adminKey?: string }> {
    const response = await fetch('/api/auth/check')
    const data = await response.json()
    return {
      authenticated: response.ok,
      adminKey: data.adminKey,
    }
  },

  // Login
  async login(adminKey: string): Promise<void> {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminKey }),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Login failed')
    }
  },

  // Logout
  async logout(): Promise<void> {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error('Logout failed')
    }
  },
}
