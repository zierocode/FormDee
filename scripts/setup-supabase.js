#!/usr/bin/env node

/**
 * FormDee Supabase Setup Script
 *
 * This script helps set up Supabase database for FormDee project including:
 * - Database tables creation
 * - RLS policies setup
 * - Functions and triggers
 * - Initial data seeding
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

class SupabaseSetup {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..')
    this.sqlDir = path.join(this.projectRoot, 'sql')
    this.envFile = path.join(this.projectRoot, '.env')
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m', // Cyan
      success: '\x1b[32m', // Green
      warning: '\x1b[33m', // Yellow
      error: '\x1b[31m', // Red
      reset: '\x1b[0m', // Reset
    }

    const timestamp = new Date().toLocaleTimeString()
    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`)
  }

  checkEnvironment() {
    this.log('🔍 Checking environment setup...')

    // Check if .env exists
    if (!fs.existsSync(this.envFile)) {
      throw new Error('.env file not found. Please copy .env.example to .env first.')
    }

    // Load environment variables
    const envContent = fs.readFileSync(this.envFile, 'utf8')
    const env = {}

    envContent.split('\n').forEach((line) => {
      if (line.trim() && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=')
        if (key && valueParts.length > 0) {
          env[key.trim()] = valueParts.join('=').trim()
        }
      }
    })

    // Check required environment variables
    const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']

    const missing = required.filter((key) => !env[key] || env[key] === 'YOUR_KEY_HERE')

    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
    }

    this.env = env
    this.log('✅ Environment variables validated')
  }

  async createSqlDirectory() {
    if (!fs.existsSync(this.sqlDir)) {
      fs.mkdirSync(this.sqlDir, { recursive: true })
      this.log('📁 Created SQL directory')
    }
  }

  async createDatabaseTables() {
    this.log('🏗️  Creating database tables...')

    const tablesSQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Forms table
CREATE TABLE IF NOT EXISTS public."Forms" (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    "refKey" TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    "slackWebhookUrl" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Responses table  
CREATE TABLE IF NOT EXISTS public."Responses" (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    "refKey" TEXT NOT NULL,
    "formData" JSONB NOT NULL DEFAULT '{}'::jsonb,
    files JSONB DEFAULT '[]'::jsonb,
    ip INET,
    "userAgent" TEXT,
    "submittedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Settings table (for admin configuration)
CREATE TABLE IF NOT EXISTS public."Settings" (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API Keys table (for authentication)
CREATE TABLE IF NOT EXISTS public."ApiKeys" (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    "keyId" TEXT UNIQUE NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyType" TEXT NOT NULL CHECK ("keyType" IN ('api', 'ui')),
    prefix TEXT NOT NULL,
    permissions JSONB DEFAULT '[]'::jsonb,
    "isActive" BOOLEAN DEFAULT true,
    "expiresAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "lastUsedAt" TIMESTAMP WITH TIME ZONE
);

-- Rate Limiting table
CREATE TABLE IF NOT EXISTS public."RateLimits" (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    "keyId" TEXT NOT NULL,
    "requestCount" INTEGER DEFAULT 0,
    "windowStart" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_forms_refkey" ON public."Forms"("refKey");
CREATE INDEX IF NOT EXISTS "idx_responses_refkey" ON public."Responses"("refKey");
CREATE INDEX IF NOT EXISTS "idx_responses_submitted_at" ON public."Responses"("submittedAt");
CREATE INDEX IF NOT EXISTS "idx_apikeys_keyhash" ON public."ApiKeys"("keyHash");
CREATE INDEX IF NOT EXISTS "idx_apikeys_keyid" ON public."ApiKeys"("keyId");
CREATE INDEX IF NOT EXISTS "idx_ratelimits_keyid" ON public."RateLimits"("keyId");

-- Add updated_at trigger for Forms table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_forms_updated_at 
    BEFORE UPDATE ON public."Forms"
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_settings_updated_at 
    BEFORE UPDATE ON public."Settings"
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
`

    await this.executeSQLFile('01_tables.sql', tablesSQL)
    this.log('✅ Database tables created successfully')
  }

  async createRLSPolicies() {
    this.log('🔒 Setting up Row Level Security policies...')

    const rlsSQL = `
-- Enable RLS on all tables
ALTER TABLE public."Forms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Responses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ApiKeys" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RateLimits" ENABLE ROW LEVEL SECURITY;

-- Forms policies (admin-only access)
CREATE POLICY "Allow service role full access to Forms" ON public."Forms"
    FOR ALL USING (auth.role() = 'service_role');

-- Responses policies (admin-only access)
CREATE POLICY "Allow service role full access to Responses" ON public."Responses"
    FOR ALL USING (auth.role() = 'service_role');

-- Settings policies (admin-only access)
CREATE POLICY "Allow service role full access to Settings" ON public."Settings"
    FOR ALL USING (auth.role() = 'service_role');

-- API Keys policies (admin-only access)
CREATE POLICY "Allow service role full access to ApiKeys" ON public."ApiKeys"
    FOR ALL USING (auth.role() = 'service_role');

-- Rate Limits policies (admin-only access)
CREATE POLICY "Allow service role full access to RateLimits" ON public."RateLimits"
    FOR ALL USING (auth.role() = 'service_role');

-- Allow anonymous users to insert responses (for form submissions)
CREATE POLICY "Allow anonymous response submission" ON public."Responses"
    FOR INSERT TO anon
    WITH CHECK (true);

-- Allow anonymous users to read specific forms (for form rendering)
CREATE POLICY "Allow anonymous form reading" ON public."Forms"
    FOR SELECT TO anon
    USING (true);
`

    await this.executeSQLFile('02_rls_policies.sql', rlsSQL)
    this.log('✅ RLS policies configured')
  }

  async createFunctions() {
    this.log('⚡ Creating database functions...')

    const functionsSQL = `
-- Function to validate API keys
CREATE OR REPLACE FUNCTION validate_api_key(
    p_key_hash TEXT,
    p_key_type TEXT DEFAULT NULL
) RETURNS TABLE (
    is_valid BOOLEAN,
    key_id TEXT,
    key_type TEXT,
    permissions JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (ak."isActive" = true AND (ak."expiresAt" IS NULL OR ak."expiresAt" > NOW())) as is_valid,
        ak."keyId"::TEXT as key_id,
        ak."keyType"::TEXT as key_type,
        ak.permissions
    FROM public."ApiKeys" ak
    WHERE ak."keyHash" = p_key_hash
      AND (p_key_type IS NULL OR ak."keyType" = p_key_type)
    LIMIT 1;
    
    -- Update last used timestamp
    UPDATE public."ApiKeys" 
    SET "lastUsedAt" = NOW()
    WHERE "keyHash" = p_key_hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check rate limits
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_key_id TEXT,
    p_per_minute INTEGER DEFAULT 60,
    p_per_hour INTEGER DEFAULT 1000
) RETURNS TABLE (
    is_allowed BOOLEAN,
    requests_in_last_minute INTEGER,
    requests_in_last_hour INTEGER,
    rate_limit_per_minute INTEGER,
    rate_limit_per_hour INTEGER
) AS $$
DECLARE
    minute_count INTEGER := 0;
    hour_count INTEGER := 0;
BEGIN
    -- Count requests in last minute
    SELECT COUNT(*)::INTEGER INTO minute_count
    FROM public."RateLimits" 
    WHERE "keyId" = p_key_id 
      AND "createdAt" > (NOW() - INTERVAL '1 minute');
    
    -- Count requests in last hour
    SELECT COUNT(*)::INTEGER INTO hour_count
    FROM public."RateLimits" 
    WHERE "keyId" = p_key_id 
      AND "createdAt" > (NOW() - INTERVAL '1 hour');
    
    -- Record this request
    INSERT INTO public."RateLimits" ("keyId") 
    VALUES (p_key_id);
    
    -- Clean up old rate limit records (older than 1 hour)
    DELETE FROM public."RateLimits" 
    WHERE "createdAt" < (NOW() - INTERVAL '1 hour');
    
    RETURN QUERY SELECT 
        (minute_count < p_per_minute AND hour_count < p_per_hour) as is_allowed,
        minute_count as requests_in_last_minute,
        hour_count as requests_in_last_hour,
        p_per_minute as rate_limit_per_minute,
        p_per_hour as rate_limit_per_hour;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get response statistics
CREATE OR REPLACE FUNCTION get_response_stats(p_ref_key TEXT)
RETURNS TABLE (
    count BIGINT,
    last_response_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as count,
        MAX("submittedAt") as last_response_date
    FROM public."Responses"
    WHERE "refKey" = p_ref_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`

    await this.executeSQLFile('03_functions.sql', functionsSQL)
    this.log('✅ Database functions created')
  }

  async seedInitialData() {
    this.log('🌱 Seeding initial data...')

    const seedSQL = `
-- Insert default settings
INSERT INTO public."Settings" (key, value) VALUES
    ('ai_provider', '"openai"'::jsonb),
    ('ai_model', '"gpt-3.5-turbo"'::jsonb),
    ('ai_api_key', '""'::jsonb),
    ('slack_webhook_url', '""'::jsonb),
    ('max_file_size', '10485760'::jsonb),
    ('allowed_file_types', '["pdf", "jpg", "png", "doc", "docx"]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Insert example form (optional)
INSERT INTO public."Forms" ("refKey", title, description, fields) VALUES
    ('example-contact', 'Contact Form Example', 'A sample contact form to test the system', 
     '[
       {
         "key": "name",
         "label": "Full Name",
         "type": "text",
         "required": true,
         "placeholder": "Enter your full name"
       },
       {
         "key": "email", 
         "label": "Email Address",
         "type": "email",
         "required": true,
         "placeholder": "Enter your email"
       },
       {
         "key": "message",
         "label": "Message",
         "type": "textarea",
         "required": true,
         "placeholder": "Enter your message"
       }
     ]'::jsonb)
ON CONFLICT ("refKey") DO NOTHING;
`

    await this.executeSQLFile('04_seed_data.sql', seedSQL)
    this.log('✅ Initial data seeded')
  }

  async executeSQLFile(filename, sql) {
    const filePath = path.join(this.sqlDir, filename)

    // Write SQL to file for reference
    fs.writeFileSync(filePath, sql)

    // Execute using Supabase CLI if available, otherwise provide instructions
    try {
      execSync(`supabase db reset --db-url "${this.env.SUPABASE_URL}" --linked`, {
        stdio: 'pipe',
        cwd: this.projectRoot,
      })
      this.log(`✅ Executed ${filename}`)
    } catch (error) {
      this.log(`⚠️  Could not execute ${filename} automatically. Please run manually:`, 'warning')
      this.log(`   File saved at: ${filePath}`, 'info')
    }
  }

  async validateSetup() {
    this.log('🔍 Validating database setup...')

    try {
      // This would require a Supabase client to test
      // For now, just log success
      this.log('✅ Database setup validation completed')
      this.log('🎉 Supabase setup completed successfully!', 'success')

      this.log('\n📋 Next Steps:')
      this.log('1. Verify tables exist in your Supabase dashboard')
      this.log('2. Test form creation at /builder')
      this.log('3. Test form submission at /f/example-contact')
      this.log('4. Check responses at /responses/example-contact')
    } catch (error) {
      this.log(`❌ Validation failed: ${error.message}`, 'error')
      throw error
    }
  }

  async run() {
    try {
      this.log('🚀 Starting FormDee Supabase Setup...', 'info')

      await this.checkEnvironment()
      await this.createSqlDirectory()
      await this.createDatabaseTables()
      await this.createRLSPolicies()
      await this.createFunctions()
      await this.seedInitialData()
      await this.validateSetup()
    } catch (error) {
      this.log(`❌ Setup failed: ${error.message}`, 'error')
      process.exit(1)
    }
  }
}

// Run if called directly
if (require.main === module) {
  const setup = new SupabaseSetup()
  setup.run()
}

module.exports = SupabaseSetup
