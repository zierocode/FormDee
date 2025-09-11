#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Unified Test Runner for Form Builder
 * Organizes tests into 4 categories as specified
 */

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

// ANSI colors
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

// Test configurations for each category
const testConfigs = {
  'api-standard': {
    name: 'API Standard Tests',
    description: 'Core API functionality tests with basic coverage',
    file: 'tests/api/api-test-standard.js',
    tests: [
      'Forms CRUD (Create, Read, Update, List)',
      'Basic Form Submission',
      'Authentication & Authorization',
      'Supabase Database Operations',
      'Error Handling',
      'Basic Validation',
    ],
    estimatedTime: '1 minute',
    testCount: 21,
  },

  'api-full': {
    name: 'API Full Tests',
    description: 'Comprehensive API tests including all edge cases and integrations',
    file: 'tests/api/api-test-comprehensive-updated.js',
    tests: [
      'All Standard API Tests',
      'Edge Cases for Forms API',
      'Edge Cases for Submission API',
      'Security & Injection Tests',
      'Performance & Stress Tests',
      'Data Validation Edge Cases',
      'GPT-5 Model Handling Tests',
      'AI Token Exhaustion Detection',
      'Google Sheets Integration Tests',
      'Google Auth Flow Tests',
      'Export/Import Response Tests',
      'Concurrency & Race Conditions',
      'Unicode & International Support',
    ],
    estimatedTime: '5-7 minutes',
    testCount: '70+',
  },

  'e2e-standard': {
    name: 'End-to-End Standard Tests (Playwright)',
    description: 'Essential user workflow tests with Playwright automation',
    file: 'npx playwright test tests/e2e/standard-suite.spec.ts',
    tests: [
      'Home Page & Navigation',
      'Authentication Flow',
      'Form Builder Interface',
      'Complete Form Creation & Submission',
      'Settings Management',
      'Form List & Management',
      'Error Handling & User Feedback',
    ],
    estimatedTime: '3-5 minutes',
    testCount: 8,
  },

  'e2e-full': {
    name: 'End-to-End Full Tests (Playwright)',
    description: 'Comprehensive E2E tests covering all scenarios and edge cases',
    file: 'npx playwright test tests/e2e/full-suite.spec.ts',
    tests: [
      'Advanced Form Builder Tests',
      'Complex Field Types & Validation',
      'Drag & Drop Field Reordering',
      'File Upload Functionality',
      'Performance & Load Testing',
      'Mobile Responsive Design',
      'Multi-browser Compatibility',
      'Accessibility Compliance',
      'Security Testing (XSS, SQL)',
      'Network Interruption Recovery',
      'Error Recovery Scenarios',
    ],
    estimatedTime: '5-10 minutes',
    testCount: '25+',
  },
}

class TestRunner {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
    }
  }

  // Display help menu
  showHelp() {
    console.log(`
${colors.bright}${colors.cyan}╔═══════════════════════════════════════════════════════════════╗
║                    FORM BUILDER TEST RUNNER                   ║
╚═══════════════════════════════════════════════════════════════╝${colors.reset}

${colors.bright}Usage:${colors.reset}
  npm run test:[category]

${colors.bright}Categories:${colors.reset}

  ${colors.green}1. API Standard${colors.reset} (api-standard)
     ${colors.cyan}Command:${colors.reset} npm run test:api:standard
     ${colors.yellow}Coverage:${colors.reset} Core API functionality
     ${colors.yellow}Duration:${colors.reset} ~1 minute
     ${colors.yellow}Tests:${colors.reset} 21 tests
     
  ${colors.green}2. API Full${colors.reset} (api-full)
     ${colors.cyan}Command:${colors.reset} npm run test:api:full
     ${colors.yellow}Coverage:${colors.reset} Comprehensive API + edge cases
     ${colors.yellow}Duration:${colors.reset} ~3-5 minutes
     ${colors.yellow}Tests:${colors.reset} 50+ tests
     
  ${colors.green}3. End-to-End Standard${colors.reset} (e2e-standard)
     ${colors.cyan}Command:${colors.reset} npm run test:e2e:standard
     ${colors.yellow}Coverage:${colors.reset} Basic user workflows
     ${colors.yellow}Duration:${colors.reset} ~2 minutes
     ${colors.yellow}Tests:${colors.reset} 4 tests
     
  ${colors.green}4. End-to-End Full${colors.reset} (e2e-full)
     ${colors.cyan}Command:${colors.reset} npm run test:e2e:full
     ${colors.yellow}Coverage:${colors.reset} Complete user scenarios
     ${colors.yellow}Duration:${colors.reset} ~5-10 minutes
     ${colors.yellow}Tests:${colors.reset} 25+ tests

${colors.bright}Quick Commands:${colors.reset}
  ${colors.cyan}npm run test:all:standard${colors.reset} - Run both standard test suites
  ${colors.cyan}npm run test:all:full${colors.reset}     - Run all comprehensive tests
  ${colors.cyan}npm run test:quick${colors.reset}        - Run only critical tests
  ${colors.cyan}npm run test:ci${colors.reset}           - Run CI/CD optimized tests
  ${colors.cyan}npm run test:cleanup${colors.reset}      - Clean up test data

${colors.bright}Options:${colors.reset}
  --verbose       Show detailed output
  --quiet         Minimal output  
  --report        Generate HTML report
  --parallel      Run tests in parallel (where applicable)
  --no-prompts    Skip interactive prompts (use env vars only)
  --fail-fast     Stop on first test failure

${colors.bright}External Integration Testing:${colors.reset}
  For complete API coverage, you can provide:
  ${colors.cyan}TEST_SLACK_WEBHOOK_URL${colors.reset}    - Your Slack webhook for notification tests
  ${colors.cyan}TEST_OPENAI_API_KEY${colors.reset}       - Your OpenAI API key for AI integration tests
  
  Without these, external integration tests will be skipped automatically.
`)
  }

  // Show test details for a category
  showCategoryDetails(category) {
    const config = testConfigs[category]
    if (!config) {
      console.error(`${colors.red}Unknown category: ${category}${colors.reset}`)
      return
    }

    console.log(`
${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}
${colors.bright}${config.name}${colors.reset}
${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}

${colors.yellow}Description:${colors.reset} ${config.description}
${colors.yellow}Test File:${colors.reset} ${config.file}
${colors.yellow}Estimated Time:${colors.reset} ${config.estimatedTime}
${colors.yellow}Test Count:${colors.reset} ${config.testCount}

${colors.bright}Test Coverage:${colors.reset}`)

    config.tests.forEach((test, index) => {
      console.log(`  ${index + 1}. ${test}`)
    })

    console.log('')
  }

  // Run tests for a specific category
  async runCategory(category, options = {}) {
    const config = testConfigs[category]
    if (!config) {
      console.error(`${colors.red}Unknown category: ${category}${colors.reset}`)
      return false
    }

    // Handle external integration prompts for comprehensive API tests
    if ((category === 'api-full' || category === 'api-standard') && !options.skipPrompts) {
      await this.handleExternalIntegrationPrompts(category, options)
    }

    console.log(`
${colors.bright}${colors.cyan}╔═══════════════════════════════════════════════════════════════╗${colors.reset}
${colors.bright}${colors.cyan}║  Running: ${config.name.padEnd(51)}║${colors.reset}
${colors.bright}${colors.cyan}╚═══════════════════════════════════════════════════════════════╝${colors.reset}
`)

    console.log(`${colors.yellow}⏱  Estimated time: ${config.estimatedTime}${colors.reset}`)
    console.log(`${colors.yellow}📊 Test count: ${config.testCount}${colors.reset}\n`)

    const startTime = Date.now()

    // Check if test file exists
    const testFile = path.join(process.cwd(), config.file)
    if (!fs.existsSync(testFile)) {
      if (config.create) {
        console.log(`${colors.yellow}Test file not found. Creating placeholder...${colors.reset}`)
        await this.createPlaceholderTest(category)
      } else {
        console.error(`${colors.red}Test file not found: ${config.file}${colors.reset}`)
        return false
      }
    }

    // Run the test
    return new Promise((resolve) => {
      const testProcess = spawn('node', [testFile], {
        stdio: options.verbose ? 'inherit' : 'pipe',
        env: { ...process.env, TEST_CATEGORY: category },
      })

      let output = ''
      let errorOutput = ''

      if (!options.verbose) {
        testProcess.stdout.on('data', (data) => {
          output += data.toString()
          // Show progress dots
          process.stdout.write('.')
        })

        testProcess.stderr.on('data', (data) => {
          errorOutput += data.toString()
        })
      }

      testProcess.on('close', (code) => {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2)
        console.log('\n')

        if (code === 0) {
          console.log(`${colors.green}✅ ${config.name} PASSED${colors.reset}`)
          console.log(`${colors.cyan}Duration: ${duration}s${colors.reset}\n`)

          // Parse results if available
          if (output.includes('Total Tests:')) {
            const lines = output.split('\n')
            lines.forEach((line) => {
              if (
                line.includes('Total Tests:') ||
                line.includes('Passed:') ||
                line.includes('Failed:') ||
                line.includes('Pass Rate:')
              ) {
                console.log(line)
              }
            })
          }

          this.results.passed++
        } else {
          console.log(`${colors.red}❌ ${config.name} FAILED${colors.reset}`)
          console.log(`${colors.cyan}Duration: ${duration}s${colors.reset}`)
          console.log(`${colors.red}Exit code: ${code}${colors.reset}\n`)

          if (errorOutput) {
            console.log(`${colors.red}Errors:${colors.reset}`)
            console.log(errorOutput.slice(0, 500))
          }

          this.results.failed++
        }

        // AUTOMATIC CLEANUP - Always try to cleanup after individual test
        this.runFinalCleanup({ quiet: true })
          .catch(() => {
            // Silent cleanup - don't fail if cleanup fails
          })
          .finally(() => {
            resolve(code === 0)
          })
      })
    })
  }

  // Create placeholder test file for E2E Full
  async createPlaceholderTest(category) {
    if (category === 'e2e-full') {
      const content = `// Placeholder for End-to-End Full Tests
// This will contain comprehensive E2E tests including:
// - Form Builder UI Tests
// - Multi-step Forms
// - File Uploads
// - Accessibility Tests
// - Performance Metrics

const FormSubmissionTester = require('./form-submission.test');

class ComprehensiveE2ETester extends FormSubmissionTester {
  async runAllTests() {
    console.log('🚧 E2E Full Tests - Coming Soon');
    console.log('Currently running standard E2E tests...');
    return super.runAllTests();
  }
}

if (require.main === module) {
  const tester = new ComprehensiveE2ETester();
  tester.runAllTests()
    .then(exitCode => process.exit(exitCode))
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = ComprehensiveE2ETester;
`

      const filePath = path.join(process.cwd(), 'tests/e2e-comprehensive.test.js')
      fs.writeFileSync(filePath, content)
      console.log(`${colors.green}Created placeholder test file: ${filePath}${colors.reset}`)
    }
  }

  // Handle external integration prompts for API tests
  async handleExternalIntegrationPrompts(category, options = {}) {
    // Skip prompts in CI/automated environments
    if (process.env.CI || process.env.AUTOMATED || options.skipPrompts) {
      return
    }

    const InteractivePrompts = require('./utils/interactive-prompts')
    const prompts = new InteractivePrompts()

    try {
      const credentials = await prompts.promptForExternalIntegrations()

      if (!credentials.skipExternal) {
        prompts.displayIntegrationSummary(credentials)
      }

      prompts.close()
    } catch (error) {
      console.error(`${colors.red}Prompt error: ${error.message}${colors.reset}`)
      console.log(`${colors.yellow}Continuing with standard tests only...${colors.reset}\n`)
    }
  }

  // Run multiple categories
  async runMultiple(categories, options = {}) {
    const startTime = Date.now()

    console.log(`
${colors.bright}${colors.magenta}═══════════════════════════════════════════════════════════════${colors.reset}
${colors.bright}Running ${categories.length} Test Suites${colors.reset}
${colors.magenta}═══════════════════════════════════════════════════════════════${colors.reset}
`)

    for (const category of categories) {
      const success = await this.runCategory(category, options)
      if (!success && options.failFast) {
        console.log(`${colors.red}Stopping due to test failure (fail-fast mode)${colors.reset}`)
        break
      }
    }

    // AUTOMATIC CLEANUP - Always runs after test completion
    try {
      console.log(
        `\n${colors.bright}${colors.cyan}🧹 AUTOMATIC CLEANUP: Ensuring all test data is removed...${colors.reset}`
      )
      await this.runFinalCleanup(options)
    } catch (cleanupError) {
      console.error(
        `${colors.yellow}⚠️  Final cleanup warning: ${cleanupError.message}${colors.reset}`
      )
      // Don't fail the entire test run for cleanup issues
    }

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2)

    // Summary
    console.log(`
${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}
${colors.bright}TEST SUMMARY${colors.reset}
${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}

${colors.green}Passed: ${this.results.passed}${colors.reset}
${colors.red}Failed: ${this.results.failed}${colors.reset}
${colors.yellow}Total Duration: ${totalDuration}s${colors.reset}
`)

    return this.results.failed === 0
  }

  // Run final cleanup after all tests complete
  async runFinalCleanup(_options = {}) {
    const TestDataCleanup = require('./utils/test-cleanup')
    const cleanup = new TestDataCleanup()

    // Run a quick, silent cleanup to ensure no test data is left behind
    console.log(`   🔍 Scanning for remaining test data...`)

    const allForms = await cleanup.getAllForms()
    const testForms = allForms.filter((form) => cleanup.isTestForm(form))

    if (testForms.length > 0) {
      console.log(`   🗑️  Found ${testForms.length} test forms to cleanup`)

      // Delete remaining test forms
      for (const form of testForms) {
        await cleanup.deleteTestForm(form.refKey)
      }
    }

    // Clean up any leftover files
    await cleanup.cleanupTestScreenshots()

    console.log(`   ✅ Final cleanup completed - system clean`)
  }

  // Run cleanup utility
  async runCleanup(options = {}) {
    const { UniversalCleanup } = require('./utils/universal-cleanup')
    const cleanup = new UniversalCleanup({ testType: 'mixed', verbose: true })

    console.log(
      `\n${colors.bright}${colors.cyan}╔═══════════════════════════════════════════════════════════════╗${colors.reset}`
    )
    console.log(
      `${colors.bright}${colors.cyan}║  Running: Test Data Cleanup                                  ║${colors.reset}`
    )
    console.log(
      `${colors.bright}${colors.cyan}╚═══════════════════════════════════════════════════════════════╝${colors.reset}\n`
    )

    if (options.interactive) {
      await cleanup.interactiveCleanup()
    } else {
      await cleanup.performUniversalCleanup()
    }
  }

  // Main execution
  async run(args) {
    const command = args[0]
    const options = {
      verbose: args.includes('--verbose'),
      quiet: args.includes('--quiet'),
      report: args.includes('--report'),
      parallel: args.includes('--parallel'),
      failFast: args.includes('--fail-fast'),
      interactive: args.includes('--interactive') || args.includes('-i'),
      skipPrompts: args.includes('--no-prompts'),
    }

    switch (command) {
      case 'help':
      case '--help':
      case '-h':
        this.showHelp()
        break

      case 'cleanup':
        await this.runCleanup(options)
        break

      case 'api-standard':
        await this.runCategory('api-standard', options)
        break

      case 'api-full':
        await this.runCategory('api-full', options)
        break

      case 'e2e-standard':
        await this.runCategory('e2e-standard', options)
        break

      case 'e2e-full':
        await this.runCategory('e2e-full', options)
        break

      case 'all-standard':
        await this.runMultiple(['api-standard', 'e2e-standard'], options)
        break

      case 'all-full':
        await this.runMultiple(['api-full', 'e2e-full'], options)
        break

      case 'all':
        await this.runMultiple(['api-standard', 'api-full', 'e2e-standard', 'e2e-full'], options)
        break

      case 'quick':
        // Run only the most critical tests
        console.log(`${colors.cyan}Running quick smoke tests...${colors.reset}`)
        await this.runMultiple(['api-standard'], { ...options, verbose: false })
        break

      case 'ci':
        // Optimized for CI/CD pipelines
        console.log(`${colors.cyan}Running CI/CD test suite...${colors.reset}`)
        await this.runMultiple(['api-standard', 'e2e-standard'], { ...options, failFast: true })
        break

      case 'details':
        const category = args[1]
        if (category) {
          this.showCategoryDetails(category)
        } else {
          Object.keys(testConfigs).forEach((cat) => {
            this.showCategoryDetails(cat)
          })
        }
        break

      default:
        this.showHelp()
    }

    // Exit with appropriate code
    process.exit(this.results.failed > 0 ? 1 : 0)
  }
}

// Execute if run directly
if (require.main === module) {
  const runner = new TestRunner()
  const args = process.argv.slice(2)
  runner.run(args)
}

module.exports = TestRunner
