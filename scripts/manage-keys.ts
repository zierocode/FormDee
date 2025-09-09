#!/usr/bin/env tsx

/**
 * CLI tool to manage API and UI keys for FormDee
 * Run with: npx tsx scripts/manage-keys.ts
 *
 * Features:
 * - Set custom UI key (any format)
 * - Generate/regenerate API key (random, no prefix)
 * - Automatically updates .env file
 * - Only one key per type allowed
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

/**
 * Generate a random API key (no prefix)
 */
function generateApiKey(): string {
  return randomBytes(32).toString('base64url')
}

/**
 * Hash a key using SHA-256
 */
function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

/**
 * Update .env file with new key
 */
function updateEnvFile(keyType: 'ADMIN_API_KEY' | 'ADMIN_UI_KEY', value: string) {
  const envPath = path.join(process.cwd(), '.env')

  if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found!')
    return false
  }

  let envContent = fs.readFileSync(envPath, 'utf-8')
  const keyRegex = new RegExp(`^${keyType}=.*$`, 'm')

  if (keyRegex.test(envContent)) {
    // Update existing key
    envContent = envContent.replace(keyRegex, `${keyType}=${value}`)
  } else {
    // Add new key
    envContent += `\n${keyType}=${value}\n`
  }

  fs.writeFileSync(envPath, envContent)
  console.log(`✅ Updated ${keyType} in .env file`)
  return true
}

/**
 * Clear all existing keys of a specific type from database
 */
async function clearExistingKeys(keyType: 'api' | 'ui') {
  try {
    const { error } = await supabase.from('ApiKeys').delete().eq('key_type', keyType)

    if (error) {
      console.error('Error clearing existing keys:', error)
      return false
    }
    return true
  } catch (error) {
    console.error('Error clearing existing keys:', error)
    return false
  }
}

/**
 * Store key in database
 */
async function storeKey(key: string, keyType: 'api' | 'ui', name: string) {
  try {
    // Clear existing keys of this type first (only one allowed)
    await clearExistingKeys(keyType)

    const keyHash = hashKey(key)
    const keyPrefix = key.substring(0, 8) // Store first 8 chars for identification

    const { error } = await supabase.from('ApiKeys').insert({
      key_hash: keyHash,
      key_prefix: keyPrefix,
      key_type: keyType,
      name: name,
      description: `Main ${keyType.toUpperCase()} key for FormDee`,
      created_by: 'cli',
      // No expiration for system keys
      expires_at: null,
      // Higher rate limits for system keys
      rate_limit_per_minute: 300,
      rate_limit_per_hour: 10000,
    })

    if (error) {
      console.error('Error storing key:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error storing key:', error)
    return false
  }
}

/**
 * Set custom UI key
 */
async function setUiKey() {
  console.log('\n📝 Set Custom UI Key')
  console.log('='.repeat(50))
  console.log('Enter any string to use as the UI key.')
  console.log('This key will be used for browser login.\n')

  const uiKey = await question('Enter UI key: ')

  if (!uiKey || uiKey.trim().length === 0) {
    console.log('❌ UI key cannot be empty')
    return
  }

  const confirm = await question(`\nSet UI key to "${uiKey}"? (yes/no): `)

  if (confirm.toLowerCase() !== 'yes') {
    console.log('❌ Cancelled')
    return
  }

  // Store in database
  const stored = await storeKey(uiKey, 'ui', 'UI Access Key')

  if (!stored) {
    console.log('❌ Failed to store UI key in database')
    return
  }

  // Update .env file
  const updated = updateEnvFile('ADMIN_UI_KEY', uiKey)

  if (updated) {
    console.log('\n' + '='.repeat(50))
    console.log('✅ UI Key Set Successfully!')
    console.log('='.repeat(50))
    console.log(`\nUI KEY: ${uiKey}`)
    console.log('\n⚠️  Restart your application for changes to take effect.')
  }
}

/**
 * Generate/regenerate API key
 */
async function regenerateApiKey() {
  console.log('\n🔄 Generate/Regenerate API Key')
  console.log('='.repeat(50))
  console.log('This will generate a new random API key.')
  console.log('The old API key will be invalidated.\n')

  const confirm = await question('Generate new API key? (yes/no): ')

  if (confirm.toLowerCase() !== 'yes') {
    console.log('❌ Cancelled')
    return
  }

  // Generate new random key
  const apiKey = generateApiKey()

  // Store in database
  const stored = await storeKey(apiKey, 'api', 'API Access Key')

  if (!stored) {
    console.log('❌ Failed to store API key in database')
    return
  }

  // Update .env file
  const updated = updateEnvFile('ADMIN_API_KEY', apiKey)

  if (updated) {
    console.log('\n' + '='.repeat(50))
    console.log('✅ API Key Generated Successfully!')
    console.log('='.repeat(50))
    console.log(`\nAPI KEY: ${apiKey}`)
    console.log('\n⚠️  The .env file has been updated automatically.')
    console.log('⚠️  Restart your application for changes to take effect.')
    console.log('⚠️  Update all API integrations with the new key.')
  }
}

/**
 * View current keys (shows prefix only for security)
 */
async function viewCurrentKeys() {
  console.log('\n🔍 Current Keys')
  console.log('='.repeat(50))

  try {
    const { data, error } = await supabase
      .from('ApiKeys')
      .select('key_type, key_prefix, name, created_at, usage_count, last_used_at')
      .order('key_type')

    if (error) {
      console.error('Error fetching keys:', error)
      return
    }

    if (!data || data.length === 0) {
      console.log('No keys found in database.')
      return
    }

    data.forEach((key) => {
      console.log(`\n${key.key_type.toUpperCase()} Key:`)
      console.log(`  Name: ${key.name}`)
      console.log(`  Prefix: ${key.key_prefix}...`)
      console.log(`  Created: ${new Date(key.created_at).toLocaleString()}`)
      console.log(`  Usage: ${key.usage_count} requests`)
      if (key.last_used_at) {
        console.log(`  Last Used: ${new Date(key.last_used_at).toLocaleString()}`)
      }
    })
  } catch (error) {
    console.error('Error fetching keys:', error)
  }
}

/**
 * Main menu
 */
async function main() {
  console.log('\n🔐 FormDee Key Management CLI')
  console.log('============================')
  console.log('This tool manages API and UI keys for FormDee.')
  console.log('Only one key of each type is allowed.\n')

  while (true) {
    console.log('\n' + '='.repeat(50))
    console.log('Options:')
    console.log('1. Set UI Key (custom string)')
    console.log('2. Generate/Regenerate API Key (random)')
    console.log('3. View Current Keys')
    console.log('4. Exit')

    const choice = await question('\nSelect option (1-4): ')

    switch (choice) {
      case '1':
        await setUiKey()
        break
      case '2':
        await regenerateApiKey()
        break
      case '3':
        await viewCurrentKeys()
        break
      case '4':
        console.log('\n✅ Goodbye!')
        rl.close()
        process.exit(0)
      default:
        console.log('❌ Invalid option. Please try again.')
    }
  }
}

// Run the CLI
main().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
