import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || 'https://uiabrvwokhzyxvttbvsk.supabase.co'
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpYWJydndva2h6eXh2dHRidnNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMzcxNDUsImV4cCI6MjA3MjkxMzE0NX0.uIRaf-iFwNFVDRVAM77LZukgscSeI6h5TEigqAH_1KI'

// For server-side operations - using anon key for now
// In production, you should use the service role key from Supabase dashboard
const supabaseServiceKey = supabaseAnonKey

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export interface FormRecord {
  id?: number
  refKey: string
  title: string
  description?: string
  responseSheetUrl?: string
  slackWebhookUrl?: string
  fields: any
  created_at?: string
  updated_at?: string
}
