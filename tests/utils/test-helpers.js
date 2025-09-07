/**
 * Test Helper Utilities
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Replace template variables in test values
 * @param {string} value - Value with optional {{timestamp}} placeholder
 * @param {number} timestamp - Current timestamp
 * @returns {string} Formatted value
 */
function formatTestValue(value, timestamp) {
  if (!value) return '';
  return value.replace(/\{\{timestamp\}\}/g, timestamp);
}

/**
 * Save test results to JSON file
 * @param {Array} results - Test results array
 */
async function saveTestResults(results) {
  const resultsDir = path.join(__dirname, '..', 'results');
  await fs.mkdir(resultsDir, { recursive: true });
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `test-results-${timestamp}.json`;
  const filepath = path.join(resultsDir, filename);
  
  await fs.writeFile(filepath, JSON.stringify(results, null, 2));
  console.log(`\n📊 Test results saved to: tests/results/${filename}`);
}

/**
 * Log test result with formatting
 * @param {string} message - Message to log
 * @param {string} type - Type of message (info, success, error, warning)
 */
function logTestResult(message, type = 'info') {
  const symbols = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warning: '⚠️'
  };
  
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    error: '\x1b[31m',   // Red
    warning: '\x1b[33m', // Yellow
    reset: '\x1b[0m'
  };
  
  const symbol = symbols[type] || symbols.info;
  const color = colors[type] || colors.info;
  
  console.log(`${color}${symbol} ${message}${colors.reset}`);
}

/**
 * Wait for a specific condition
 * @param {Function} condition - Function that returns true when condition is met
 * @param {number} timeout - Maximum time to wait in milliseconds
 * @param {number} interval - Check interval in milliseconds
 */
async function waitForCondition(condition, timeout = 10000, interval = 100) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Generate test report HTML
 * @param {Array} results - Test results array
 */
async function generateHTMLReport(results) {
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  const passRate = ((passed / total) * 100).toFixed(1);
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Form Test Results</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    h1 {
      color: #2c3e50;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
    }
    .summary {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .stats {
      display: flex;
      justify-content: space-around;
      margin: 20px 0;
    }
    .stat {
      text-align: center;
      padding: 10px;
    }
    .stat-value {
      font-size: 2em;
      font-weight: bold;
    }
    .stat-label {
      color: #666;
      font-size: 0.9em;
    }
    .passed { color: #27ae60; }
    .failed { color: #e74c3c; }
    .test-result {
      background: white;
      padding: 15px;
      margin-bottom: 10px;
      border-radius: 5px;
      border-left: 4px solid #ccc;
    }
    .test-result.passed {
      border-left-color: #27ae60;
    }
    .test-result.failed {
      border-left-color: #e74c3c;
    }
    .test-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .test-name {
      font-weight: bold;
      font-size: 1.1em;
    }
    .test-status {
      padding: 5px 10px;
      border-radius: 3px;
      color: white;
      font-size: 0.9em;
    }
    .status-passed {
      background: #27ae60;
    }
    .status-failed {
      background: #e74c3c;
    }
    .test-details {
      color: #666;
      font-size: 0.9em;
    }
    .error-message {
      background: #fff5f5;
      border: 1px solid #ffdddd;
      padding: 10px;
      margin-top: 10px;
      border-radius: 3px;
      color: #c0392b;
    }
    .timestamp {
      text-align: center;
      color: #666;
      margin-top: 20px;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <h1>📋 Form Submission Test Results</h1>
  
  <div class="summary">
    <h2>Summary</h2>
    <div class="stats">
      <div class="stat">
        <div class="stat-value">${total}</div>
        <div class="stat-label">Total Tests</div>
      </div>
      <div class="stat">
        <div class="stat-value passed">${passed}</div>
        <div class="stat-label">Passed</div>
      </div>
      <div class="stat">
        <div class="stat-value failed">${failed}</div>
        <div class="stat-label">Failed</div>
      </div>
      <div class="stat">
        <div class="stat-value">${passRate}%</div>
        <div class="stat-label">Pass Rate</div>
      </div>
    </div>
  </div>
  
  <h2>Test Results</h2>
  ${results.map(result => `
    <div class="test-result ${result.passed ? 'passed' : 'failed'}">
      <div class="test-header">
        <div class="test-name">${result.formName}</div>
        <div class="test-status ${result.passed ? 'status-passed' : 'status-failed'}">
          ${result.passed ? 'PASSED' : 'FAILED'}
        </div>
      </div>
      <div class="test-details">
        <div>RefKey: ${result.refKey}</div>
        <div>Load Test: ${result.loadTest?.success ? '✅ Passed' : '❌ Failed'}</div>
        ${result.submitTest ? 
          `<div>Submit Test: ${result.submitTest.success ? '✅ Passed' : 
            result.submitTest.skipped ? '⏭️ Skipped' : '❌ Failed'}</div>` : ''}
      </div>
      ${result.loadTest?.error ? 
        `<div class="error-message">Load Error: ${result.loadTest.error}</div>` : ''}
      ${result.submitTest?.error ? 
        `<div class="error-message">Submit Error: ${result.submitTest.error}</div>` : ''}
    </div>
  `).join('')}
  
  <div class="timestamp">
    Generated: ${new Date().toLocaleString()}
  </div>
</body>
</html>
  `;
  
  const reportsDir = path.join(__dirname, '..', 'reports');
  await fs.mkdir(reportsDir, { recursive: true });
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `test-report-${timestamp}.html`;
  const filepath = path.join(reportsDir, filename);
  
  await fs.writeFile(filepath, html);
  console.log(`📈 HTML report saved to: tests/reports/${filename}`);
  
  return filepath;
}

module.exports = {
  formatTestValue,
  saveTestResults,
  logTestResult,
  waitForCondition,
  generateHTMLReport
};