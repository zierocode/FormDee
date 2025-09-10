/**
 * Universal Test Data Cleanup Utility
 * Works with both API tests and E2E Playwright tests
 * Ensures complete cleanup for all automated test suites
 */

const TestDataCleanup = require('./test-cleanup')
const fs = require('fs').promises
const path = require('path')

class UniversalCleanup extends TestDataCleanup {
  constructor(options = {}) {
    super()
    this.testType = options.testType || 'unknown' // 'api', 'e2e', or 'mixed'
    this.playwrightConfig = options.playwrightConfig || null
    this.verbose = options.verbose !== false // Default to verbose
  }

  // Enhanced test form detection for E2E tests
  isE2ETestForm(form) {
    const e2ePatterns = [
      /^e2e.*test/i, // e2e-test-form, e2e-standard-123456
      /^standard.*e2e/i, // standard-e2e-test
      /^playwright.*test/i, // playwright-test-form
      /browser.*test/i, // browser-test-form
      /^test.*e2e/i, // test-e2e-form
      /^test.*standard/i, // test-standard-form
      /^test.*full.*suite/i, // test-full-suite-form
      /headless.*test/i, // headless-test
      /visual.*test/i, // visual-test
      /automation.*test/i, // automation-test
    ]

    const formString = `${form.refKey} ${form.title || ''} ${form.description || ''}`.toLowerCase()
    
    return e2ePatterns.some(pattern => 
      pattern.test(form.refKey.toLowerCase()) || 
      pattern.test(form.title?.toLowerCase() || '') ||
      pattern.test(form.description?.toLowerCase() || '')
    )
  }

  // Enhanced test form detection combining parent + E2E patterns
  isTestForm(form) {
    return super.isTestForm(form) || this.isE2ETestForm(form)
  }

  // Clean up Playwright test artifacts
  async cleanupPlaywrightArtifacts() {
    if (this.verbose) console.log('\n🧹 Cleaning up Playwright test artifacts...')

    const artifactDirs = [
      './test-results',
      './playwright-report', 
      './tests/screenshots',
      './tests/videos',
      './tests/traces'
    ]

    let totalCleaned = 0

    for (const dir of artifactDirs) {
      try {
        const dirPath = path.resolve(dir)
        
        // Check if directory exists
        try {
          await fs.access(dirPath)
        } catch {
          continue // Directory doesn't exist, skip
        }

        const items = await fs.readdir(dirPath, { withFileTypes: true })
        
        // Clean test artifacts (but preserve config files)
        const testArtifacts = items.filter(item => {
          const name = item.name
          return (
            // Playwright generated files
            name.match(/\.(png|jpg|jpeg|webm|zip|json|html)$/) ||
            // Test result directories
            (item.isDirectory() && name.match(/test-results|screenshots|traces/)) ||
            // Files with timestamps (likely test generated)
            name.match(/\d{13}/) ||
            // Specific test file patterns
            name.includes('test-') ||
            name.includes('e2e-')
          ) && !name.includes('config') && !name.includes('.env')
        })

        if (testArtifacts.length > 0) {
          if (this.verbose) console.log(`📁 Cleaning ${testArtifacts.length} artifacts from ${dir}`)

          for (const artifact of testArtifacts) {
            const fullPath = path.join(dirPath, artifact.name)
            try {
              if (artifact.isDirectory()) {
                await fs.rmdir(fullPath, { recursive: true })
              } else {
                await fs.unlink(fullPath)
              }
              if (this.verbose) console.log(`   ✅ Deleted: ${artifact.name}`)
              totalCleaned++
            } catch (error) {
              console.log(`   ⚠️  Could not delete ${artifact.name}: ${error.message}`)
            }
          }
        }
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.log(`⚠️  Error cleaning ${dir}: ${error.message}`)
        }
      }
    }

    if (totalCleaned > 0) {
      if (this.verbose) console.log(`✅ Cleaned ${totalCleaned} Playwright artifacts`)
    } else {
      if (this.verbose) console.log('✅ No Playwright artifacts to clean')
    }
  }

  // Enhanced form cleanup with better tracking
  async cleanupTestForms(interactive = false) {
    if (this.verbose) console.log('\n🧹 Starting comprehensive test form cleanup...')

    const allForms = await this.getAllForms()
    const testForms = allForms.filter(form => this.isTestForm(form))

    if (testForms.length === 0) {
      if (this.verbose) console.log('✅ No test forms found to clean up')
      return { deleted: 0, forms: [] }
    }

    if (this.verbose) {
      console.log(`📋 Found ${testForms.length} test forms to clean up:`)
      testForms.forEach(form => {
        const type = this.isE2ETestForm(form) ? '(E2E)' : '(API)'
        console.log(`   - ${form.refKey} ${type} ${form.title ? `- ${form.title}` : ''}`)
      })
    }

    // Interactive confirmation if requested
    if (interactive) {
      const confirmedForms = await this.confirmFormDeletion(testForms)
      if (confirmedForms.length === 0) {
        console.log('❌ No forms selected for deletion')
        return { deleted: 0, forms: [] }
      }
      return await this.deleteConfirmedForms(confirmedForms)
    }

    // Delete each test form (non-interactive mode)
    const deletedForms = []
    for (const form of testForms) {
      const success = await this.deleteTestFormWithData(form.refKey)
      if (success) {
        deletedForms.push(form.refKey)
      }
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300))
    }

    return { deleted: deletedForms.length, forms: deletedForms }
  }

  // Clean up test data created during E2E Playwright test runs
  async cleanupE2ETestData() {
    if (this.verbose) console.log('\n🧹 Cleaning up E2E test data...')

    // Clean forms first
    const formCleanup = await this.cleanupTestForms()
    
    // Clean Playwright artifacts
    await this.cleanupPlaywrightArtifacts()

    return formCleanup
  }

  // Clean up test data created during API test runs  
  async cleanupAPITestData() {
    if (this.verbose) console.log('\n🧹 Cleaning up API test data...')

    // Clean forms and submissions
    const formCleanup = await this.cleanupTestForms()
    await this.cleanupTestSubmissions()

    return formCleanup
  }

  // Universal cleanup for all test types
  async performUniversalCleanup() {
    if (this.verbose) {
      console.log('\n🧹===============================================')
      console.log('       UNIVERSAL TEST DATA CLEANUP')
      console.log('===============================================')
      console.log(`Test Type: ${this.testType.toUpperCase()}`)
    }

    const startTime = Date.now()
    let totalFormsDeleted = 0

    try {
      // Always clean up forms (works for both API and E2E)
      const formCleanup = await this.cleanupTestForms()
      totalFormsDeleted = formCleanup.deleted

      // Clean up based on test type
      if (this.testType === 'e2e' || this.testType === 'mixed') {
        await this.cleanupPlaywrightArtifacts()
      }

      if (this.testType === 'api' || this.testType === 'mixed') {
        await this.cleanupTestSubmissions()
      }

      // Clean up any remaining screenshots from parent class
      await this.cleanupTestScreenshots()

      const duration = ((Date.now() - startTime) / 1000).toFixed(2)

      if (this.verbose) {
        console.log('\n✅===============================================')
        console.log('             CLEANUP SUMMARY')
        console.log('===============================================')
        console.log(`🗑️  Total forms deleted: ${totalFormsDeleted}`)
        if (totalFormsDeleted > 0) {
          console.log('   Forms deleted:')
          this.deletedItems.forms.forEach(form => {
            console.log(`   - ${form}`)
          })
        }
        console.log(`📊 Responses cleaned: ${this.deletedItems.submissions}`)
        console.log(`⏱️  Duration: ${duration}s`)
        console.log(`🎯 Test Type: ${this.testType.toUpperCase()}`)
        console.log('✅ Universal cleanup completed successfully!')
      }

      return {
        success: true,
        formsDeleted: totalFormsDeleted,
        responsesDeleted: this.deletedItems.submissions,
        duration: parseFloat(duration)
      }

    } catch (error) {
      console.error('❌ Universal cleanup failed:', error.message)
      return {
        success: false,
        error: error.message,
        formsDeleted: totalFormsDeleted
      }
    }
  }

  // Cleanup specifically for E2E tests (quieter for test automation)
  async performE2ECleanup(options = {}) {
    this.verbose = options.verbose !== undefined ? options.verbose : false
    this.testType = 'e2e'
    
    return await this.performUniversalCleanup()
  }

  // Cleanup specifically for API tests  
  async performAPICleanup(options = {}) {
    this.verbose = options.verbose !== undefined ? options.verbose : true
    this.testType = 'api'
    
    return await this.performUniversalCleanup()
  }

  // Interactive cleanup with user confirmation
  async interactiveCleanup() {
    console.log('\n🛡️  INTERACTIVE CLEANUP MODE')
    console.log('=====================================')
    console.log('This mode will show you all forms that would be deleted')
    console.log('and let you choose which ones to actually delete.\n')
    
    const result = await this.cleanupTestForms(true)
    return result
  }

  // Confirm which forms to delete with user
  async confirmFormDeletion(testForms) {
    const readline = require('readline')
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    console.log('\n📋 FORMS FOUND FOR DELETION:')
    console.log('=================================')
    
    // Show forms with submission counts
    for (let i = 0; i < testForms.length; i++) {
      const form = testForms[i]
      const type = this.isE2ETestForm(form) ? 'E2E' : 'API'
      const responsesCount = await this.getResponsesCount(form.refKey)
      
      console.log(`${i + 1}. ${form.refKey} [${type}]`)
      console.log(`   Title: ${form.title || 'No title'}`)
      console.log(`   Description: ${form.description || 'No description'}`)
      console.log(`   📊 Responses: ${responsesCount} submissions`)
      console.log(`   ⚠️  Both FORM and ALL SUBMISSION DATA will be deleted`)
      console.log('')
    }

    return new Promise((resolve) => {
      rl.question(
        '❓ Select forms to delete (e.g., "1,3,5" or "all" or "none"): ', 
        (answer) => {
          rl.close()
          
          if (answer.toLowerCase() === 'none' || answer.trim() === '') {
            resolve([])
          } else if (answer.toLowerCase() === 'all') {
            resolve(testForms)
          } else {
            const indices = answer.split(',')
              .map(i => parseInt(i.trim()) - 1)
              .filter(i => i >= 0 && i < testForms.length)
            resolve(indices.map(i => testForms[i]))
          }
        }
      )
    })
  }

  // Delete confirmed forms with their data
  async deleteConfirmedForms(confirmedForms) {
    console.log(`\n🗑️  DELETING ${confirmedForms.length} SELECTED FORMS...`)
    console.log('===============================================')
    
    const deletedForms = []
    for (const form of confirmedForms) {
      console.log(`\n🔄 Deleting: ${form.refKey}`)
      
      // First show what will be deleted
      const responsesCount = await this.getResponsesCount(form.refKey)
      console.log(`   📊 Will delete ${responsesCount} responses`)
      
      const success = await this.deleteTestFormWithData(form.refKey)
      if (success) {
        deletedForms.push(form.refKey)
        console.log(`   ✅ Successfully deleted form and all data`)
      } else {
        console.log(`   ❌ Failed to delete form`)
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300))
    }

    console.log(`\n✅ DELETION COMPLETE: ${deletedForms.length}/${confirmedForms.length} forms deleted`)
    return { deleted: deletedForms.length, forms: deletedForms }
  }

  // Enhanced form deletion that ensures both form and responses are deleted
  async deleteTestFormWithData(refKey) {
    try {
      // First get responses count for logging
      const responsesCount = await this.getResponsesCount(refKey)
      
      if (this.verbose && responsesCount > 0) {
        console.log(`🗑️  Deleting form "${refKey}" with ${responsesCount} responses`)
      }

      // Delete the form (this should also delete responses via API)
      const success = await this.deleteTestForm(refKey)
      
      if (success && this.verbose) {
        console.log(`✅ Form "${refKey}" and all associated data deleted successfully`)
      }
      
      return success
    } catch (error) {
      if (this.verbose) {
        console.log(`❌ Failed to delete form "${refKey}": ${error.message}`)
      }
      return false
    }
  }

  // Get count of responses for a form
  async getResponsesCount(refKey) {
    try {
      const response = await this.makeRequest('/api/responses', { refKey })
      if (response.ok) {
        const data = await response.json()
        return data.pagination?.total || 0
      }
      return 0
    } catch (error) {
      return 0
    }
  }
}

// Playwright-specific cleanup helper for E2E tests
class PlaywrightCleanupHelper {
  constructor(page = null) {
    this.page = page
    this.cleanup = new UniversalCleanup({ testType: 'e2e', verbose: false })
  }

  // Clean up forms created during a specific test using page context
  async cleanupTestFormsFromPage(testFormKeys = []) {
    if (!this.page) return

    try {
      // Use page.evaluate to call API directly with authentication
      for (const refKey of testFormKeys) {
        try {
          await this.page.evaluate(async (refKey) => {
            await fetch('/api/forms', {
              method: 'DELETE',
              headers: { 
                'Content-Type': 'application/json',
              },
              credentials: 'include', // Include auth cookies
              body: JSON.stringify({ refKey })
            })
          }, refKey)
        } catch (error) {
          // Silent fail for individual form cleanup
        }
      }
    } catch (error) {
      console.log(`Cleanup warning: ${error.message}`)
    }
  }

  // Full cleanup after E2E test completion
  async performFullCleanup() {
    return await this.cleanup.performE2ECleanup({ verbose: false })
  }
}

module.exports = { 
  UniversalCleanup, 
  PlaywrightCleanupHelper,
  // Export the base class for backward compatibility
  TestDataCleanup: UniversalCleanup
}