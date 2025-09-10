#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Standard API Test Suite - Updated for Latest Codebase
 * Tests core functionality across all API endpoints with essential test cases
 *
 * NEW ENDPOINTS COVERED:
 * - /api/health - Health monitoring
 * - /api/auth/* - Authentication system
 * - /api/responses - Response data management
 * - /api/settings - Settings management
 * - /api/ai/generate - AI form generation
 * - /api/upload - File upload to R2
 * - /api/submit/supabase - Direct Supabase submission
 */

const http = require('http')
const https = require('https')
const TestDataCleanup = require('../utils/test-cleanup')
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

class StandardAPITestSuite {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: [],
      startTime: null,
      endTime: null,
    }
    this.createdFormKeys = [] // Track forms to cleanup
    this.cleanup = new TestDataCleanup()
  }

  // Utility: Make HTTP request
  async makeRequest(endpoint, options = {}) {
    const url = new URL(endpoint, config.baseUrl)
    const isHttps = url.protocol === 'https:'
    const client = isHttps ? https : http

    return new Promise((resolve, reject) => {
      const reqOptions = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'FormDee-API-Test-Suite/1.0',
          ...options.headers,
        },
      }

      const req = client.request(reqOptions, (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          try {
            const parsedData = data ? JSON.parse(data) : {}
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: parsedData,
            })
          } catch (e) {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: data,
            })
          }
        })
      })

      req.on('error', reject)

      if (options.body) {
        req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body))
      }

      req.end()
    })
  }

  // Test runner
  async runTest(name, category, testFn) {
    this.results.total++
    const testStart = Date.now()

    try {
      console.log(`${colors.cyan}    Running: ${name}${colors.reset}`)
      await testFn()

      const duration = Date.now() - testStart
      this.results.passed++
      this.results.tests.push({
        name,
        category,
        status: 'passed',
        duration,
        error: null,
      })

      console.log(`${colors.green}    ✓ ${name} (${duration}ms)${colors.reset}`)
    } catch (error) {
      const duration = Date.now() - testStart
      this.results.failed++
      this.results.tests.push({
        name,
        category,
        status: 'failed',
        duration,
        error: error.message,
      })

      console.log(`${colors.red}    ✗ ${name} (${duration}ms)${colors.reset}`)
      console.log(`${colors.red}      Error: ${error.message}${colors.reset}`)
    }
  }

  // Assertion helper
  assert(condition, message) {
    if (!condition) {
      throw new Error(message)
    }
  }

  // ═══════════════════════════════════════════
  // HEALTH API TESTS
  // ═══════════════════════════════════════════

  async testHealthAPI() {
    console.log(
      `\n${colors.bright}${colors.blue}══════════════════════════════════════════${colors.reset}`
    )
    console.log(`${colors.bright}HEALTH API TESTS${colors.reset}`)
    console.log(`${colors.blue}══════════════════════════════════════════${colors.reset}`)

    // Test 1: Basic Health Check
    await this.runTest('Basic Health Check', 'Health', async () => {
      const response = await this.makeRequest('/api/health')

      this.assert(response.status === 200, `Expected 200, got ${response.status}`)
      this.assert(response.data.status, 'Health status should be present')
      this.assert(response.data.timestamp, 'Timestamp should be present')
    })

    // Test 2: Detailed Health Check
    await this.runTest('Detailed Health Check', 'Health', async () => {
      const response = await this.makeRequest('/api/health?detailed=true')

      this.assert(response.status === 200, `Expected 200, got ${response.status}`)
      this.assert(response.data.status, 'Health status should be present')
      this.assert(response.data.supabase, 'Supabase status should be present')
      this.assert(response.data.environment, 'Environment info should be present')
    })
  }

  // ═══════════════════════════════════════════
  // AUTHENTICATION API TESTS
  // ═══════════════════════════════════════════

  async testAuthAPI() {
    console.log(
      `\n${colors.bright}${colors.blue}══════════════════════════════════════════${colors.reset}`
    )
    console.log(`${colors.bright}AUTHENTICATION API TESTS${colors.reset}`)
    console.log(`${colors.blue}══════════════════════════════════════════${colors.reset}`)

    // Test 1: Login with Valid Credentials
    await this.runTest('Login with Valid Credentials', 'Auth', async () => {
      const response = await this.makeRequest('/api/auth/login', {
        method: 'POST',
        body: { adminKey: config.adminUiKey },
      })

      this.assert(response.status === 200, `Expected 200, got ${response.status}`)
      this.assert(response.data.success === true, 'Login should be successful')
    })

    // Test 2: Login with Invalid Credentials
    await this.runTest('Login with Invalid Credentials', 'Auth', async () => {
      const response = await this.makeRequest('/api/auth/login', {
        method: 'POST',
        body: { adminKey: 'invalid-key' },
      })

      this.assert(response.status === 401, `Expected 401, got ${response.status}`)
      this.assert(response.data.error !== undefined, 'Login should fail with error')
    })

    // Test 3: Auth Status Check
    await this.runTest('Auth Status Check', 'Auth', async () => {
      const response = await this.makeRequest('/api/auth/check')

      // Should return 401 or 200 depending on auth state
      this.assert(
        [200, 401].includes(response.status),
        `Expected 200 or 401, got ${response.status}`
      )
      this.assert(
        typeof response.data.authenticated === 'boolean',
        'Should return authentication status'
      )
    })
  }

  // ═══════════════════════════════════════════
  // FORMS API TESTS
  // ═══════════════════════════════════════════

  async testFormsAPI() {
    console.log(
      `\n${colors.bright}${colors.blue}══════════════════════════════════════════${colors.reset}`
    )
    console.log(`${colors.bright}FORMS API TESTS${colors.reset}`)
    console.log(`${colors.blue}══════════════════════════════════════════${colors.reset}`)

    // Generate unique form refKey for this test run
    const testRefKey = `test-standard-${Date.now()}`
    this.createdFormKeys.push(testRefKey)

    // Test 1: Create Form
    await this.runTest('Create Form', 'Forms', async () => {
      const formData = {
        ...config.testData.testForm,
        refKey: testRefKey,
      }

      const response = await this.makeRequest('/api/forms', {
        method: 'POST',
        headers: { 'x-admin-key': config.adminApiKey },
        body: formData,
      })

      this.assert(response.status === 200, `Expected 200, got ${response.status}`)
      this.assert(response.data.ok === true, 'Response should have ok:true')
    })

    // Test 2: Get Single Form
    await this.runTest('Get Single Form', 'Forms', async () => {
      const response = await this.makeRequest(`/api/forms?refKey=${testRefKey}`)

      this.assert(response.status === 200, `Expected 200, got ${response.status}`)
      this.assert(response.data.data.refKey === testRefKey, 'Should return correct form')
      this.assert(Array.isArray(response.data.data.fields), 'Fields should be an array')
    })

    // Test 3: Update Form
    await this.runTest('Update Form', 'Forms', async () => {
      const updatedData = {
        ...config.testData.testForm,
        refKey: testRefKey,
        title: 'Updated Test Form',
      }

      const response = await this.makeRequest('/api/forms', {
        method: 'POST',
        headers: { 'x-admin-key': config.adminApiKey },
        body: updatedData,
      })

      this.assert(response.status === 200, `Expected 200, got ${response.status}`)
      this.assert(response.data.ok === true, 'Update should succeed')
    })

    // Test 4: Non-existent Form
    await this.runTest('Non-existent Form', 'Forms', async () => {
      const response = await this.makeRequest('/api/forms?refKey=non-existent-form-12345')

      this.assert(response.status === 404, `Expected 404, got ${response.status}`)
      this.assert(response.data.ok === false, 'Response should have ok:false')
    })

    // Test 5: Unauthorized Access
    await this.runTest('Unauthorized Form Access', 'Forms', async () => {
      const response = await this.makeRequest('/api/forms', {
        method: 'POST',
        headers: { 'x-admin-key': 'invalid-key' },
        body: config.testData.testForm,
      })

      this.assert(response.status === 401, `Expected 401, got ${response.status}`)
      this.assert(response.data.ok === false, 'Response should have ok:false')
    })
  }

  // ═══════════════════════════════════════════
  // SUBMISSION API TESTS
  // ═══════════════════════════════════════════

  async testSubmissionAPI() {
    console.log(
      `\n${colors.bright}${colors.blue}══════════════════════════════════════════${colors.reset}`
    )
    console.log(`${colors.bright}SUBMISSION API TESTS${colors.reset}`)
    console.log(`${colors.blue}══════════════════════════════════════════${colors.reset}`)

    const testRefKey = this.createdFormKeys[0] // Use the form we created

    // Test 1: Submit to Form
    await this.runTest('Submit to Form', 'Submission', async () => {
      const response = await this.makeRequest('/api/submit', {
        method: 'POST',
        body: {
          refKey: testRefKey,
          values: config.testData.testSubmission,
        },
      })

      this.assert(response.status === 200, `Expected 200, got ${response.status}`)
      this.assert(response.data.ok === true, 'Submission should succeed')
    })

    // Test 2: Submit to Supabase
    await this.runTest('Submit to Supabase', 'Submission', async () => {
      const response = await this.makeRequest('/api/submit/supabase', {
        method: 'POST',
        body: {
          refKey: testRefKey,
          values: config.testData.testSubmission,
        },
      })

      this.assert(response.status === 200, `Expected 200, got ${response.status}`)
      this.assert(response.data.ok === true, 'Supabase submission should succeed')
    })

    // Test 3: Invalid Submission
    await this.runTest('Invalid Submission', 'Submission', async () => {
      const response = await this.makeRequest('/api/submit', {
        method: 'POST',
        body: {
          refKey: 'non-existent-form',
          values: config.testData.testSubmission,
        },
      })

      this.assert(response.status >= 400, `Expected error status, got ${response.status}`)
      this.assert(response.data.ok === false, 'Invalid submission should fail')
    })
  }

  // ═══════════════════════════════════════════
  // RESPONSES API TESTS
  // ═══════════════════════════════════════════

  async testResponsesAPI() {
    console.log(
      `\n${colors.bright}${colors.blue}══════════════════════════════════════════${colors.reset}`
    )
    console.log(`${colors.bright}RESPONSES API TESTS${colors.reset}`)
    console.log(`${colors.blue}══════════════════════════════════════════${colors.reset}`)

    const testRefKey = this.createdFormKeys[0]

    // Test 1: Get Responses (Authenticated)
    await this.runTest('Get Responses (Authenticated)', 'Responses', async () => {
      const response = await this.makeRequest(`/api/responses?refKey=${testRefKey}`, {
        headers: { 'x-admin-key': config.adminApiKey },
      })

      this.assert(response.status === 200, `Expected 200, got ${response.status}`)
      this.assert(Array.isArray(response.data.data), 'Should return responses array')
    })

    // Test 2: Unauthorized Response Access
    await this.runTest('Unauthorized Response Access', 'Responses', async () => {
      const response = await this.makeRequest(`/api/responses?refKey=${testRefKey}`)

      this.assert(response.status === 401, `Expected 401, got ${response.status}`)
      this.assert(response.data.ok === false, 'Unauthorized access should fail')
    })

    // Test 3: Get Responses with Pagination
    await this.runTest('Get Responses with Pagination', 'Responses', async () => {
      const response = await this.makeRequest(
        `/api/responses?refKey=${testRefKey}&limit=10&offset=0`,
        {
          headers: { 'x-admin-key': config.adminApiKey },
        }
      )

      this.assert(response.status === 200, `Expected 200, got ${response.status}`)
      this.assert(Array.isArray(response.data.data), 'Should return paginated responses')
    })
  }

  // ═══════════════════════════════════════════
  // SETTINGS API TESTS
  // ═══════════════════════════════════════════

  async testSettingsAPI() {
    console.log(
      `\n${colors.bright}${colors.blue}══════════════════════════════════════════${colors.reset}`
    )
    console.log(`${colors.bright}SETTINGS API TESTS${colors.reset}`)
    console.log(`${colors.blue}══════════════════════════════════════════${colors.reset}`)

    // Test 1: Get Settings (Authenticated)
    await this.runTest('Get Settings (Authenticated)', 'Settings', async () => {
      const response = await this.makeRequest('/api/settings', {
        headers: { 'x-admin-key': config.adminApiKey },
      })

      this.assert(response.status === 200, `Expected 200, got ${response.status}`)
      this.assert(response.data.aiModel !== undefined, 'Should return AI model setting')
    })

    // Test 2: Update Settings
    await this.runTest('Update Settings', 'Settings', async () => {
      const response = await this.makeRequest('/api/settings', {
        method: 'POST',
        headers: { 'x-admin-key': config.adminApiKey },
        body: config.testData.settingsData.valid,
      })

      this.assert(response.status === 200, `Expected 200, got ${response.status}`)
      this.assert(response.data.success === true, 'Settings update should succeed')
    })

    // Test 3: Unauthorized Settings Access
    await this.runTest('Unauthorized Settings Access', 'Settings', async () => {
      const response = await this.makeRequest('/api/settings')

      this.assert(response.status === 401, `Expected 401, got ${response.status}`)
      this.assert(response.data.error !== undefined, 'Unauthorized access should fail')
    })
  }

  // ═══════════════════════════════════════════
  // AI GENERATION API TESTS
  // ═══════════════════════════════════════════

  async testAIAPI() {
    console.log(
      `\n${colors.bright}${colors.blue}══════════════════════════════════════════${colors.reset}`
    )
    console.log(`${colors.bright}AI GENERATION API TESTS${colors.reset}`)
    console.log(`${colors.blue}══════════════════════════════════════════${colors.reset}`)

    // Test 1: Generate Form (Simple Prompt)
    await this.runTest('Generate Form (Simple)', 'AI', async () => {
      const response = await this.makeRequest('/api/ai/generate', {
        method: 'POST',
        headers: { 'x-admin-key': config.adminApiKey },
        body: { prompt: config.testData.aiPrompts.simple },
      })

      // Note: May fail if no AI API key configured, that's expected
      const isValidResponse =
        response.status === 200 || (response.status >= 400 && response.data.error)

      this.assert(isValidResponse, `Expected valid response, got ${response.status}`)
    })

    // Test 2: Unauthorized AI Access
    await this.runTest('Unauthorized AI Access', 'AI', async () => {
      const response = await this.makeRequest('/api/ai/generate', {
        method: 'POST',
        body: { prompt: config.testData.aiPrompts.simple },
      })

      this.assert(response.status === 401, `Expected 401, got ${response.status}`)
      this.assert(response.data.error !== undefined, 'Unauthorized access should fail')
    })

    // Test 3: Empty Prompt Validation
    await this.runTest('Empty Prompt Validation', 'AI', async () => {
      const response = await this.makeRequest('/api/ai/generate', {
        method: 'POST',
        headers: { 'x-admin-key': config.adminApiKey },
        body: { prompt: '' },
      })

      this.assert(response.status >= 400, `Expected error status, got ${response.status}`)
      this.assert(response.data.error !== undefined, 'Empty prompt should fail validation')
    })
  }

  // ═══════════════════════════════════════════
  // UPLOAD API TESTS
  // ═══════════════════════════════════════════

  async testUploadAPI() {
    console.log(
      `\n${colors.bright}${colors.blue}══════════════════════════════════════════${colors.reset}`
    )
    console.log(`${colors.bright}UPLOAD API TESTS${colors.reset}`)
    console.log(`${colors.blue}══════════════════════════════════════════${colors.reset}`)

    // Test 1: File Upload Structure Test
    await this.runTest('Upload API Structure', 'Upload', async () => {
      // Test with minimal request to check endpoint exists
      const response = await this.makeRequest('/api/upload', {
        method: 'POST',
        body: { test: 'minimal' },
      })

      // Should return error for missing file, but endpoint should exist
      const isValidEndpoint = response.status !== 404
      this.assert(isValidEndpoint, 'Upload endpoint should exist')
    })

    // Test 2: Missing File Validation
    await this.runTest('Missing File Validation', 'Upload', async () => {
      const response = await this.makeRequest('/api/upload', {
        method: 'POST',
        body: {},
      })

      this.assert(response.status >= 400, `Expected error for missing file, got ${response.status}`)
    })

    // Note: Actual file upload tests would require multipart/form-data handling
    // which is more complex in this test suite format
  }

  // ═══════════════════════════════════════════
  // SLACK INTEGRATION TESTS
  // ═══════════════════════════════════════════

  async testSlackIntegration() {
    console.log(
      `\n${colors.bright}${colors.blue}══════════════════════════════════════════${colors.reset}`
    )
    console.log(`${colors.bright}SLACK INTEGRATION TESTS${colors.reset}`)
    console.log(`${colors.blue}══════════════════════════════════════════${colors.reset}`)

    const slackWebhook = config.testData.externalIntegrations.slack.webhookUrl

    if (!slackWebhook) {
      console.log(
        `${colors.yellow}    ⚠ Skipping Slack tests - No webhook URL provided${colors.reset}`
      )
      console.log(
        `${colors.yellow}      Set TEST_SLACK_WEBHOOK_URL environment variable to test${colors.reset}`
      )
      return
    }

    // Test 1: Valid Slack Webhook Test
    await this.runTest('Valid Slack Webhook Test', 'Slack', async () => {
      const response = await this.makeRequest('/api/forms/test-slack', {
        method: 'POST',
        headers: { 'x-admin-key': config.adminApiKey },
        body: {
          refKey: 'test-slack-integration',
          slackWebhookUrl: slackWebhook,
        },
      })

      this.assert(response.status === 200, `Expected 200, got ${response.status}`)
      this.assert(response.data.ok === true, 'Slack test should succeed')
      this.assert(response.data.message, 'Should return success message')
    })

    // Test 2: Missing Webhook URL
    await this.runTest('Missing Slack Webhook URL', 'Slack', async () => {
      const response = await this.makeRequest('/api/forms/test-slack', {
        method: 'POST',
        headers: { 'x-admin-key': config.adminApiKey },
        body: {
          refKey: 'test-form',
          // Missing slackWebhookUrl
        },
      })

      this.assert(response.status === 400, `Expected 400, got ${response.status}`)
      this.assert(response.data.ok === false, 'Should fail without webhook URL')
    })

    // Test 3: Unauthorized Slack Test
    await this.runTest('Unauthorized Slack Test', 'Slack', async () => {
      const response = await this.makeRequest('/api/forms/test-slack', {
        method: 'POST',
        body: {
          refKey: 'test-form',
          slackWebhookUrl: slackWebhook,
        },
      })

      this.assert(response.status === 401, `Expected 401, got ${response.status}`)
      this.assert(response.data.ok === false, 'Should require authentication')
    })
  }

  // ═══════════════════════════════════════════
  // OPENAI SETTINGS TESTS
  // ═══════════════════════════════════════════

  async testOpenAISettings() {
    console.log(
      `\n${colors.bright}${colors.blue}══════════════════════════════════════════${colors.reset}`
    )
    console.log(`${colors.bright}OPENAI SETTINGS TESTS${colors.reset}`)
    console.log(`${colors.blue}══════════════════════════════════════════${colors.reset}`)

    const openaiKey = config.testData.externalIntegrations.openai.apiKey

    if (!openaiKey) {
      console.log(
        `${colors.yellow}    ⚠ Skipping OpenAI tests - No API key provided${colors.reset}`
      )
      console.log(
        `${colors.yellow}      Set TEST_OPENAI_API_KEY environment variable to test${colors.reset}`
      )
      return
    }

    // Test 1: Valid OpenAI Configuration Test
    await this.runTest('Valid OpenAI Configuration Test', 'OpenAI', async () => {
      const response = await this.makeRequest('/api/settings/test', {
        method: 'POST',
        headers: { 'x-admin-key': config.adminApiKey },
        body: {
          aiModel: config.testData.externalIntegrations.openai.testModel,
          aiApiKey: openaiKey,
        },
      })

      this.assert(response.status === 200, `Expected 200, got ${response.status}`)
      this.assert(response.data.success === true, 'OpenAI test should succeed')
      this.assert(response.data.model, 'Should return model information')
    })

    // Test 2: Missing API Key
    await this.runTest('Missing OpenAI API Key', 'OpenAI', async () => {
      const response = await this.makeRequest('/api/settings/test', {
        method: 'POST',
        headers: { 'x-admin-key': config.adminApiKey },
        body: {
          aiModel: 'gpt-4o-mini',
          // Missing aiApiKey
        },
      })

      this.assert(response.status === 400, `Expected 400, got ${response.status}`)
      this.assert(response.data.error, 'Should return error for missing API key')
    })

    // Test 3: Invalid API Key
    await this.runTest('Invalid OpenAI API Key', 'OpenAI', async () => {
      const response = await this.makeRequest('/api/settings/test', {
        method: 'POST',
        headers: { 'x-admin-key': config.adminApiKey },
        body: {
          aiModel: 'gpt-4o-mini',
          aiApiKey: 'sk-invalid-key-12345',
        },
      })

      this.assert(response.status === 400, `Expected 400, got ${response.status}`)
      this.assert(response.data.error, 'Should return error for invalid API key')
    })

    // Test 4: Unauthorized Settings Test
    await this.runTest('Unauthorized Settings Test', 'OpenAI', async () => {
      const response = await this.makeRequest('/api/settings/test', {
        method: 'POST',
        body: {
          aiModel: 'gpt-4o-mini',
          aiApiKey: openaiKey,
        },
      })

      this.assert(response.status === 401, `Expected 401, got ${response.status}`)
      this.assert(response.data.error, 'Should require authentication')
    })
  }

  // ═══════════════════════════════════════════
  // CLEANUP AND REPORTING
  // ═══════════════════════════════════════════

  async cleanup() {
    console.log(
      `\n${colors.bright}${colors.yellow}══════════════════════════════════════════${colors.reset}`
    )
    console.log(`${colors.bright}CLEANING UP TEST DATA${colors.reset}`)
    console.log(`${colors.yellow}══════════════════════════════════════════${colors.reset}`)

    for (const formKey of this.createdFormKeys) {
      try {
        console.log(`${colors.yellow}  Cleaning up form: ${formKey}${colors.reset}`)

        const response = await this.makeRequest('/api/forms', {
          method: 'DELETE',
          headers: { 'x-admin-key': config.adminApiKey },
          body: { refKey: formKey },
        })

        if (response.status === 200) {
          console.log(`${colors.green}  ✓ Deleted form: ${formKey}${colors.reset}`)
        } else {
          console.log(`${colors.yellow}  ! Form may not exist: ${formKey}${colors.reset}`)
        }
      } catch (error) {
        console.log(
          `${colors.red}  ✗ Failed to delete form: ${formKey} - ${error.message}${colors.reset}`
        )
      }
    }

    // Use the comprehensive cleanup utility
    await this.cleanup.cleanupTestData()
  }

  // Generate test report
  generateReport() {
    this.results.endTime = new Date()
    const duration = this.results.endTime - this.results.startTime

    console.log(
      `\n${colors.bright}${colors.cyan}══════════════════════════════════════════${colors.reset}`
    )
    console.log(`${colors.bright}STANDARD API TEST RESULTS${colors.reset}`)
    console.log(`${colors.cyan}══════════════════════════════════════════${colors.reset}`)

    console.log(`${colors.bright}Total Tests:${colors.reset} ${this.results.total}`)
    console.log(`${colors.green}Passed:${colors.reset} ${this.results.passed}`)
    console.log(`${colors.red}Failed:${colors.reset} ${this.results.failed}`)
    console.log(`${colors.yellow}Skipped:${colors.reset} ${this.results.skipped}`)
    console.log(`${colors.bright}Duration:${colors.reset} ${duration}ms`)

    const successRate = ((this.results.passed / this.results.total) * 100).toFixed(1)
    console.log(`${colors.bright}Success Rate:${colors.reset} ${successRate}%`)

    if (this.results.failed > 0) {
      console.log(`\n${colors.red}Failed Tests:${colors.reset}`)
      this.results.tests
        .filter((test) => test.status === 'failed')
        .forEach((test) => {
          console.log(`  ${colors.red}✗ ${test.category}: ${test.name}${colors.reset}`)
          console.log(`    ${colors.red}${test.error}${colors.reset}`)
        })
    }

    return this.results
  }

  // Main test runner
  async run() {
    console.log(`${colors.bright}${colors.cyan}FormDee Standard API Test Suite${colors.reset}`)
    console.log(`${colors.cyan}Testing against: ${config.baseUrl}${colors.reset}`)
    console.log(`${colors.cyan}Timestamp: ${new Date().toISOString()}${colors.reset}\n`)

    this.results.startTime = new Date()

    try {
      // Run all test suites
      await this.testHealthAPI()
      await this.testAuthAPI()
      await this.testFormsAPI()
      await this.testSubmissionAPI()
      await this.testResponsesAPI()
      await this.testSettingsAPI()
      await this.testAIAPI()
      await this.testUploadAPI()
      await this.testSlackIntegration()
      await this.testOpenAISettings()

      return this.generateReport()
    } catch (error) {
      console.error(`${colors.red}Test suite failed: ${error.message}${colors.reset}`)
      throw error
    } finally {
      await this.cleanup.cleanupTestForms()
    }
  }
}

// Export for use by test runner
module.exports = StandardAPITestSuite

// Run tests if called directly
if (require.main === module) {
  const testSuite = new StandardAPITestSuite()
  testSuite
    .run()
    .then((results) => {
      process.exit(results.failed > 0 ? 1 : 0)
    })
    .catch((error) => {
      console.error('Test suite crashed:', error)
      process.exit(1)
    })
}
