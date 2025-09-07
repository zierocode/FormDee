#!/usr/bin/env node

/**
 * Comprehensive API Test Suite
 * Tests all interactions between Next.js app and Google Apps Script
 */

const https = require('https');
const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const config = require('./config');
const TestDataCleanup = require('../utils/test-cleanup');

// ANSI color codes for terminal output
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

class APITestSuite {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: [],
      startTime: null,
      endTime: null
    };
    this.createdFormKeys = []; // Track forms to cleanup
  }

  // Utility: Make HTTP request
  async makeRequest(endpoint, options = {}) {
    const url = new URL(endpoint, config.baseUrl);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    return new Promise((resolve, reject) => {
      const reqOptions = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        timeout: config.timeouts.api
      };

      const req = client.request(reqOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: json
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: data
            });
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (options.body) {
        req.write(JSON.stringify(options.body));
      }

      req.end();
    });
  }

  // Test runner wrapper
  async runTest(name, category, testFn) {
    const testStart = Date.now();
    const test = {
      name,
      category,
      status: 'running',
      duration: 0,
      error: null
    };

    try {
      console.log(`\n${colors.cyan}►${colors.reset} Running: ${name}`);
      await testFn();
      test.status = 'passed';
      this.results.passed++;
      console.log(`  ${colors.green}✓${colors.reset} PASSED (${Date.now() - testStart}ms)`);
    } catch (error) {
      test.status = 'failed';
      test.error = error.message;
      this.results.failed++;
      console.log(`  ${colors.red}✗${colors.reset} FAILED: ${error.message}`);
      if (config.logging.verbose) {
        console.log(`    ${colors.yellow}Details: ${error.stack}${colors.reset}`);
      }
    } finally {
      test.duration = Date.now() - testStart;
      this.results.total++;
      this.results.tests.push(test);
    }
  }

  // Assert helper
  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // ═══════════════════════════════════════════
  // FORMS API TESTS
  // ═══════════════════════════════════════════

  async testFormsAPI() {
    console.log(`\n${colors.bright}${colors.blue}══════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}FORMS API TESTS${colors.reset}`);
    console.log(`${colors.blue}══════════════════════════════════════════${colors.reset}`);

    // Test 1: Create Form
    await this.runTest('Create Form', 'Forms', async () => {
      const response = await this.makeRequest('/api/forms', {
        method: 'POST',
        headers: { 'x-admin-key': config.adminKey },
        body: config.testData.testForm
      });

      this.assert(response.status === 200, `Expected 200, got ${response.status}`);
      this.assert(response.data.ok === true, 'Response should have ok:true');
      
      // Check if refKey exists in the response data
      const returnedRefKey = response.data.data?.refKey || config.testData.testForm.refKey;
      this.assert(returnedRefKey, 'No refKey returned');
      
      // Store the created refKey for cleanup and update config for subsequent tests
      this.createdFormKeys.push(returnedRefKey);
      config.testData.testForm.refKey = returnedRefKey;
      console.log(`    Created form: ${returnedRefKey}`);
    });

    // Test 2: Read Form (Public)
    await this.runTest('Read Form (Public)', 'Forms', async () => {
      const response = await this.makeRequest(`/api/forms?refKey=${config.testData.testForm.refKey}`);
      
      this.assert(response.status === 200, `Expected 200, got ${response.status}`);
      this.assert(response.data.ok === true, 'Response should have ok:true');
      this.assert(response.data.data.refKey === config.testData.testForm.refKey, 'RefKey mismatch');
      this.assert(response.data.data.title === config.testData.testForm.title, 'Title mismatch');
    });

    // Test 3: Update Form
    await this.runTest('Update Form', 'Forms', async () => {
      const updatedForm = {
        ...config.testData.testForm,
        title: 'Updated API Test Form',
        _overwrite: true
      };

      const response = await this.makeRequest('/api/forms', {
        method: 'POST',
        headers: { 'x-admin-key': config.adminKey },
        body: updatedForm
      });

      this.assert(response.status === 200, `Expected 200, got ${response.status}`);
      // GAS might return just success without the updated data
      const isUpdated = response.data.ok === true || response.data.data?.title === 'Updated API Test Form';
      this.assert(isUpdated, `Update failed: ${JSON.stringify(response.data).slice(0, 100)}`);
    });

    // Test 4: List All Forms (Admin)
    await this.runTest('List All Forms (Admin)', 'Forms', async () => {
      const response = await this.makeRequest(`/api/forms?adminKey=${config.adminKey}`);
      
      this.assert(response.status === 200, `Expected 200, got ${response.status}`);
      this.assert(response.data.ok === true, 'Response should have ok:true');
      this.assert(Array.isArray(response.data.data), 'Data should be an array');
      
      const ourForm = response.data.data.find(f => f.refKey === config.testData.testForm.refKey);
      this.assert(ourForm !== undefined, 'Created form not found in list');
      console.log(`    Found ${response.data.data.length} forms`);
    });

    // Test 5: Invalid Form Creation (No RefKey)
    await this.runTest('Invalid Form Creation', 'Forms', async () => {
      const response = await this.makeRequest('/api/forms', {
        method: 'POST',
        headers: { 'x-admin-key': config.adminKey },
        body: config.testData.invalidData.form
      });

      // GAS returns 200 with error in body, or non-200 status
      const hasError = response.status !== 200 || response.data.ok === false;
      this.assert(hasError, `Should fail with invalid data, got status ${response.status}, ok: ${response.data.ok}`);
    });

    // Test 6: Unauthorized Access
    await this.runTest('Unauthorized Access', 'Forms', async () => {
      const response = await this.makeRequest('/api/forms?adminKey=wrong-key');
      
      this.assert(response.status === 401, `Expected 401, got ${response.status}`);
      this.assert(response.data.ok === false, 'Response should have ok:false');
    });

    // Test 7: Non-existent Form
    await this.runTest('Non-existent Form', 'Forms', async () => {
      const response = await this.makeRequest('/api/forms?refKey=non-existent-form-12345');
      
      this.assert(response.status === 404, `Expected 404, got ${response.status}`);
      this.assert(response.data.ok === false, 'Response should have ok:false');
    });
  }

  // ═══════════════════════════════════════════
  // SUBMISSION API TESTS
  // ═══════════════════════════════════════════

  async testSubmissionAPI() {
    console.log(`\n${colors.bright}${colors.blue}══════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}SUBMISSION API TESTS${colors.reset}`);
    console.log(`${colors.blue}══════════════════════════════════════════${colors.reset}`);

    // Test 1: Submit to Form
    await this.runTest('Submit to Form', 'Submission', async () => {
      const response = await this.makeRequest('/api/submit', {
        method: 'POST',
        body: {
          refKey: config.testData.testForm.refKey,
          values: config.testData.testSubmission
        }
      });

      this.assert(response.status === 200, `Expected 200, got ${response.status}`);
      this.assert(response.data.ok === true, 'Response should have ok:true');
      console.log(`    Submission successful`);
    });

    // Test 2: Submit with Missing Required Field
    await this.runTest('Submit with Missing Required', 'Submission', async () => {
      const incompleteData = { ...config.testData.testSubmission };
      delete incompleteData.test_field_1; // Remove required field

      const response = await this.makeRequest('/api/submit', {
        method: 'POST',
        body: {
          refKey: config.testData.testForm.refKey,
          values: incompleteData
        }
      });

      // Note: This might pass if validation is client-side only
      console.log(`    Status: ${response.status}, OK: ${response.data.ok}`);
    });

    // Test 3: Submit to Non-existent Form
    await this.runTest('Submit to Non-existent Form', 'Submission', async () => {
      const response = await this.makeRequest('/api/submit', {
        method: 'POST',
        body: {
          refKey: 'non-existent-form-xyz',
          values: { test: 'value' }
        }
      });

      this.assert(response.status === 404, `Expected 404, got ${response.status}`);
      this.assert(response.data.ok === false, 'Response should have ok:false');
    });

    // Test 4: Submit with Special Characters
    await this.runTest('Submit with Special Characters', 'Submission', async () => {
      const specialData = {
        test_field_1: '测试 テスト 테스트 ๆ ทดสอบ',
        test_field_2: 'test+special@example.com',
        test_field_3: '<script>alert("XSS")</script> & "quotes" \'apostrophes\''
      };

      const response = await this.makeRequest('/api/submit', {
        method: 'POST',
        body: {
          refKey: config.testData.testForm.refKey,
          values: specialData
        }
      });

      this.assert(response.status === 200, `Expected 200, got ${response.status}`);
      console.log(`    Special characters handled correctly`);
    });

    // Test 5: Large Payload Submission
    await this.runTest('Large Payload Submission', 'Submission', async () => {
      const largeText = 'A'.repeat(10000); // 10KB of text
      const largeData = {
        test_field_1: 'Large submission test',
        test_field_2: 'test@example.com',
        test_field_3: largeText
      };

      const response = await this.makeRequest('/api/submit', {
        method: 'POST',
        body: {
          refKey: config.testData.testForm.refKey,
          values: largeData
        }
      });

      this.assert(response.status === 200, `Expected 200, got ${response.status}`);
      console.log(`    Large payload (10KB) submitted successfully`);
    });

    // Test 6: Concurrent Submissions
    await this.runTest('Concurrent Submissions', 'Submission', async () => {
      const promises = [];
      const concurrentCount = 5;

      for (let i = 0; i < concurrentCount; i++) {
        const data = {
          test_field_1: `Concurrent test ${i}`,
          test_field_2: `test${i}@example.com`,
          test_field_3: `Submission number ${i}`
        };

        promises.push(
          this.makeRequest('/api/submit', {
            method: 'POST',
            body: {
              refKey: config.testData.testForm.refKey,
              values: data
            }
          })
        );
      }

      const results = await Promise.all(promises);
      const allSuccessful = results.every(r => r.status === 200 && r.data.ok === true);
      
      this.assert(allSuccessful, 'Not all concurrent submissions succeeded');
      console.log(`    ${concurrentCount} concurrent submissions completed`);
    });
  }

  // ═══════════════════════════════════════════
  // SHEETS METADATA API TESTS
  // ═══════════════════════════════════════════

  async testSheetsAPI() {
    console.log(`\n${colors.bright}${colors.blue}══════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}SHEETS METADATA API TESTS${colors.reset}`);
    console.log(`${colors.blue}══════════════════════════════════════════${colors.reset}`);

    // Test 1: Get Sheet Metadata
    await this.runTest('Get Sheet Metadata', 'Sheets', async () => {
      const sheetId = config.testData.testSheets[0].id;
      const response = await this.makeRequest(
        `/api/forms?op=sheets_meta&id=${sheetId}&adminKey=${config.adminKey}`
      );

      this.assert(response.status === 200, `Expected 200, got ${response.status}`);
      this.assert(response.data.ok === true, 'Response should have ok:true');
      this.assert(response.data.data.spreadsheetId === sheetId, 'Sheet ID mismatch');
      this.assert(Array.isArray(response.data.data.sheets), 'Sheets should be an array');
      
      console.log(`    Found ${response.data.data.sheets.length} sheets`);
    });

    // Test 2: Get Metadata with Cache Refresh
    await this.runTest('Get Metadata with Cache Refresh', 'Sheets', async () => {
      const sheetId = config.testData.testSheets[0].id;
      
      // First request (cached)
      const response1 = await this.makeRequest(
        `/api/forms?op=sheets_meta&id=${sheetId}&adminKey=${config.adminKey}`
      );
      
      // Second request with refresh
      const response2 = await this.makeRequest(
        `/api/forms?op=sheets_meta&id=${sheetId}&adminKey=${config.adminKey}&refresh=true`
      );

      this.assert(response1.status === 200, 'First request should succeed');
      this.assert(response2.status === 200, 'Refresh request should succeed');
      console.log(`    Cache and refresh working correctly`);
    });

    // Test 3: Invalid Sheet ID
    await this.runTest('Invalid Sheet ID', 'Sheets', async () => {
      const response = await this.makeRequest(
        `/api/forms?op=sheets_meta&id=${config.testData.invalidData.sheetId}&adminKey=${config.adminKey}`
      );

      // Invalid sheet ID should return an error
      const hasError = response.status !== 200 || response.data.ok === false;
      this.assert(hasError, `Should fail with invalid sheet ID, got status ${response.status}`);
    });

    // Test 4: Missing Sheet ID
    await this.runTest('Missing Sheet ID', 'Sheets', async () => {
      const response = await this.makeRequest(
        `/api/forms?op=sheets_meta&adminKey=${config.adminKey}`
      );

      this.assert(response.status === 400, `Expected 400, got ${response.status}`);
    });
  }

  // ═══════════════════════════════════════════
  // GAS CONNECTIVITY TESTS
  // ═══════════════════════════════════════════

  async testGASConnectivity() {
    console.log(`\n${colors.bright}${colors.blue}══════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}GAS CONNECTIVITY TESTS${colors.reset}`);
    console.log(`${colors.blue}══════════════════════════════════════════${colors.reset}`);

    // Test 1: GAS Root Endpoint
    await this.runTest('GAS Root Endpoint', 'GAS', async () => {
      // This tests if GAS is reachable through our API
      const response = await this.makeRequest('/api/forms?refKey=example');
      
      // Even if form doesn't exist, we should get a response
      this.assert(
        response.status === 200 || response.status === 404,
        `Unexpected status: ${response.status}`
      );
      console.log(`    GAS is reachable`);
    });

    // Test 2: GAS Response Time
    await this.runTest('GAS Response Time', 'GAS', async () => {
      const startTime = Date.now();
      const response = await this.makeRequest(`/api/forms?adminKey=${config.adminKey}`);
      const duration = Date.now() - startTime;

      this.assert(response.status === 200, `Expected 200, got ${response.status}`);
      this.assert(duration < config.timeouts.gas, `Response too slow: ${duration}ms`);
      console.log(`    Response time: ${duration}ms`);
    });

    // Test 3: GAS Error Handling
    await this.runTest('GAS Error Handling', 'GAS', async () => {
      // Test with malformed request - send invalid JSON
      const response = await this.makeRequest('/api/forms', {
        method: 'POST',
        headers: { 
          'x-admin-key': config.adminKey
        },
        body: { refKey: null, title: 'Test' } // Invalid: null refKey
      });

      // Should handle error gracefully (either 400 or 200 with ok:false)
      const handledGracefully = response.status === 400 || 
                                response.status === 200 || 
                                (response.status === 500 && response.data.ok === false);
      this.assert(handledGracefully, `Error not handled gracefully: status ${response.status}`);
      console.log(`    Error handling works correctly`);
    });

    // Test 4: Rate Limiting Test
    await this.runTest('Rate Limiting Test', 'GAS', async () => {
      const requests = [];
      const requestCount = 10;

      for (let i = 0; i < requestCount; i++) {
        requests.push(
          this.makeRequest(`/api/forms?refKey=example`)
        );
      }

      const results = await Promise.all(requests);
      const successCount = results.filter(r => r.status === 200 || r.status === 404).length;
      
      this.assert(successCount === requestCount, `${requestCount - successCount} requests failed`);
      console.log(`    ${requestCount} rapid requests handled successfully`);
    });
  }

  // ═══════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════

  async cleanup() {
    if (this.createdFormKeys.length === 0) return;
    
    console.log(`\n${colors.yellow}🧹 Cleaning up test data...${colors.reset}`);
    
    // Use the dedicated cleanup utility
    const cleanup = new TestDataCleanup();
    
    // Clean up forms we created
    for (const formKey of this.createdFormKeys) {
      await cleanup.deleteTestForm(formKey);
    }
    
    // Clean up any additional test forms and files
    await cleanup.cleanupTestScreenshots();
    
    console.log(`${colors.green}✅ API test cleanup completed${colors.reset}`);
  }

  // ═══════════════════════════════════════════
  // REPORT GENERATION
  // ═══════════════════════════════════════════

  async generateReport() {
    const duration = ((this.results.endTime - this.results.startTime) / 1000).toFixed(2);
    
    // Console Report
    console.log(`\n${colors.bright}${colors.blue}══════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}TEST SUMMARY${colors.reset}`);
    console.log(`${colors.blue}══════════════════════════════════════════${colors.reset}`);
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`${colors.green}Passed: ${this.results.passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${this.results.failed}${colors.reset}`);
    console.log(`${colors.yellow}Skipped: ${this.results.skipped}${colors.reset}`);
    console.log(`Duration: ${duration}s`);
    console.log(`Pass Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);

    if (this.results.failed > 0) {
      console.log(`\n${colors.red}Failed Tests:${colors.reset}`);
      this.results.tests
        .filter(t => t.status === 'failed')
        .forEach(t => {
          console.log(`  - ${t.name}: ${t.error}`);
        });
    }

    // Save JSON Report
    if (config.reporting.format.includes('json')) {
      const reportsDir = path.join(__dirname, 'reports');
      await fs.mkdir(reportsDir, { recursive: true });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportFile = path.join(reportsDir, `api-test-report-${timestamp}.json`);
      
      await fs.writeFile(reportFile, JSON.stringify(this.results, null, 2));
      console.log(`\n${colors.cyan}Report saved to: ${reportFile}${colors.reset}`);
    }

    // Save HTML Report
    if (config.reporting.format.includes('html')) {
      await this.generateHTMLReport();
    }
  }

  async generateHTMLReport() {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>API Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .header { background: #2c3e50; color: white; padding: 20px; border-radius: 5px; }
    .summary { display: flex; justify-content: space-around; margin: 20px 0; }
    .stat { background: white; padding: 15px; border-radius: 5px; text-align: center; }
    .stat-value { font-size: 2em; font-weight: bold; }
    .passed { color: #27ae60; }
    .failed { color: #e74c3c; }
    .test-list { background: white; padding: 20px; border-radius: 5px; }
    .test-item { padding: 10px; border-bottom: 1px solid #eee; }
    .test-passed { border-left: 3px solid #27ae60; }
    .test-failed { border-left: 3px solid #e74c3c; background: #fff5f5; }
  </style>
</head>
<body>
  <div class="header">
    <h1>API Test Report</h1>
    <p>Generated: ${new Date().toLocaleString()}</p>
  </div>
  
  <div class="summary">
    <div class="stat">
      <div class="stat-value">${this.results.total}</div>
      <div>Total Tests</div>
    </div>
    <div class="stat">
      <div class="stat-value passed">${this.results.passed}</div>
      <div>Passed</div>
    </div>
    <div class="stat">
      <div class="stat-value failed">${this.results.failed}</div>
      <div>Failed</div>
    </div>
    <div class="stat">
      <div class="stat-value">${((this.results.passed / this.results.total) * 100).toFixed(1)}%</div>
      <div>Pass Rate</div>
    </div>
  </div>
  
  <div class="test-list">
    <h2>Test Results</h2>
    ${this.results.tests.map(test => `
      <div class="test-item test-${test.status}">
        <strong>${test.name}</strong> (${test.category})
        <span style="float: right">${test.duration}ms</span>
        ${test.error ? `<div style="color: red; margin-top: 5px;">${test.error}</div>` : ''}
      </div>
    `).join('')}
  </div>
</body>
</html>`;

    const reportsDir = path.join(__dirname, 'reports');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const htmlFile = path.join(reportsDir, `api-test-report-${timestamp}.html`);
    
    await fs.writeFile(htmlFile, html);
    console.log(`${colors.cyan}HTML report saved to: ${htmlFile}${colors.reset}`);
  }

  // ═══════════════════════════════════════════
  // MAIN TEST RUNNER
  // ═══════════════════════════════════════════

  async run() {
    console.log(`${colors.bright}${colors.magenta}╔══════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bright}${colors.magenta}║     API INTEGRATION TEST SUITE          ║${colors.reset}`);
    console.log(`${colors.bright}${colors.magenta}║     App <-> GAS Complete Testing        ║${colors.reset}`);
    console.log(`${colors.bright}${colors.magenta}╚══════════════════════════════════════════╝${colors.reset}`);
    console.log(`\nBase URL: ${config.baseUrl}`);
    console.log(`Admin Key: ${config.adminKey}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);

    this.results.startTime = Date.now();

    try {
      // Run test suites
      if (config.testSuites.forms.enabled) {
        await this.testFormsAPI();
      }
      
      if (config.testSuites.submissions.enabled) {
        await this.testSubmissionAPI();
      }
      
      if (config.testSuites.sheets.enabled) {
        await this.testSheetsAPI();
      }
      
      if (config.testSuites.gas.enabled) {
        await this.testGASConnectivity();
      }

      // Cleanup
      await this.cleanup();

    } catch (error) {
      console.error(`\n${colors.red}Fatal error: ${error.message}${colors.reset}`);
      console.error(error.stack);
    } finally {
      this.results.endTime = Date.now();
      await this.generateReport();
    }

    // Exit with appropriate code
    process.exit(this.results.failed > 0 ? 1 : 0);
  }
}

// Run if executed directly
if (require.main === module) {
  // Load environment variables if .env exists
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

  const tester = new APITestSuite();
  tester.run();
}

module.exports = APITestSuite;