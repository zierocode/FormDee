/**
 * API Test Configuration
 * Complete test configuration for App <-> GAS integration
 */

// Load environment variables
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })

module.exports = {
  // Base configuration
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
  gasUrl: process.env.GAS_BASE_URL,
  adminApiKey: process.env.ADMIN_API_KEY,
  adminUiKey: process.env.ADMIN_UI_KEY || 'pir2',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  r2Config: {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucketName: process.env.R2_BUCKET_NAME,
    publicUrl: process.env.NEXT_PUBLIC_R2_PUBLIC_URL,
  },

  // Test timeouts
  timeouts: {
    api: 10000, // 10 seconds for API calls
    gas: 15000, // 15 seconds for GAS operations
    retry: 3, // Number of retries for failed requests
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
          helpText: 'This is a test field',
        },
        {
          key: 'test_field_2',
          label: 'Test Field 2',
          type: 'email',
          required: false,
          placeholder: 'test@example.com',
        },
        {
          key: 'test_field_3',
          label: 'Test Field 3',
          type: 'textarea',
          required: false,
          rows: 5,
        },
      ],
    },

    // Test submission data
    testSubmission: {
      test_field_1: 'Test Value 1',
      test_field_2: 'test@example.com',
      test_field_3: 'This is a test submission from API tests',
    },

    // Authentication test data
    authData: {
      validCredentials: {
        adminKey: process.env.ADMIN_UI_KEY || 'pir2',
      },
      invalidCredentials: {
        adminKey: 'invalid-key-12345',
      },
    },

    // Settings test data
    settingsData: {
      valid: {
        aiModel: 'gpt-4o-mini',
        apiKey: 'sk-test-dummy-key-for-testing-only', // Safer dummy key format
      },
      invalid: {
        aiModel: 'invalid-model',
        apiKey: '', // Empty key should fail
      },
    },

    // External integration test data (requires user-provided credentials)
    externalIntegrations: {
      slack: {
        webhookUrl: process.env.TEST_SLACK_WEBHOOK_URL || null, // User must provide for testing
        testMessage: {
          refKey: 'test-form-integration',
          description: 'Testing Slack webhook integration',
        },
      },
      openai: {
        apiKey: process.env.TEST_OPENAI_API_KEY || null, // User must provide for testing
        testModel: 'gpt-4o-mini',
        testPrompt: 'Respond with "OK" if you can read this message.',
      },
    },

    // AI generation test data
    aiPrompts: {
      simple: 'Create a contact form with name, email, and message fields',
      complex:
        'Create a comprehensive job application form with personal details, work experience, education, skills, and file upload for resume',
      invalid: '', // Empty prompt
      malicious: '<script>alert("xss")</script>',
    },

    // File upload test data
    uploadTestFiles: {
      validImage: {
        name: 'test-image.png',
        type: 'image/png',
        size: 1024 * 1024, // 1MB
        content: Buffer.from('fake-png-content'),
      },
      validDocument: {
        name: 'test-document.pdf',
        type: 'application/pdf',
        size: 2 * 1024 * 1024, // 2MB
        content: Buffer.from('fake-pdf-content'),
      },
      oversized: {
        name: 'large-file.jpg',
        type: 'image/jpeg',
        size: 50 * 1024 * 1024, // 50MB - should exceed limits
      },
      invalidType: {
        name: 'malicious.exe',
        type: 'application/x-executable',
        size: 1024,
      },
    },

    // Test Google Sheets for metadata operations
    testSheets: [
      {
        id: '1nw64BTzTPMAsC4al3K0AvxWHwcpcxp9gj-jLsQIv_Kw',
        name: 'Test Sheet 1',
        description: 'Primary test sheet',
      },
      {
        id: '1N4Qi7ouqMGQuZEe5j65uhzfd_T7NYlo5fGuGaxXyFz0',
        name: 'Test Sheet 2',
        description: 'Secondary test sheet',
      },
    ],

    // Invalid test data for error testing
    invalidData: {
      form: {
        refKey: '', // Invalid: empty refKey
        title: 'Invalid Form',
      },
      submission: {
        // Missing refKey
        values: { test: 'value' },
      },
      sheetId: 'invalid-sheet-id-12345',
    },
  },

  // Expected responses for validation
  expectedResponses: {
    formStructure: ['refKey', 'title', 'description', 'responseSheetUrl', 'fields'],
    submissionSuccess: { ok: true, data: { message: 'Form submitted successfully' } },
    sheetMetaStructure: ['spreadsheetId', 'url', 'sheets'],
    errorStructure: ['ok', 'error'],
  },

  // Test categories to run
  testSuites: {
    health: {
      enabled: true,
      tests: ['basic-health', 'detailed-health', 'supabase-health', 'metrics-collection'],
    },
    auth: {
      enabled: true,
      tests: [
        'login',
        'logout',
        'check-status',
        'cookie-persistence',
        'invalid-credentials',
        'session-expiry',
      ],
    },
    forms: {
      enabled: true,
      tests: [
        'create',
        'read',
        'update',
        'delete',
        'list',
        'duplicate',
        'validation',
        'supabase-integration',
      ],
    },
    submissions: {
      enabled: true,
      tests: [
        'submit',
        'submit-supabase',
        'validation',
        'largePayload',
        'specialCharacters',
        'concurrent',
        'file-uploads',
      ],
    },
    responses: {
      enabled: true,
      tests: ['fetch-responses', 'pagination', 'filtering', 'date-range', 'auth-required'],
    },
    settings: {
      enabled: true,
      tests: [
        'get-settings',
        'update-settings',
        'test-ai-connection',
        'validation',
        'auth-required',
      ],
    },
    ai: {
      enabled: true,
      tests: ['generate-form', 'validate-prompts', 'error-handling', 'auth-required'],
    },
    upload: {
      enabled: true,
      tests: [
        'upload-file',
        'file-validation',
        'size-limits',
        'type-restrictions',
        'r2-integration',
      ],
    },
    sheets: {
      enabled: true,
      tests: ['metadata', 'refresh', 'cache', 'invalidId', 'permissions'],
    },
    gas: {
      enabled: true,
      tests: ['connectivity', 'authentication', 'rateLimit', 'timeout', 'errorHandling'],
    },
  },

  // Logging configuration
  logging: {
    verbose: true,
    logFile: './tests/api/logs/test-run.log',
    saveResponses: true,
    responsesDir: './tests/api/responses',
  },

  // Report configuration
  reporting: {
    format: ['console', 'json', 'html'],
    outputDir: './tests/api/reports',
    includeTimings: true,
    includeHeaders: false,
    includePayloads: true,
  },
}
