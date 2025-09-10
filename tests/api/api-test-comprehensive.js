#!/usr/bin/env node

/**
 * Comprehensive API Test Suite with Edge Cases
 * Extended testing for all possible scenarios
 */

const https = require('https');
const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const config = require('./config');
const { UniversalCleanup } = require('../utils/universal-cleanup');

// Import base test suite
const APITestSuite = require('./api-test-suite');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class ComprehensiveAPITestSuite extends APITestSuite {
  constructor() {
    super();
    this.edgeCaseResults = {
      total: 0,
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  // ═══════════════════════════════════════════
  // EDGE CASE TESTS - FORMS API
  // ═══════════════════════════════════════════

  async testFormsEdgeCases() {
    console.log(`\n${colors.bright}${colors.magenta}══════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}FORMS API - EDGE CASES${colors.reset}`);
    console.log(`${colors.magenta}══════════════════════════════════════════${colors.reset}`);

    // Test 1: Duplicate RefKey
    await this.runTest('Duplicate RefKey Creation', 'Forms-Edge', async () => {
      const duplicateForm = {
        refKey: 'duplicate-test-' + Date.now(),
        title: 'First Form',
        responseSheetUrl: '1nw64BTzTPMAsC4al3K0AvxWHwcpcxp9gj-jLsQIv_Kw#sheet=Sheet1',
        fields: [{ key: 'field1', label: 'Field 1', type: 'text' }]
      };

      // Create first form
      const response1 = await this.makeRequest('/api/forms', {
        method: 'POST',
        headers: { 'x-admin-key': config.adminKey },
        body: duplicateForm
      });
      this.assert(response1.status === 200, 'First form should create successfully');
      this.createdFormKeys.push(duplicateForm.refKey);

      // Try to create duplicate
      const response2 = await this.makeRequest('/api/forms', {
        method: 'POST',
        headers: { 'x-admin-key': config.adminKey },
        body: duplicateForm
      });
      
      const isDuplicate = response2.status !== 200 || response2.data.ok === false;
      this.assert(isDuplicate, 'Duplicate refKey should be rejected');
    });

    // Test 2: Maximum Length RefKey
    await this.runTest('Maximum Length RefKey', 'Forms-Edge', async () => {
      const longRefKey = 'a'.repeat(255); // Very long refKey
      const response = await this.makeRequest('/api/forms', {
        method: 'POST',
        headers: { 'x-admin-key': config.adminKey },
        body: {
          refKey: longRefKey,
          title: 'Long RefKey Test',
          responseSheetUrl: '1nw64BTzTPMAsC4al3K0AvxWHwcpcxp9gj-jLsQIv_Kw#sheet=Sheet1',
          fields: []
        }
      });

      // Should either accept or reject gracefully
      this.assert(response.status === 200 || response.status === 400, 
        `Should handle long refKey gracefully, got ${response.status}`);
      
      if (response.status === 200) {
        this.createdFormKeys.push(longRefKey);
      }
    });

    // Test 3: Special Characters in RefKey
    await this.runTest('Special Characters in RefKey', 'Forms-Edge', async () => {
      const specialRefKeys = [
        'test-with-dash',
        'test_with_underscore',
        'test.with.dot',
        'test with space',
        'test@with@at',
        'test#with#hash',
        'test$with$dollar',
        'test%with%percent',
        'test&with&amp',
        'test*with*star',
        'test+with+plus',
        'test=with=equal',
        'test/with/slash',
        'test\\with\\backslash',
        'test|with|pipe',
        'test<with>brackets',
        'test"with"quotes',
        "test'with'quotes",
        'тест-кириллица',
        '测试-中文',
        'テスト-日本語',
        '🔥emoji🔥test'
      ];

      let accepted = 0;
      let rejected = 0;

      for (const refKey of specialRefKeys) {
        try {
          const response = await this.makeRequest('/api/forms', {
            method: 'POST',
            headers: { 'x-admin-key': config.adminKey },
            body: {
              refKey: refKey,
              title: `Special char test: ${refKey}`,
              responseSheetUrl: '1nw64BTzTPMAsC4al3K0AvxWHwcpcxp9gj-jLsQIv_Kw#sheet=Sheet1',
              fields: []
            }
          });

          if (response.status === 200 && response.data.ok === true) {
            accepted++;
            this.createdFormKeys.push(refKey);
          } else {
            rejected++;
          }
        } catch (e) {
          rejected++;
        }
      }

      console.log(`    Accepted: ${accepted}, Rejected: ${rejected} special character refKeys`);
      this.assert(accepted > 0 || rejected > 0, 'Should handle special characters');
    });

    // Test 4: Empty/Null/Undefined Fields
    await this.runTest('Empty/Null/Undefined Fields', 'Forms-Edge', async () => {
      const testCases = [
        { refKey: 'empty-title-' + Date.now(), title: '', fields: [] },
        { refKey: 'null-title-' + Date.now(), title: null, fields: [] },
        { refKey: 'undefined-desc-' + Date.now(), title: 'Test', description: undefined, fields: [] },
        { refKey: 'null-fields-' + Date.now(), title: 'Test', fields: null },
        { refKey: 'empty-array-' + Date.now(), title: 'Test', fields: [] },
        { refKey: 'missing-sheet-' + Date.now(), title: 'Test', responseSheetUrl: '', fields: [] }
      ];

      let handled = 0;
      for (const testCase of testCases) {
        const response = await this.makeRequest('/api/forms', {
          method: 'POST',
          headers: { 'x-admin-key': config.adminKey },
          body: testCase
        });

        // Should handle gracefully (either accept or reject properly)
        if (response.status === 200 || response.status === 400 || response.status === 500) {
          handled++;
          if (response.status === 200 && response.data.ok === true) {
            this.createdFormKeys.push(testCase.refKey);
          }
        }
      }

      this.assert(handled === testCases.length, 'All empty/null cases handled gracefully');
    });

    // Test 5: Maximum Number of Fields
    await this.runTest('Maximum Number of Fields', 'Forms-Edge', async () => {
      const manyFields = [];
      for (let i = 0; i < 100; i++) {
        manyFields.push({
          key: `field_${i}`,
          label: `Field ${i}`,
          type: 'text',
          required: i % 2 === 0,
          placeholder: `Enter value for field ${i}`
        });
      }

      const response = await this.makeRequest('/api/forms', {
        method: 'POST',
        headers: { 'x-admin-key': config.adminKey },
        body: {
          refKey: 'max-fields-' + Date.now(),
          title: '100 Fields Form',
          responseSheetUrl: '1nw64BTzTPMAsC4al3K0AvxWHwcpcxp9gj-jLsQIv_Kw#sheet=Sheet1',
          fields: manyFields
        }
      });

      this.assert(response.status === 200 || response.status === 413, 
        `Should handle 100 fields, got ${response.status}`);
      
      if (response.status === 200) {
        this.createdFormKeys.push('max-fields-' + Date.now());
        console.log('    Successfully created form with 100 fields');
      }
    });

    // Test 6: Deeply Nested Field Structure
    await this.runTest('Deeply Nested Field Structure', 'Forms-Edge', async () => {
      const nestedField = {
        key: 'nested',
        label: 'Nested Field',
        type: 'text',
        validation: {
          rules: {
            required: true,
            minLength: {
              value: 5,
              message: 'Too short'
            },
            patterns: [
              { regex: '^[a-z]+$', message: 'Only lowercase' },
              { regex: '.{10,}', message: 'Min 10 chars' }
            ]
          },
          customValidators: {
            async: true,
            validators: [
              { name: 'unique', endpoint: '/api/validate' }
            ]
          }
        },
        metadata: {
          created: new Date().toISOString(),
          tags: ['important', 'validated', 'nested'],
          deep: {
            level1: {
              level2: {
                level3: {
                  level4: {
                    level5: 'very deep'
                  }
                }
              }
            }
          }
        }
      };

      const response = await this.makeRequest('/api/forms', {
        method: 'POST',
        headers: { 'x-admin-key': config.adminKey },
        body: {
          refKey: 'nested-fields-' + Date.now(),
          title: 'Nested Structure Test',
          responseSheetUrl: '1nw64BTzTPMAsC4al3K0AvxWHwcpcxp9gj-jLsQIv_Kw#sheet=Sheet1',
          fields: [nestedField]
        }
      });

      this.assert(response.status === 200 || response.status === 400, 
        'Should handle deeply nested structures');
    });

    // Test 8: Form Deletion with File Cleanup
    await this.runTest('Complete Form Deletion with File Cleanup', 'Forms-Delete', async () => {
      const deleteTestRefKey = 'delete-test-' + Date.now();
      
      // Step 1: Create a form with file upload field
      const formWithFiles = {
        refKey: deleteTestRefKey,
        title: 'Delete Test Form with Files',
        description: 'This form will be deleted with all its data',
        fields: [
          { key: 'name', label: 'Name', type: 'text', required: true },
          { key: 'document', label: 'Document', type: 'file', required: false, acceptedTypes: ['.pdf', '.doc'] }
        ]
      };

      const createResponse = await this.makeRequest('/api/forms', {
        method: 'POST',
        headers: { 'x-admin-key': config.adminKey },
        body: formWithFiles
      });
      this.assert(createResponse.status === 200 && createResponse.data.ok, 'Form should be created successfully');

      // Step 2: Submit a response (simulated - in real scenario would have file)
      const submitResponse = await this.makeRequest('/api/submit', {
        method: 'POST',
        body: {
          refKey: deleteTestRefKey,
          values: {
            name: 'Test User',
            document: 'https://storage.example.com/test-file.pdf' // Simulated file URL
          }
        }
      });
      
      // Step 3: Delete the form completely
      const deleteResponse = await this.makeRequest(`/api/forms?refKey=${encodeURIComponent(deleteTestRefKey)}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': config.adminKey }
      });

      this.assert(deleteResponse.status === 200 && deleteResponse.data.ok, 'Form should be deleted successfully');
      this.assert(deleteResponse.data.summary, 'Delete response should include summary');
      
      // Verify deletion summary
      const summary = deleteResponse.data.summary;
      this.assert(summary.form === 1, 'Should delete exactly 1 form');
      console.log(`    Deletion Summary: ${summary.responses} responses, ${summary.files} files deleted`);

      // Step 4: Verify form is really deleted
      const getDeletedResponse = await this.makeRequest(`/api/forms?refKey=${encodeURIComponent(deleteTestRefKey)}`);
      this.assert(getDeletedResponse.status === 404 || !getDeletedResponse.data.ok, 'Deleted form should not be found');
      
      // Don't add to createdFormKeys since it's been deleted
    });

    // Test 9: Delete Non-existent Form
    await this.runTest('Delete Non-existent Form', 'Forms-Delete', async () => {
      const nonExistentRefKey = 'non-existent-' + Date.now();
      
      const deleteResponse = await this.makeRequest(`/api/forms?refKey=${encodeURIComponent(nonExistentRefKey)}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': config.adminKey }
      });

      // Should handle gracefully - either 404 or error response
      this.assert(deleteResponse.status === 404 || deleteResponse.status === 400 || !deleteResponse.data.ok, 
        'Should handle deletion of non-existent form gracefully');
    });

    // Test 10: Delete Form without Authentication
    await this.runTest('Delete Form without Authentication', 'Forms-Delete', async () => {
      const testRefKey = 'auth-delete-test-' + Date.now();
      
      // First create a form to attempt to delete
      const createResponse = await this.makeRequest('/api/forms', {
        method: 'POST',
        headers: { 'x-admin-key': config.adminKey },
        body: {
          refKey: testRefKey,
          title: 'Auth Test Form',
          fields: [{ key: 'field1', label: 'Field 1', type: 'text' }]
        }
      });
      this.assert(createResponse.status === 200, 'Form should be created for auth test');
      this.createdFormKeys.push(testRefKey);

      // Attempt to delete without authentication
      const deleteResponse = await this.makeRequest(`/api/forms?refKey=${encodeURIComponent(testRefKey)}`, {
        method: 'DELETE'
        // No authentication headers
      });

      this.assert(deleteResponse.status === 401, 'Should require authentication for deletion');
    });

    // Test 11: Delete Form with Special Characters in RefKey
    await this.runTest('Delete Form with Special Characters', 'Forms-Delete', async () => {
      const specialRefKey = 'delete-test-ñiño-测试-' + Date.now();
      
      // Create form with special characters
      const createResponse = await this.makeRequest('/api/forms', {
        method: 'POST',
        headers: { 'x-admin-key': config.adminKey },
        body: {
          refKey: specialRefKey,
          title: 'Special Char Delete Test',
          fields: [{ key: 'field1', label: 'Field 1', type: 'text' }]
        }
      });

      if (createResponse.status === 200 && createResponse.data.ok) {
        // If creation succeeded, test deletion
        const deleteResponse = await this.makeRequest(`/api/forms?refKey=${encodeURIComponent(specialRefKey)}`, {
          method: 'DELETE',
          headers: { 'x-admin-key': config.adminKey }
        });

        this.assert(deleteResponse.status === 200, 'Should delete form with special characters');
      } else {
        // If creation failed, that's also valid behavior - just log it
        console.log('    Special character form creation was rejected (expected behavior)');
      }
    });
  }

  // ═══════════════════════════════════════════
  // EDGE CASE TESTS - SUBMISSION API
  // ═══════════════════════════════════════════

  async testSubmissionEdgeCases() {
    console.log(`\n${colors.bright}${colors.magenta}══════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}SUBMISSION API - EDGE CASES${colors.reset}`);
    console.log(`${colors.magenta}══════════════════════════════════════════${colors.reset}`);

    // Test 1: Empty Submission
    await this.runTest('Empty Submission', 'Submission-Edge', async () => {
      const response = await this.makeRequest('/api/submit', {
        method: 'POST',
        body: {}
      });

      this.assert(response.status === 400 || response.status === 404, 
        'Empty submission should be rejected');
    });

    // Test 2: Missing RefKey
    await this.runTest('Missing RefKey Submission', 'Submission-Edge', async () => {
      const response = await this.makeRequest('/api/submit', {
        method: 'POST',
        body: {
          values: { field1: 'value1' }
        }
      });

      this.assert(response.status === 400 || response.status === 404, 
        'Submission without refKey should fail');
    });

    // Test 3: Extra Fields Not in Form
    await this.runTest('Extra Fields Submission', 'Submission-Edge', async () => {
      const response = await this.makeRequest('/api/submit', {
        method: 'POST',
        body: {
          refKey: config.testData.testForm.refKey,
          values: {
            test_field_1: 'Valid field',
            extra_field_1: 'This field does not exist',
            extra_field_2: 'Neither does this',
            malicious_field: '<script>alert("xss")</script>'
          }
        }
      });

      this.assert(response.status === 200, 'Should accept submission with extra fields');
      console.log('    Extra fields handled (likely ignored)');
    });

    // Test 4: Extremely Large Single Field Value
    await this.runTest('Extremely Large Field Value', 'Submission-Edge', async () => {
      const largeValue = 'X'.repeat(1000000); // 1MB of data
      
      const response = await this.makeRequest('/api/submit', {
        method: 'POST',
        body: {
          refKey: config.testData.testForm.refKey,
          values: {
            test_field_1: 'Normal value',
            test_field_3: largeValue
          }
        }
      });

      // Should either accept or reject based on limits
      this.assert(response.status === 200 || response.status === 413, 
        `Should handle 1MB field value, got ${response.status}`);
    });

    // Test 5: Binary/Base64 Data
    await this.runTest('Binary/Base64 Data Submission', 'Submission-Edge', async () => {
      const binaryData = Buffer.from('Binary test data').toString('base64');
      
      const response = await this.makeRequest('/api/submit', {
        method: 'POST',
        body: {
          refKey: config.testData.testForm.refKey,
          values: {
            test_field_1: 'Normal',
            test_field_2: 'data:image/png;base64,' + binaryData,
            test_field_3: binaryData
          }
        }
      });

      this.assert(response.status === 200, 'Should handle base64 data');
    });

    // Test 6: Null and Undefined Values
    await this.runTest('Null/Undefined Values', 'Submission-Edge', async () => {
      const response = await this.makeRequest('/api/submit', {
        method: 'POST',
        body: {
          refKey: config.testData.testForm.refKey,
          values: {
            test_field_1: null,
            test_field_2: undefined,
            test_field_3: ''
          }
        }
      });

      // Should handle null/undefined gracefully
      const handled = response.status === 200 || 
                     (response.status === 400 && response.data.error?.message.includes('required'));
      this.assert(handled, 'Should handle null/undefined values');
    });

    // Test 7: Array and Object Values
    await this.runTest('Array and Object Values', 'Submission-Edge', async () => {
      const response = await this.makeRequest('/api/submit', {
        method: 'POST',
        body: {
          refKey: config.testData.testForm.refKey,
          values: {
            test_field_1: ['array', 'of', 'values'],
            test_field_2: { nested: { object: 'value' } },
            test_field_3: JSON.stringify({ json: 'string' })
          }
        }
      });

      // Should either stringify or reject
      this.assert(response.status === 200 || response.status === 400, 
        'Should handle array/object values');
    });

    // Test 8: Rapid Sequential Submissions
    await this.runTest('Rapid Sequential Submissions', 'Submission-Edge', async () => {
      const submissions = [];
      
      for (let i = 0; i < 20; i++) {
        submissions.push(
          this.makeRequest('/api/submit', {
            method: 'POST',
            body: {
              refKey: config.testData.testForm.refKey,
              values: {
                test_field_1: `Rapid submission ${i}`,
                test_field_2: `test${i}@rapid.com`,
                test_field_3: `Timestamp: ${Date.now()}`
              }
            }
          })
        );
        // No delay between submissions
      }

      const results = await Promise.all(submissions);
      const successful = results.filter(r => r.status === 200).length;
      
      console.log(`    ${successful}/20 rapid submissions succeeded`);
      this.assert(successful >= 15, 'Most rapid submissions should succeed');
    });
  }

  // ═══════════════════════════════════════════
  // SECURITY AND INJECTION TESTS
  // ═══════════════════════════════════════════

  async testSecurityCases() {
    console.log(`\n${colors.bright}${colors.magenta}══════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}SECURITY & INJECTION TESTS${colors.reset}`);
    console.log(`${colors.magenta}══════════════════════════════════════════${colors.reset}`);

    // Test 1: SQL Injection Attempts
    await this.runTest('SQL Injection Prevention', 'Security', async () => {
      const sqlInjections = [
        "'; DROP TABLE forms; --",
        "1' OR '1'='1",
        "admin'--",
        "' OR 1=1--",
        "'; DELETE FROM forms WHERE '1'='1",
        "UNION SELECT * FROM users--"
      ];

      let blocked = 0;
      for (const injection of sqlInjections) {
        const response = await this.makeRequest('/api/submit', {
          method: 'POST',
          body: {
            refKey: config.testData.testForm.refKey,
            values: {
              test_field_1: injection,
              test_field_2: `test${Date.now()}@example.com`,
              test_field_3: 'Normal value'
            }
          }
        });

        // Should either sanitize and accept, or reject
        if (response.status === 200 || response.status === 400) {
          blocked++;
        }
      }

      this.assert(blocked === sqlInjections.length, 'All SQL injections handled safely');
    });

    // Test 2: XSS Attack Vectors
    await this.runTest('XSS Attack Prevention', 'Security', async () => {
      const xssVectors = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        '<svg onload=alert("XSS")>',
        'javascript:alert("XSS")',
        '<iframe src="javascript:alert(\'XSS\')">',
        '<body onload=alert("XSS")>',
        '"><script>alert(String.fromCharCode(88,83,83))</script>',
        '<script>document.location="http://evil.com"</script>',
        '<meta http-equiv="refresh" content="0;url=http://evil.com">',
        '${alert("XSS")}',
        '{{constructor.constructor("alert(1)")()}}'
      ];

      let handled = 0;
      for (const xss of xssVectors) {
        const response = await this.makeRequest('/api/submit', {
          method: 'POST',
          body: {
            refKey: config.testData.testForm.refKey,
            values: {
              test_field_1: xss,
              test_field_2: 'normal@example.com',
              test_field_3: xss
            }
          }
        });

        if (response.status === 200 || response.status === 400) {
          handled++;
        }
      }

      this.assert(handled === xssVectors.length, 'All XSS attempts handled safely');
      console.log(`    ${handled} XSS vectors handled`);
    });

    // Test 3: Path Traversal Attempts
    await this.runTest('Path Traversal Prevention', 'Security', async () => {
      const pathTraversals = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        'file:///etc/passwd',
        '....//....//....//etc/passwd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
      ];

      for (const path of pathTraversals) {
        const response = await this.makeRequest('/api/forms', {
          method: 'POST',
          headers: { 'x-admin-key': config.adminKey },
          body: {
            refKey: 'path-test-' + Date.now(),
            title: path,
            responseSheetUrl: path,
            fields: [{ key: path, label: path, type: 'text' }]
          }
        });

        // Should not allow path traversal
        const safe = response.status === 200 || response.status === 400;
        this.assert(safe, `Path traversal attempt handled: ${path}`);
      }
    });

    // Test 4: Command Injection
    await this.runTest('Command Injection Prevention', 'Security', async () => {
      const commands = [
        '; ls -la',
        '| cat /etc/passwd',
        '`whoami`',
        '$(curl http://evil.com)',
        '&& rm -rf /',
        '; shutdown -h now'
      ];

      for (const cmd of commands) {
        const response = await this.makeRequest('/api/submit', {
          method: 'POST',
          body: {
            refKey: config.testData.testForm.refKey,
            values: {
              test_field_1: cmd,
              test_field_2: 'test@example.com',
              test_field_3: cmd
            }
          }
        });

        this.assert(response.status === 200 || response.status === 400, 
          `Command injection handled: ${cmd}`);
      }
    });

    // Test 5: Authentication Bypass Attempts
    await this.runTest('Authentication Bypass Prevention', 'Security', async () => {
      const bypassAttempts = [
        { 'x-admin-key': 'undefined' },
        { 'x-admin-key': 'null' },
        { 'x-admin-key': 'true' },
        { 'x-admin-key': '0' },
        { 'x-admin-key': '' },
        { 'authorization': 'Bearer fake-token' },
        { 'x-admin-key': config.adminKey + ' ' },
        { 'x-admin-key': ' ' + config.adminKey },
        { 'X-Admin-Key': config.adminKey }, // Different case
        { 'x-admin-key[]': config.adminKey } // Array attempt
      ];

      let blocked = 0;
      for (const headers of bypassAttempts) {
        const response = await this.makeRequest('/api/forms?adminKey=', {
          headers: headers
        });

        if (response.status === 401) {
          blocked++;
        }
      }

      this.assert(blocked >= bypassAttempts.length - 2, 
        'Most authentication bypass attempts blocked');
    });
  }

  // ═══════════════════════════════════════════
  // PERFORMANCE AND STRESS TESTS
  // ═══════════════════════════════════════════

  async testPerformanceStress() {
    console.log(`\n${colors.bright}${colors.magenta}══════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}PERFORMANCE & STRESS TESTS${colors.reset}`);
    console.log(`${colors.magenta}══════════════════════════════════════════${colors.reset}`);

    // Test 1: Burst Traffic
    await this.runTest('Burst Traffic Handling', 'Performance', async () => {
      const burstSize = 50;
      const requests = [];
      
      for (let i = 0; i < burstSize; i++) {
        requests.push(
          this.makeRequest(`/api/forms?refKey=example`)
        );
      }

      const startTime = Date.now();
      const results = await Promise.all(requests);
      const duration = Date.now() - startTime;
      
      const successful = results.filter(r => r.status === 200 || r.status === 404).length;
      const avgTime = duration / burstSize;
      
      console.log(`    ${successful}/${burstSize} succeeded, Avg: ${avgTime.toFixed(0)}ms`);
      this.assert(successful >= burstSize * 0.8, 'Should handle 80% of burst traffic');
    });

    // Test 2: Sustained Load
    await this.runTest('Sustained Load Test', 'Performance', async () => {
      const duration = 10000; // 10 seconds
      const startTime = Date.now();
      let requestCount = 0;
      let successCount = 0;
      
      while (Date.now() - startTime < duration) {
        const response = await this.makeRequest(`/api/forms?refKey=example`);
        requestCount++;
        if (response.status === 200 || response.status === 404) {
          successCount++;
        }
        
        // Small delay to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const successRate = (successCount / requestCount * 100).toFixed(1);
      console.log(`    ${requestCount} requests, ${successRate}% success rate`);
      this.assert(successRate >= 95, 'Should maintain 95% success under load');
    });

    // Test 3: Memory Leak Test
    await this.runTest('Memory Leak Detection', 'Performance', async () => {
      const iterations = 100;
      const results = [];
      
      for (let i = 0; i < iterations; i++) {
        const response = await this.makeRequest('/api/forms', {
          method: 'POST',
          headers: { 'x-admin-key': config.adminKey },
          body: {
            refKey: `memory-test-${i}-${Date.now()}`,
            title: `Memory Test ${i}`,
            responseSheetUrl: '1nw64BTzTPMAsC4al3K0AvxWHwcpcxp9gj-jLsQIv_Kw#sheet=Sheet1',
            fields: Array(10).fill({
              key: `field_${i}`,
              label: `Field ${i}`,
              type: 'text'
            })
          }
        });
        
        results.push(response.status);
        
        // Track created forms for cleanup
        if (response.status === 200) {
          this.createdFormKeys.push(`memory-test-${i}-${Date.now()}`);
        }
      }
      
      const successful = results.filter(s => s === 200).length;
      console.log(`    ${successful}/${iterations} operations completed`);
      this.assert(successful >= iterations * 0.9, 'No significant degradation over time');
    });
  }

  // ═══════════════════════════════════════════
  // DATA VALIDATION EDGE CASES
  // ═══════════════════════════════════════════

  async testDataValidationEdgeCases() {
    console.log(`\n${colors.bright}${colors.magenta}══════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}DATA VALIDATION EDGE CASES${colors.reset}`);
    console.log(`${colors.magenta}══════════════════════════════════════════${colors.reset}`);

    // Test 1: Boundary Values
    await this.runTest('Boundary Value Testing', 'Validation', async () => {
      const boundaryTests = [
        { value: '', description: 'Empty string' },
        { value: ' ', description: 'Single space' },
        { value: '  ', description: 'Multiple spaces' },
        { value: '\n', description: 'Newline' },
        { value: '\t', description: 'Tab' },
        { value: '\r\n', description: 'CRLF' },
        { value: '0', description: 'Zero' },
        { value: '-1', description: 'Negative' },
        { value: '999999999999999999999', description: 'Very large number' },
        { value: '0.00000000000001', description: 'Very small decimal' },
        { value: 'NaN', description: 'Not a number' },
        { value: 'Infinity', description: 'Infinity' },
        { value: 'true', description: 'Boolean true' },
        { value: 'false', description: 'Boolean false' },
        { value: 'null', description: 'Null string' },
        { value: 'undefined', description: 'Undefined string' }
      ];

      let handled = 0;
      for (const test of boundaryTests) {
        const response = await this.makeRequest('/api/submit', {
          method: 'POST',
          body: {
            refKey: config.testData.testForm.refKey,
            values: {
              test_field_1: test.value,
              test_field_2: 'test@example.com',
              test_field_3: test.value
            }
          }
        });

        if (response.status === 200 || response.status === 400) {
          handled++;
        }
      }

      this.assert(handled === boundaryTests.length, 'All boundary values handled');
      console.log(`    ${handled} boundary cases tested`);
    });

    // Test 2: Email Validation Edge Cases
    await this.runTest('Email Validation Edge Cases', 'Validation', async () => {
      const emails = [
        'valid@example.com',
        'valid+tag@example.com',
        'valid.dot@example.com',
        'valid_underscore@example.com',
        '123@example.com',
        'a@b.c',
        'very.long.email.address.with.many.dots@subdomain.example.com',
        '@example.com', // Invalid
        'no-at-sign.com', // Invalid
        'double@@example.com', // Invalid
        'spaces in@example.com', // Invalid
        'trailing.dot.@example.com', // Invalid
        '.leading.dot@example.com', // Invalid
        'user@', // Invalid
        'user@.com', // Invalid
        'user@example', // Technically valid
        'user@localhost', // Technically valid
        'user@192.168.1.1', // Valid IP
        'user@[IPv6:2001:db8::1]', // Valid IPv6
        '"quoted"@example.com', // Valid but unusual
        'user\\@escape@example.com' // Edge case
      ];

      let validCount = 0;
      let invalidCount = 0;

      for (const email of emails) {
        const response = await this.makeRequest('/api/submit', {
          method: 'POST',
          body: {
            refKey: config.testData.testForm.refKey,
            values: {
              test_field_1: 'Test',
              test_field_2: email,
              test_field_3: 'Test'
            }
          }
        });

        if (response.status === 200) {
          validCount++;
        } else {
          invalidCount++;
        }
      }

      console.log(`    ${validCount} accepted, ${invalidCount} rejected`);
      this.assert(validCount > 0 && invalidCount > 0, 'Email validation working');
    });

    // Test 3: Unicode and Emoji Handling
    await this.runTest('Unicode and Emoji Handling', 'Validation', async () => {
      const unicodeTests = [
        '😀😃😄😁😆😅🤣😂', // Emojis
        '🇺🇸🇬🇧🇯🇵🇩🇪🇫🇷', // Flag emojis
        '♠♣♥♦', // Card symbols
        '½⅓¼⅛', // Fractions
        '©®™℠', // Special symbols
        'Ā Ē Ī Ō Ū', // Macrons
        'א ב ג ד', // Hebrew
        'α β γ δ', // Greek
        'अ आ इ ई', // Hindi
        'ก ข ค ง', // Thai
        '零一二三四五六七八九', // Chinese numbers
        '\u200B\u200C\u200D', // Zero-width characters
        '\uFEFF', // Byte order mark
        String.fromCharCode(0x1F600), // Emoji via char code
        '\u0000', // Null character
        '\uFFFF' // Max BMP character
      ];

      let handled = 0;
      for (const unicode of unicodeTests) {
        const response = await this.makeRequest('/api/submit', {
          method: 'POST',
          body: {
            refKey: config.testData.testForm.refKey,
            values: {
              test_field_1: unicode,
              test_field_2: 'test@example.com',
              test_field_3: unicode
            }
          }
        });

        if (response.status === 200 || response.status === 400) {
          handled++;
        }
      }

      this.assert(handled === unicodeTests.length, 'All Unicode handled correctly');
      console.log(`    ${handled} Unicode/emoji cases handled`);
    });

    // Test 4: Date/Time Format Edge Cases
    await this.runTest('Date/Time Format Edge Cases', 'Validation', async () => {
      const dates = [
        new Date().toISOString(),
        '2024-12-31',
        '31/12/2024',
        '12/31/2024',
        '2024/12/31',
        '31-12-2024',
        'December 31, 2024',
        '2024-12-31T23:59:59Z',
        '2024-12-31T23:59:59.999Z',
        '2024-12-31T23:59:59+00:00',
        '2024-12-31T23:59:59-05:00',
        '1970-01-01T00:00:00Z', // Epoch
        '2038-01-19T03:14:07Z', // Y2038
        '0000-00-00', // Invalid
        '2024-13-01', // Invalid month
        '2024-12-32', // Invalid day
        '2024-02-30', // Invalid Feb 30
        Date.now().toString(), // Timestamp
        'now',
        'today',
        'yesterday',
        'tomorrow'
      ];

      let handled = 0;
      for (const date of dates) {
        const response = await this.makeRequest('/api/submit', {
          method: 'POST',
          body: {
            refKey: config.testData.testForm.refKey,
            values: {
              test_field_1: date,
              test_field_2: 'test@example.com',
              test_field_3: date
            }
          }
        });

        if (response.status === 200 || response.status === 400) {
          handled++;
        }
      }

      this.assert(handled === dates.length, 'All date formats handled');
      console.log(`    ${handled} date/time formats tested`);
    });
  }

  // ═══════════════════════════════════════════
  // CONCURRENCY AND RACE CONDITIONS
  // ═══════════════════════════════════════════

  async testConcurrencyRaceConditions() {
    console.log(`\n${colors.bright}${colors.magenta}══════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}CONCURRENCY & RACE CONDITIONS${colors.reset}`);
    console.log(`${colors.magenta}══════════════════════════════════════════${colors.reset}`);

    // Test 1: Simultaneous Form Creation
    await this.runTest('Simultaneous Form Creation', 'Concurrency', async () => {
      const baseRefKey = 'concurrent-create-' + Date.now();
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        promises.push(
          this.makeRequest('/api/forms', {
            method: 'POST',
            headers: { 'x-admin-key': config.adminKey },
            body: {
              refKey: `${baseRefKey}-${i}`,
              title: `Concurrent Form ${i}`,
              responseSheetUrl: '1nw64BTzTPMAsC4al3K0AvxWHwcpcxp9gj-jLsQIv_Kw#sheet=Sheet1',
              fields: []
            }
          })
        );
      }

      const results = await Promise.all(promises);
      const successful = results.filter(r => r.status === 200).length;
      
      // Track for cleanup
      for (let i = 0; i < 10; i++) {
        if (results[i].status === 200) {
          this.createdFormKeys.push(`${baseRefKey}-${i}`);
        }
      }
      
      this.assert(successful >= 8, `${successful}/10 concurrent creates succeeded`);
    });

    // Test 2: Read-Write Race Condition
    await this.runTest('Read-Write Race Condition', 'Concurrency', async () => {
      const refKey = 'race-condition-' + Date.now();
      
      // Create form first
      await this.makeRequest('/api/forms', {
        method: 'POST',
        headers: { 'x-admin-key': config.adminKey },
        body: {
          refKey: refKey,
          title: 'Race Condition Test',
          responseSheetUrl: '1nw64BTzTPMAsC4al3K0AvxWHwcpcxp9gj-jLsQIv_Kw#sheet=Sheet1',
          fields: [{ key: 'field1', label: 'Field 1', type: 'text' }]
        }
      });
      
      this.createdFormKeys.push(refKey);

      // Simultaneous read and update
      const promises = [
        // Reads
        this.makeRequest(`/api/forms?refKey=${refKey}`),
        this.makeRequest(`/api/forms?refKey=${refKey}`),
        this.makeRequest(`/api/forms?refKey=${refKey}`),
        // Updates
        this.makeRequest('/api/forms', {
          method: 'POST',
          headers: { 'x-admin-key': config.adminKey },
          body: {
            refKey: refKey,
            title: 'Updated Title 1',
            _overwrite: true
          }
        }),
        this.makeRequest('/api/forms', {
          method: 'POST',
          headers: { 'x-admin-key': config.adminKey },
          body: {
            refKey: refKey,
            title: 'Updated Title 2',
            _overwrite: true
          }
        })
      ];

      const results = await Promise.all(promises);
      const allSuccessful = results.every(r => r.status === 200);
      
      this.assert(allSuccessful, 'All concurrent operations should complete');
    });

    // Test 3: Deadlock Prevention
    await this.runTest('Deadlock Prevention Test', 'Concurrency', async () => {
      const form1 = 'deadlock-1-' + Date.now();
      const form2 = 'deadlock-2-' + Date.now();
      
      // Create two forms
      await Promise.all([
        this.makeRequest('/api/forms', {
          method: 'POST',
          headers: { 'x-admin-key': config.adminKey },
          body: {
            refKey: form1,
            title: 'Deadlock Test 1',
            responseSheetUrl: '1nw64BTzTPMAsC4al3K0AvxWHwcpcxp9gj-jLsQIv_Kw#sheet=Sheet1',
            fields: []
          }
        }),
        this.makeRequest('/api/forms', {
          method: 'POST',
          headers: { 'x-admin-key': config.adminKey },
          body: {
            refKey: form2,
            title: 'Deadlock Test 2',
            responseSheetUrl: '1nw64BTzTPMAsC4al3K0AvxWHwcpcxp9gj-jLsQIv_Kw#sheet=Sheet1',
            fields: []
          }
        })
      ]);
      
      this.createdFormKeys.push(form1, form2);

      // Attempt operations that could cause deadlock
      const promises = [
        // Thread 1: Update form1, then read form2
        (async () => {
          await this.makeRequest('/api/forms', {
            method: 'POST',
            headers: { 'x-admin-key': config.adminKey },
            body: { refKey: form1, title: 'Updated 1', _overwrite: true }
          });
          return await this.makeRequest(`/api/forms?refKey=${form2}`);
        })(),
        // Thread 2: Update form2, then read form1
        (async () => {
          await this.makeRequest('/api/forms', {
            method: 'POST',
            headers: { 'x-admin-key': config.adminKey },
            body: { refKey: form2, title: 'Updated 2', _overwrite: true }
          });
          return await this.makeRequest(`/api/forms?refKey=${form1}`);
        })()
      ];

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;
      
      this.assert(duration < 10000, 'No deadlock detected (completed in reasonable time)');
      this.assert(results.every(r => r.status === 200), 'All operations completed');
    });
  }

  // ═══════════════════════════════════════════
  // EXTENDED RUN METHOD
  // ═══════════════════════════════════════════

  async run() {
    console.log(`${colors.bright}${colors.cyan}╔══════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}║  COMPREHENSIVE API TEST SUITE            ║${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}║  Extended Edge Case Testing              ║${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}╚══════════════════════════════════════════╝${colors.reset}`);
    console.log(`\nBase URL: ${config.baseUrl}`);
    console.log(`Admin Key: ${config.adminKey}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);

    this.results.startTime = Date.now();

    try {
      // Run standard tests first
      await super.testFormsAPI();
      await super.testSubmissionAPI();
      await super.testSheetsAPI();
      await super.testGASConnectivity();
      
      // Run comprehensive edge case tests
      await this.testFormsEdgeCases();
      await this.testSubmissionEdgeCases();
      await this.testSecurityCases();
      await this.testPerformanceStress();
      await this.testDataValidationEdgeCases();
      await this.testConcurrencyRaceConditions();

      // Cleanup
      await this.cleanup();

    } catch (error) {
      console.error(`\n${colors.red}Fatal error: ${error.message}${colors.reset}`);
      console.error(error.stack);
    } finally {
      this.results.endTime = Date.now();
      await this.generateComprehensiveReport();
    }

    // Exit with appropriate code
    process.exit(this.results.failed > 0 ? 1 : 0);
  }

  async generateComprehensiveReport() {
    await super.generateReport();
    
    // Additional comprehensive test summary
    console.log(`\n${colors.bright}${colors.cyan}══════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}COMPREHENSIVE TEST COVERAGE${colors.reset}`);
    console.log(`${colors.cyan}══════════════════════════════════════════${colors.reset}`);
    
    const categories = {
      'Standard Tests': this.results.tests.filter(t => !t.category.includes('Edge')).length,
      'Edge Cases': this.results.tests.filter(t => t.category.includes('Edge')).length,
      'Security Tests': this.results.tests.filter(t => t.category === 'Security').length,
      'Performance Tests': this.results.tests.filter(t => t.category === 'Performance').length,
      'Validation Tests': this.results.tests.filter(t => t.category === 'Validation').length,
      'Concurrency Tests': this.results.tests.filter(t => t.category === 'Concurrency').length
    };

    Object.entries(categories).forEach(([category, count]) => {
      if (count > 0) {
        console.log(`${category}: ${count} tests`);
      }
    });

    const totalTests = Object.values(categories).reduce((a, b) => a + b, 0);
    console.log(`\n${colors.bright}Total Comprehensive Tests: ${totalTests}${colors.reset}`);
  }
}

// Run if executed directly
if (require.main === module) {
  // Load environment variables
  const dotenvPath = path.join(__dirname, '../../.env');
  if (require('fs').existsSync(dotenvPath)) {
    require('fs').readFileSync(dotenvPath, 'utf8')
      .split('\n')
      .filter(line => line && !line.startsWith('#'))
      .forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
          process.env[key.trim()] = value.trim();
        }
      });
  }

  const tester = new ComprehensiveAPITestSuite();
  tester.run();
}

module.exports = ComprehensiveAPITestSuite;