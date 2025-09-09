#!/usr/bin/env tsx

/**
 * Initial setup script for FormDee keys
 * Run this once after deploying the database
 * Usage: npx tsx scripts/setup-keys.ts
 */

import { createHash, randomBytes } from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import readline from 'readline'
import { config } from 'dotenv'
import { supabase } from '../lib/supabase'

// Load environment variables
config()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, resolve)
  })
}

function generateApiKey(): string {
  return randomBytes(32).toString('base64url')
}

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

function updateEnvFile(updates: Record<string, string>) {
  const envPath = path.join(process.cwd(), '.env')

  if (!fs.existsSync(envPath)) {
    // Create new .env file
    const content = Object.entries(updates)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')
    fs.writeFileSync(envPath, content + '\n')
    console.log('✅ Created .env file')
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
  console.log('✅ Updated .env file')
  return true
}

async function clearAllKeys() {
  try {
    const { error } = await supabase
      .from('ApiKeys')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (error && error.code !== 'PGRST116') {
      // Ignore "no rows" error
      console.error('Error clearing keys:', error)
      return false
    }
    return true
  } catch (error) {
    console.error('Error clearing keys:', error)
    return false
  }
}

async function storeKey(key: string, keyType: 'api' | 'ui') {
  try {
    const keyHash = hashKey(key)
    const keyPrefix = key.substring(0, 8)

    const { error } = await supabase.from('ApiKeys').insert({
      key_hash: keyHash,
      key_prefix: keyPrefix,
      key_type: keyType,
      name: `${keyType.toUpperCase()} Key`,
      description: `Main ${keyType.toUpperCase()} key for FormDee`,
      created_by: 'setup',
      expires_at: null,
      rate_limit_per_minute: 300,
      rate_limit_per_hour: 10000,
    })

    if (error) {
      console.error(`Error storing ${keyType} key:`, error)
      return false
    }

    return true
  } catch (error) {
    console.error(`Error storing ${keyType} key:`, error)
    return false
  }
}

async function main() {
  console.log('🔐 FormDee Initial Key Setup')
  console.log('='.repeat(60))
  console.log('This will set up the initial API and UI keys for FormDee.')
  console.log('Warning: This will replace any existing keys!\n')

  const confirm = await question('Continue with setup? (yes/no): ')

  if (confirm.toLowerCase() !== 'yes') {
    console.log('Setup cancelled.')
    rl.close()
    process.exit(0)
  }

  console.log('\n1️⃣  Setting up UI Key')
  console.log('-'.repeat(40))
  console.log('Enter a custom UI key for browser login.')
  console.log('This can be any string you want.\n')

  const uiKey = await question('Enter UI key: ')

  if (!uiKey || uiKey.trim().length === 0) {
    console.log('❌ UI key cannot be empty')
    rl.close()
    process.exit(1)
  }

  console.log('\n2️⃣  Generating API Key')
  console.log('-'.repeat(40))
  console.log('A random API key will be generated automatically.\n')

  const apiKey = generateApiKey()

  console.log('\n3️⃣  Storing Keys in Database')
  console.log('-'.repeat(40))

  // Clear existing keys
  await clearAllKeys()

  // Store new keys
  const uiStored = await storeKey(uiKey, 'ui')
  const apiStored = await storeKey(apiKey, 'api')

  if (!uiStored || !apiStored) {
    console.log('❌ Failed to store keys in database')
    rl.close()
    process.exit(1)
  }

  console.log('✅ Keys stored in database')

  console.log('\n4️⃣  Updating .env File')
  console.log('-'.repeat(40))

  const updated = updateEnvFile({
    ADMIN_UI_KEY: uiKey,
    ADMIN_API_KEY: apiKey,
  })

  if (!updated) {
    console.log('❌ Failed to update .env file')
    rl.close()
    process.exit(1)
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ SETUP COMPLETE!')
  console.log('='.repeat(60))
  console.log('\n📋 Your Keys:')
  console.log('-'.repeat(40))
  console.log(`UI Key:  ${uiKey}`)
  console.log(`API Key: ${apiKey}`)
  console.log('\n⚠️  The .env file has been updated.')
  console.log('⚠️  Restart your application for changes to take effect.')
  console.log('\n💡 To manage keys later, use:')
  console.log('   npx tsx scripts/manage-keys.ts')
  console.log('='.repeat(60))

  rl.close()
  process.exit(0)
}

// Run the setup
main().catch((error) => {
  console.error('Setup error:', error)
  process.exit(1)
})
