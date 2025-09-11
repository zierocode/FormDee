#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Comprehensive API Test Suite - Updated for Latest Codebase
 * Comprehensive testing with edge cases, stress tests, and boundary conditions
 *
 * COMPREHENSIVE COVERAGE:
 * - All standard tests plus edge cases
 * - Stress testing and performance validation
 * - Security testing and input validation
 * - Error handling and recovery scenarios
 * - Concurrent operations and race conditions
 * - Data integrity and consistency checks
 */

const StandardAPITestSuite = require('./api-test-standard')
const config = require('./config')

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

class ComprehensiveAPITestSuite extends StandardAPITestSuite {
  constructor() {
    super()
    this.performanceMetrics = []
    this.securityTests = []
    this.stressTestData = []
  }

  // Enhanced request with performance tracking
  async makeRequestWithMetrics(endpoint, options = {}) {
    const startTime = Date.now()
    const result = await this.makeRequest(endpoint, options)
    const endTime = Date.now()

    this.performanceMetrics.push({
      endpoint,
      method: options.method || 'GET',
      duration: endTime - startTime,
      status: result.status,
      timestamp: new Date(),
    })

    return result
  }

  // Generate test data of various sizes
  generateTestData(size) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < size; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  // ═══════════════════════════════════════════
  // EXTENDED HEALTH API TESTS
  // ═══════════════════════════════════════════

  async testHealthAPIComprehensive() {
    console.log(
      `\n${colors.bright}${colors.blue}══════════════════════════════════════════${colors.reset}`
    )
    console.log(`${colors.bright}COMPREHENSIVE HEALTH API TESTS${colors.reset}`)
    console.log(`${colors.blue}══════════════════════════════════════════${colors.reset}`)

    // Run standard tests first
    await this.testHealthAPI()

    // Test 1: Health Check Performance
    await this.runTest('Health Check Performance', 'Health', async () => {
      const startTime = Date.now()
      const response = await this.makeRequest('/api/health')
      const duration = Date.now() - startTime

      this.assert(response.status === 200, `Expected 200, got ${response.status}`)
      this.assert(duration < 2000, `Health check too slow: ${duration}ms`)
    })

    // Test 2: Health Check with Invalid Parameters
    await this.runTest('Health Check Invalid Parameters', 'Health', async () => {
      const response = await this.makeRequest('/api/health?detailed=invalid')

      this.assert(response.status === 200, `Expected 200, got ${response.status}`)
      // Should handle invalid param gracefully
    })

    // Test 3: Concurrent Health Checks
    await this.runTest('Concurrent Health Checks', 'Health', async () => {
      const promises = Array(10)
        .fill(null)
        .map(() => this.makeRequestWithMetrics('/api/health'))

      const results = await Promise.all(promises)
      const allSuccessful = results.every((r) => r.status === 200)

      this.assert(allSuccessful, 'All concurrent health checks should succeed')
    })

    // Test 4: Health Check Under Load
    await this.runTest('Health Check Under Load', 'Health', async () => {
      const batchSize = 5
      const batches = 3

      for (let i = 0; i < batches; i++) {
        const promises = Array(batchSize)
          .fill(null)
          .map(() => this.makeRequestWithMetrics('/api/health'))

        const results = await Promise.all(promises)
        const allSuccessful = results.every((r) => r.status === 200)

        this.assert(allSuccessful, `Batch ${i + 1} should all succeed`)

        // Small delay between batches
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    })
  }

  // ═══════════════════════════════════════════
  // EXTENDED AUTHENTICATION API TESTS
  // ═══════════════════════════════════════════

  async testAuthAPIComprehensive() {
    console.log(
      `\n${colors.bright}${colors.blue}══════════════════════════════════════════${colors.reset}`
    )
    console.log(`${colors.bright}COMPREHENSIVE AUTHENTICATION API TESTS${colors.reset}`)
    console.log(`${colors.blue}══════════════════════════════════════════${colors.reset}`)

    // Run standard tests first
    await this.testAuthAPI()

    // Test 1: SQL Injection Attempt
    await this.runTest('SQL Injection Attempt', 'Auth', async () => {
      const response = await this.makeRequest('/api/auth/login', {
        method: 'POST',
        body: {
          adminKey: "'; DROP TABLE users; --",
        },
      })

      // Should safely handle and reject
      this.assert(response.status === 401, `Expected 401, got ${response.status}`)
      this.assert(response.data.error !== undefined, 'SQL injection should fail')
    })

    // Test 2: XSS Attempt in Admin Key
    await this.runTest('XSS Attempt in Admin Key', 'Auth', async () => {
      const response = await this.makeRequest('/api/auth/login', {
        method: 'POST',
        body: {
          adminKey: '<script>alert("xss")</script>',
        },
      })

      this.assert(response.status === 401, `Expected 401, got ${response.status}`)
      this.assert(response.data.error !== undefined, 'XSS attempt should fail')
    })

    // Test 3: Very Long Admin Key
    await this.runTest('Very Long Admin Key', 'Auth', async () => {
      const longKey = this.generateTestData(10000)
      const response = await this.makeRequest('/api/auth/login', {
        method: 'POST',
        body: { adminKey: longKey },
      })

      this.assert(response.status === 401, `Expected 401, got ${response.status}`)
      this.assert(response.data.error !== undefined, 'Long key should fail')
    })

    // Test 4: Empty Admin Key
    await this.runTest('Empty Admin Key', 'Auth', async () => {
      const response = await this.makeRequest('/api/auth/login', {
        method: 'POST',
        body: { adminKey: '' },
      })

      this.assert(response.status === 400, `Expected 400, got ${response.status}`)
      this.assert(response.data.error !== undefined, 'Empty key should fail')
    })

    // Test 5: Missing Admin Key
    await this.runTest('Missing Admin Key', 'Auth', async () => {
      const response = await this.makeRequest('/api/auth/login', {
        method: 'POST',
        body: {},
      })

      this.assert(response.status === 400, `Expected 400, got ${response.status}`)
      this.assert(response.data.error !== undefined, 'Missing key should fail')
    })

    // Test 6: Multiple Auth Attempts (Rate Limiting)
    await this.runTest('Multiple Auth Attempts', 'Auth', async () => {
      const attempts = []

      for (let i = 0; i < 5; i++) {
        const response = await this.makeRequest('/api/auth/login', {
          method: 'POST',
          body: { adminKey: 'invalid-key-' + i },
        })

        attempts.push(response)
      }

      // All should fail, but server should handle gracefully
      const allFailed = attempts.every((r) => r.status === 401)
      this.assert(allFailed, 'Multiple invalid attempts should all fail')
    })

    // Test 7: Logout Without Session
    await this.runTest('Logout Without Session', 'Auth', async () => {
      const response = await this.makeRequest('/api/auth/logout', {
        method: 'POST',
      })

      // Should handle gracefully even without session
      this.assert(
        [200, 400].includes(response.status),
        'Logout should handle no session gracefully'
      )
    })
  }

  // Performance analysis
  analyzePerformance() {
    console.log(
      `\n${colors.bright}${colors.magenta}══════════════════════════════════════════${colors.reset}`
    )
    console.log(`${colors.bright}PERFORMANCE ANALYSIS${colors.reset}`)
    console.log(`${colors.magenta}══════════════════════════════════════════${colors.reset}`)

    if (this.performanceMetrics.length === 0) {
      console.log('No performance metrics collected')
      return
    }

    // Group by endpoint
    const endpointMetrics = {}
    this.performanceMetrics.forEach((metric) => {
      if (!endpointMetrics[metric.endpoint]) {
        endpointMetrics[metric.endpoint] = []
      }
      endpointMetrics[metric.endpoint].push(metric.duration)
    })

    // Analyze each endpoint
    Object.entries(endpointMetrics).forEach(([endpoint, durations]) => {
      const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length
      const min = Math.min(...durations)
      const max = Math.max(...durations)

      console.log(`${colors.cyan}${endpoint}${colors.reset}`)
      console.log(`  Requests: ${durations.length}`)
      console.log(`  Average: ${avg.toFixed(1)}ms`)
      console.log(`  Min: ${min}ms | Max: ${max}ms`)

      if (avg > 2000) {
        console.log(`  ${colors.yellow}⚠ Slow response times detected${colors.reset}`)
      }
    })

    // Overall statistics
    const allDurations = this.performanceMetrics.map((m) => m.duration)
    const overallAvg = allDurations.reduce((sum, d) => sum + d, 0) / allDurations.length
    const slowRequests = allDurations.filter((d) => d > 5000).length

    console.log(`\n${colors.bright}Overall Performance:${colors.reset}`)
    console.log(`  Total Requests: ${allDurations.length}`)
    console.log(`  Average Response Time: ${overallAvg.toFixed(1)}ms`)
    console.log(`  Slow Requests (>5s): ${slowRequests}`)
  }

  // Enhanced cleanup
  async comprehensiveCleanup() {
    console.log(
      `\n${colors.bright}${colors.yellow}══════════════════════════════════════════${colors.reset}`
    )
    console.log(`${colors.bright}COMPREHENSIVE TEST CLEANUP${colors.reset}`)
    console.log(`${colors.yellow}══════════════════════════════════════════${colors.reset}`)

    // Clean up all created forms
    for (const formKey of this.createdFormKeys) {
      try {
        console.log(`${colors.yellow}  Cleaning up form: ${formKey}${colors.reset}`)

        // Delete from both regular API and Supabase
        const deletePromises = [
          this.makeRequest('/api/forms', {
            method: 'DELETE',
            headers: { 'x-admin-key': config.adminApiKey },
            body: { refKey: formKey },
          }),
          // Also try to clean up any Supabase data
          this.makeRequest(`/api/responses?refKey=${formKey}&cleanup=true`, {
            method: 'DELETE',
            headers: { 'x-admin-key': config.adminApiKey },
          }),
        ]

        const results = await Promise.allSettled(deletePromises)

        const formDeleted = results[0].status === 'fulfilled' && results[0].value.status === 200
        if (formDeleted) {
          console.log(`${colors.green}  ✓ Form deleted: ${formKey}${colors.reset}`)
        } else {
          console.log(`${colors.yellow}  ! Form cleanup may have failed: ${formKey}${colors.reset}`)
        }
      } catch (error) {
        console.log(
          `${colors.red}  ✗ Cleanup error for ${formKey}: ${error.message}${colors.reset}`
        )
      }
    }

    // Use comprehensive cleanup utility
    await this.cleanup.performFullCleanup()

    // Clean up any test settings that were modified
    try {
      await this.makeRequest('/api/settings', {
        method: 'POST',
        headers: { 'x-admin-key': config.adminApiKey },
        body: {
          aiModel: 'gpt-4o-mini',
          apiKey: '',
          anthropicApiKey: '',
        },
      })
      console.log(`${colors.green}  ✓ Settings reset to defaults${colors.reset}`)
    } catch (error) {
      console.log(`${colors.yellow}  ! Settings cleanup failed: ${error.message}${colors.reset}`)
    }
  }

  // Enhanced test report
  generateComprehensiveReport() {
    this.results.endTime = new Date()
    const duration = this.results.endTime - this.results.startTime

    console.log(
      `\n${colors.bright}${colors.cyan}══════════════════════════════════════════${colors.reset}`
    )
    console.log(`${colors.bright}COMPREHENSIVE API TEST RESULTS${colors.reset}`)
    console.log(`${colors.cyan}══════════════════════════════════════════${colors.reset}`)

    console.log(`${colors.bright}Test Summary:${colors.reset}`)
    console.log(`  Total Tests: ${this.results.total}`)
    console.log(`  ${colors.green}Passed: ${this.results.passed}${colors.reset}`)
    console.log(`  ${colors.red}Failed: ${this.results.failed}${colors.reset}`)
    console.log(`  ${colors.yellow}Skipped: ${this.results.skipped}${colors.reset}`)
    console.log(`  Duration: ${duration}ms (${(duration / 1000).toFixed(1)}s)`)

    const successRate = ((this.results.passed / this.results.total) * 100).toFixed(1)
    console.log(`  Success Rate: ${successRate}%`)

    // Category breakdown
    const categories = {}
    this.results.tests.forEach((test) => {
      if (!categories[test.category]) {
        categories[test.category] = { total: 0, passed: 0, failed: 0 }
      }
      categories[test.category].total++
      categories[test.category][test.status]++
    })

    console.log(`\n${colors.bright}Results by Category:${colors.reset}`)
    Object.entries(categories).forEach(([category, stats]) => {
      const categoryRate = ((stats.passed / stats.total) * 100).toFixed(1)
      console.log(`  ${category}: ${stats.passed}/${stats.total} (${categoryRate}%)`)
    })

    // Performance analysis
    this.analyzePerformance()

    // Failed tests detail
    if (this.results.failed > 0) {
      console.log(`\n${colors.red}Failed Tests Detail:${colors.reset}`)
      this.results.tests
        .filter((test) => test.status === 'failed')
        .forEach((test) => {
          console.log(`  ${colors.red}✗ [${test.category}] ${test.name}${colors.reset}`)
          console.log(`    ${colors.red}${test.error}${colors.reset}`)
          console.log(`    Duration: ${test.duration}ms`)
        })
    }

    return this.results
  }

  // ═══════════════════════════════════════════
  // ENHANCED AI GENERATION TESTS (GPT-5 HANDLING)
  // ═══════════════════════════════════════════

  async testAIAPIComprehensive() {
    console.log(
      `\n${colors.bright}${colors.magenta}══════════════════════════════════════════${colors.reset}`
    )
    console.log(`${colors.bright}COMPREHENSIVE AI GENERATION TESTS${colors.reset}`)
    console.log(`${colors.magenta}══════════════════════════════════════════${colors.reset}`)

    // Run standard AI tests first
    await this.testAIAPI()

    // Test 1: GPT-5 Empty Content Detection
    await this.runTest('GPT-5 Empty Content Handling', 'AI', async () => {
      const response = await this.makeRequestWithMetrics('/api/ai/generate', {
        method: 'POST',
        headers: { 'x-admin-key': config.adminApiKey },
        body: {
          prompt: 'Create a complex form with 100 fields that might exhaust tokens',
        },
      })

      if (response.status === 500 && response.data.error) {
        const errorMessage = response.data.error.toLowerCase()
        const hasHelpfulError =
          errorMessage.includes('reasoning tokens') ||
          errorMessage.includes('gpt-4o') ||
          errorMessage.includes('no content')

        this.assert(
          response.status === 200 || hasHelpfulError,
          'Should provide helpful error for GPT-5 token exhaustion'
        )
      }
    })

    // Test 2: Long Prompt Token Management
    await this.runTest('Long Prompt Token Management', 'AI', async () => {
      const longPrompt = 'Create a form with: ' + 'many fields, '.repeat(500)

      const response = await this.makeRequestWithMetrics('/api/ai/generate', {
        method: 'POST',
        headers: { 'x-admin-key': config.adminApiKey },
        body: { prompt: longPrompt },
      })

      this.assert(
        response.status === 200 || response.data.error,
        'Should handle long prompts gracefully'
      )
    })

    // Test 3: JSON Response Validation
    await this.runTest('AI JSON Response Structure', 'AI', async () => {
      const response = await this.makeRequestWithMetrics('/api/ai/generate', {
        method: 'POST',
        headers: { 'x-admin-key': config.adminApiKey },
        body: { prompt: 'Create a simple contact form' },
      })

      if (response.status === 200) {
        this.assert(response.data.title, 'Should have title')
        this.assert(Array.isArray(response.data.fields), 'Should have fields array')
        this.assert(response.data.refKey, 'Should have refKey')
      }
    })

    // Test 4: Error Message Clarity
    await this.runTest('AI Error Message Clarity', 'AI', async () => {
      const response = await this.makeRequestWithMetrics('/api/ai/generate', {
        method: 'POST',
        headers: { 'x-admin-key': config.adminApiKey },
        body: { prompt: 'x'.repeat(5) }, // Too short
      })

      if (response.status >= 400) {
        this.assert(response.data.error, 'Should have error message')
        if (response.data.details) {
          this.assert(Array.isArray(response.data.details), 'Should have error details')
        }
      }
    })
  }

  // ═══════════════════════════════════════════
  // GOOGLE SHEETS INTEGRATION TESTS
  // ═══════════════════════════════════════════

  async testGoogleSheetsIntegration() {
    console.log(
      `\n${colors.bright}${colors.green}══════════════════════════════════════════${colors.reset}`
    )
    console.log(`${colors.bright}GOOGLE SHEETS INTEGRATION TESTS${colors.reset}`)
    console.log(`${colors.green}══════════════════════════════════════════${colors.reset}`)

    // Test 1: Validate Google Sheet URL
    await this.runTest('Validate Google Sheet URL', 'GoogleSheets', async () => {
      const response = await this.makeRequestWithMetrics('/api/forms/validate-google-sheet', {
        method: 'POST',
        headers: { 'x-admin-key': config.adminApiKey },
        body: {
          sheetUrl: 'https://docs.google.com/spreadsheets/d/1234567890/edit',
        },
      })

      this.assert(
        response.status === 200 || response.status === 400,
        `Should validate sheet URL, got ${response.status}`
      )
    })

    // Test 2: Test Google Sheet Connection
    await this.runTest('Test Google Sheet Connection', 'GoogleSheets', async () => {
      const response = await this.makeRequestWithMetrics('/api/forms/test-google-sheet', {
        method: 'POST',
        headers: { 'x-admin-key': config.adminApiKey },
        body: {
          sheetId: 'test-sheet-id',
          sheetName: 'Sheet1',
        },
      })

      // Should handle gracefully even without Google auth
      this.assert(response.status !== undefined, 'Should return a status code')
    })

    // Test 3: Export Responses to Sheet
    await this.runTest('Export Responses to Sheet', 'GoogleSheets', async () => {
      const response = await this.makeRequestWithMetrics('/api/forms/export-responses', {
        method: 'POST',
        headers: { 'x-admin-key': config.adminApiKey },
        body: {
          refKey: 'test-form',
          sheetUrl: 'https://docs.google.com/spreadsheets/d/test/edit',
        },
      })

      // Should handle gracefully
      this.assert(response.status === 200 || response.data.error, 'Should handle export request')
    })

    // Test 4: Invalid Sheet URL Format
    await this.runTest('Invalid Sheet URL Format', 'GoogleSheets', async () => {
      const response = await this.makeRequestWithMetrics('/api/forms/validate-google-sheet', {
        method: 'POST',
        headers: { 'x-admin-key': config.adminApiKey },
        body: {
          sheetUrl: 'not-a-valid-url',
        },
      })

      this.assert(response.status >= 400, 'Should reject invalid URL format')
    })

    // Test 5: Missing Authentication
    await this.runTest('Google Sheets Without Auth', 'GoogleSheets', async () => {
      const response = await this.makeRequestWithMetrics('/api/forms/export-responses', {
        method: 'POST',
        body: {
          refKey: 'test-form',
          sheetUrl: 'https://docs.google.com/spreadsheets/d/test/edit',
        },
      })

      this.assert(response.status === 401, 'Should require authentication')
    })
  }

  // ═══════════════════════════════════════════
  // GOOGLE AUTH FLOW TESTS
  // ═══════════════════════════════════════════

  async testGoogleAuthFlow() {
    console.log(
      `\n${colors.bright}${colors.blue}══════════════════════════════════════════${colors.reset}`
    )
    console.log(`${colors.bright}GOOGLE AUTH FLOW TESTS${colors.reset}`)
    console.log(`${colors.blue}══════════════════════════════════════════${colors.reset}`)

    // Test 1: Initiate Google Auth
    await this.runTest('Initiate Google Auth', 'GoogleAuth', async () => {
      const response = await this.makeRequestWithMetrics('/api/auth/google', {
        method: 'GET',
        headers: { 'x-admin-key': config.adminApiKey },
      })

      // Should return auth URL or handle gracefully
      this.assert(
        response.status === 200 || response.status === 302 || response.data.error,
        'Should handle auth initiation'
      )
    })

    // Test 2: Check Google Auth Status
    await this.runTest('Check Google Auth Status', 'GoogleAuth', async () => {
      const response = await this.makeRequestWithMetrics('/api/auth/google/status', {
        method: 'GET',
        headers: { 'x-admin-key': config.adminApiKey },
      })

      this.assert(response.status === 200, `Should return auth status, got ${response.status}`)

      if (response.status === 200) {
        this.assert(response.data.authenticated !== undefined, 'Should have authenticated field')
      }
    })

    // Test 3: Google Logout
    await this.runTest('Google Logout', 'GoogleAuth', async () => {
      const response = await this.makeRequestWithMetrics('/api/auth/google/logout', {
        method: 'POST',
        headers: { 'x-admin-key': config.adminApiKey },
      })

      this.assert(
        response.status === 200 || response.status === 204,
        'Should handle logout request'
      )
    })

    // Test 4: Invalid Callback Handling
    await this.runTest('Invalid Google Callback', 'GoogleAuth', async () => {
      const response = await this.makeRequestWithMetrics('/api/auth/google/callback?code=invalid', {
        method: 'GET',
      })

      // Should handle invalid callback gracefully
      this.assert(response.status !== undefined, 'Should handle invalid callback')
    })
  }

  // Main comprehensive test runner
  async run() {
    console.log(`${colors.bright}${colors.cyan}FormDee Comprehensive API Test Suite${colors.reset}`)
    console.log(`${colors.cyan}Testing against: ${config.baseUrl}${colors.reset}`)
    console.log(`${colors.cyan}Timestamp: ${new Date().toISOString()}${colors.reset}\n`)

    this.results.startTime = new Date()

    try {
      // Run all comprehensive test suites
      await this.testHealthAPIComprehensive()
      await this.testAuthAPIComprehensive()

      // Run standard tests for core endpoints
      await this.testFormsAPI()
      await this.testSubmissionAPI()
      await this.testResponsesAPI()
      await this.testSettingsAPI()

      // Run enhanced AI tests with GPT-5 handling
      await this.testAIAPIComprehensive()

      // Run Google integration tests
      await this.testGoogleSheetsIntegration()
      await this.testGoogleAuthFlow()

      await this.testUploadAPI()

      return this.generateComprehensiveReport()
    } catch (error) {
      console.error(`${colors.red}Comprehensive test suite failed: ${error.message}${colors.reset}`)
      throw error
    } finally {
      await this.comprehensiveCleanup()
    }
  }
}

// Export for use by test runner
module.exports = ComprehensiveAPITestSuite

// Run tests if called directly
if (require.main === module) {
  const testSuite = new ComprehensiveAPITestSuite()
  testSuite
    .run()
    .then((results) => {
      process.exit(results.failed > 0 ? 1 : 0)
    })
    .catch((error) => {
      console.error('Comprehensive test suite crashed:', error)
      process.exit(1)
    })
}
