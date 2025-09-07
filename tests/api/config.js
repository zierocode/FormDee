/**
 * API Test Configuration
 * Complete test configuration for App <-> GAS integration
 */

module.exports = {
  // Base configuration
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
  gasUrl: process.env.GAS_BASE_URL,
  adminKey: process.env.ADMIN_UI_KEY || 'pir2',
  
  // Test timeouts
  timeouts: {
    api: 10000,      // 10 seconds for API calls
    gas: 15000,      // 15 seconds for GAS operations
    retry: 3         // Number of retries for failed requests
  },
  
  // Test data
  testData: {
    // Test form for CRUD operations
    testForm: {
      refKey: `test-api-${Date.now()}`,
      title: 'API Test Form',
      description: 'Automated test form for API testing',
      responseSheetUrl: '1nw64BTzTPMAsC4al3K0AvxWHwcpcxp9gj-jLsQIv_Kw#sheet=Sheet1',
      slackWebhookUrl: '',
      fields: [
        {
          key: 'test_field_1',
          label: 'Test Field 1',
          type: 'text',
          required: true,
          placeholder: 'Enter test value',
          helpText: 'This is a test field'
        },
        {
          key: 'test_field_2',
          label: 'Test Field 2',
          type: 'email',
          required: false,
          placeholder: 'test@example.com'
        },
        {
          key: 'test_field_3',
          label: 'Test Field 3',
          type: 'textarea',
          required: false,
          rows: 5
        }
      ]
    },
    
    // Test submission data
    testSubmission: {
      test_field_1: 'Test Value 1',
      test_field_2: 'test@example.com',
      test_field_3: 'This is a test submission from API tests'
    },
    
    // Test Google Sheets for metadata operations
    testSheets: [
      {
        id: '1nw64BTzTPMAsC4al3K0AvxWHwcpcxp9gj-jLsQIv_Kw',
        name: 'Test Sheet 1',
        description: 'Primary test sheet'
      },
      {
        id: '1N4Qi7ouqMGQuZEe5j65uhzfd_T7NYlo5fGuGaxXyFz0',
        name: 'Test Sheet 2',
        description: 'Secondary test sheet'
      }
    ],
    
    // Invalid test data for error testing
    invalidData: {
      form: {
        refKey: '', // Invalid: empty refKey
        title: 'Invalid Form'
      },
      submission: {
        // Missing refKey
        values: { test: 'value' }
      },
      sheetId: 'invalid-sheet-id-12345'
    }
  },
  
  // Expected responses for validation
  expectedResponses: {
    formStructure: ['refKey', 'title', 'description', 'responseSheetUrl', 'fields'],
    submissionSuccess: { ok: true, data: { message: 'Form submitted successfully' } },
    sheetMetaStructure: ['spreadsheetId', 'url', 'sheets'],
    errorStructure: ['ok', 'error']
  },
  
  // Test categories to run
  testSuites: {
    forms: {
      enabled: true,
      tests: [
        'create',
        'read',
        'update',
        'delete',
        'list',
        'duplicate',
        'validation'
      ]
    },
    submissions: {
      enabled: true,
      tests: [
        'submit',
        'validation',
        'largePayload',
        'specialCharacters',
        'concurrent'
      ]
    },
    sheets: {
      enabled: true,
      tests: [
        'metadata',
        'refresh',
        'cache',
        'invalidId',
        'permissions'
      ]
    },
    gas: {
      enabled: true,
      tests: [
        'connectivity',
        'authentication',
        'rateLimit',
        'timeout',
        'errorHandling'
      ]
    }
  },
  
  // Logging configuration
  logging: {
    verbose: true,
    logFile: './tests/api/logs/test-run.log',
    saveResponses: true,
    responsesDir: './tests/api/responses'
  },
  
  // Report configuration
  reporting: {
    format: ['console', 'json', 'html'],
    outputDir: './tests/api/reports',
    includeTimings: true,
    includeHeaders: false,
    includePayloads: true
  }
};