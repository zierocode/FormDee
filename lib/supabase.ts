import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!

// For server-side operations - using anon key for now
// In production, you should use the service role key from Supabase dashboard
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export interface FormRecord {
  id?: number
  refKey: string
  title: string
  description?: string
  slackWebhookUrl?: string
  slackEnabled?: boolean
  googleSheetUrl?: string
  googleSheetEnabled?: boolean
  google_auth_id?: string
  fields: any
  created_at?: string
  updated_at?: string
}
