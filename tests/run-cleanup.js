#!/usr/bin/env node

/**
 * Standalone cleanup utility for manual cleanup
 * Usage: node tests/run-cleanup.js [options]
 */

const { UniversalCleanup } = require('./utils/universal-cleanup')

async function main() {
  const args = process.argv.slice(2)
  const options = {
    verbose: true,
    testType: 'mixed'
  }

  // Parse arguments
  if (args.includes('--quiet')) options.verbose = false
  if (args.includes('--api-only')) options.testType = 'api'
  if (args.includes('--e2e-only')) options.testType = 'e2e'

  console.log('🧹 FormDee Universal Test Data Cleanup')
  console.log('=====================================')
  console.log(`Mode: ${options.testType.toUpperCase()}`)
  
  if (args.includes('--interactive')) {
    const cleanup = new UniversalCleanup(options)
    const result = await cleanup.interactiveCleanup()
    
    if (result.success) {
      console.log(`\n✅ Interactive cleanup completed successfully!`)
      console.log(`📊 Summary:`)
      console.log(`   - Forms deleted: ${result.deleted}`)
    } else {
      console.error(`\n❌ Interactive cleanup failed: ${result.error}`)
      process.exit(1)
    }
  } else {
    const cleanup = new UniversalCleanup(options)
    const result = await cleanup.performUniversalCleanup()
    
    if (result.success) {
      console.log(`\n✅ Cleanup completed successfully!`)
      console.log(`📊 Summary:`)
      console.log(`   - Forms deleted: ${result.formsDeleted}`)
      console.log(`   - Duration: ${result.duration}s`)
    } else {
      console.error(`\n❌ Cleanup failed: ${result.error}`)
      process.exit(1)
    }
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error:', error.message)
    process.exit(1)
  })
}

module.exports = { main }