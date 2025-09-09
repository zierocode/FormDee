#!/usr/bin/env tsx

/**
 * Non-interactive script to reset keys for testing
 * Usage: npx tsx scripts/reset-keys.ts
 */

import { createHash, randomBytes } from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import { config } from 'dotenv'
import { supabase } from '../lib/supabase'

// Load environment variables
config()

function generateApiKey(): string {
  return randomBytes(32).toString('base64url')
}

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

function updateEnvFile(updates: Record<string, string>) {
  const envPath = path.join(process.cwd(), '.env')

  if (!fs.existsSync(envPath)) {
    const content = Object.entries(updates)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')
    fs.writeFileSync(envPath, content + '\n')
    return true
  }

  let envContent = fs.readFileSync(envPath, 'utf-8')

  Object.entries(updates).forEach(([key, value]) => {
    const keyRegex = new RegExp(`^${key}=.*$`, 'm')

    if (keyRegex.test(envContent)) {
      envContent = envContent.replace(keyRegex, `${key}=${value}`)
    } else {
      envContent += `${key}=${value}\n`
    }
  })

  fs.writeFileSync(envPath, envContent)
  return true
}

async function main() {
  console.log('🔐 Resetting FormDee Keys (Non-interactive)')
  console.log('='.repeat(60))

  // Clear existing keys
  await supabase.from('ApiKeys').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  // Set a simple UI key for testing
  const uiKey = 'testui123'
  const apiKey = generateApiKey()

  // Store UI key
  await supabase.from('ApiKeys').insert({
    key_hash: hashKey(uiKey),
    key_prefix: uiKey.substring(0, 8),
    key_type: 'ui',
    name: 'UI Key',
    description: 'Main UI key for FormDee',
    created_by: 'reset-script',
    expires_at: null,
    rate_limit_per_minute: 300,
    rate_limit_per_hour: 10000,
  })

  // Store API key
  await supabase.from('ApiKeys').insert({
    key_hash: hashKey(apiKey),
    key_prefix: apiKey.substring(0, 8),
    key_type: 'api',
    name: 'API Key',
    description: 'Main API key for FormDee',
    created_by: 'reset-script',
    expires_at: null,
    rate_limit_per_minute: 300,
    rate_limit_per_hour: 10000,
  })

  // Update .env
  updateEnvFile({
    ADMIN_UI_KEY: uiKey,
    ADMIN_API_KEY: apiKey,
  })

  console.log('\n✅ Keys Reset Successfully!')
  console.log('='.repeat(60))
  console.log(`UI Key:  ${uiKey}`)
  console.log(`API Key: ${apiKey}`)
  console.log('\n.env file has been updated.')
  console.log('Restart your application for changes to take effect.')

  process.exit(0)
}

main().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
