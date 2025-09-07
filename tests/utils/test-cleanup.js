/**
 * Test Data Cleanup Utility
 * Removes test data created during automated testing
 */

const https = require('https');
const testConfig = require('../api/config');

class TestDataCleanup {
  constructor() {
    this.config = testConfig;
    this.deletedItems = {
      forms: [],
      submissions: 0
    };
  }

  // Make HTTP request helper
  async makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.config.baseUrl);
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
        }
      };

      const req = (url.protocol === 'https:' ? https : require('http')).request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, data: body });
          }
        });
      });

      req.on('error', reject);
      
      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  // Get all forms to identify test forms
  async getAllForms() {
    const response = await this.makeRequest('GET', `/api/forms?adminKey=${this.config.adminKey}`);
    if (response.status === 200 && response.data.ok) {
      return response.data.data || [];
    }
    return [];
  }

  // Identify test forms by common patterns - SAFETY FIRST!
  isTestForm(form) {
    // PRODUCTION DATA PROTECTION - Never delete these forms
    const protectedPatterns = [
      /^(contact|feedback|signup|login|register|newsletter|subscribe)/i,
      /^(order|payment|checkout|cart|purchase)/i,
      /^(support|help|inquiry|request)/i,
      /^(job|career|application|resume)/i,
      /^(survey|poll|review|rating)/i,
      /^(example)$/i,  // Protect the main example form unless it's clearly a test version
    ];

    // SAFETY CHECK: Never delete protected forms
    const formString = `${form.refKey} ${form.title || ''} ${form.description || ''}`.toLowerCase();
    if (protectedPatterns.some(pattern => pattern.test(form.refKey.toLowerCase()))) {
      console.log(`🛡️  PROTECTED: Skipping protected form: ${form.refKey}`);
      return false;
    }

    // TEST DATA PATTERNS - Only delete forms matching these patterns
    const testPatterns = [
      /test.*\d{13}/i,     // test-something-timestamp  
      /automated.*test/i,   // automated test
      /api.*test.*\d{13}/i, // API test forms with timestamp
      /temp.*test/i,        // temporary test forms
      /cleanup.*test/i,     // cleanup test forms
      /^test-/i,           // starts with test-
      /^test_/i,           // starts with test_
      /^test\./i,          // starts with test.
      /^test\s/i,          // starts with test (space)
      /^test@/i,           // starts with test@
      /^test#/i,           // starts with test#
      /^test\$/i,          // starts with test$
      /^test%/i,           // starts with test%
      /^test&/i,           // starts with test&
      /^test\*/i,          // starts with test*
      /^test\+/i,          // starts with test+
      /test.*char.*test/i, // Special char test forms
      /special.*char.*test/i, // Special character test forms
      /long.*refkey.*test/i, // Long refkey test forms
      /\d{13}$/,           // ends with timestamp (13 digits = millisecond timestamp)
      /-test-\d+$/i,       // ends with -test-numbers
      /^temp-/i,           // starts with temp-
      /integration.*test/i, // integration test
      /e2e.*test/i,        // end-to-end test
      /duplicate.*test/i,   // duplicate test forms
      /^demo-test/i,       // demo test forms
      // Match extremely long refKeys (likely test data)
      /^.{200,}$/,         // RefKeys longer than 200 characters
    ];

    // Check if it matches test patterns
    const isTest = testPatterns.some(pattern => pattern.test(form.refKey)) ||
                   testPatterns.some(pattern => pattern.test(form.title || '')) ||
                   form.refKey === this.config.testData.testForm.refKey ||
                   form.refKey === this.config.testData.cleanupTestForm?.refKey;

    // Additional safety: Must have created recently (within last 7 days) for non-explicit test forms
    if (isTest && !form.refKey.includes('test') && !form.refKey.includes('temp')) {
      try {
        const createdAt = new Date(form.createdAt || form.updatedAt);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        if (createdAt < sevenDaysAgo) {
          console.log(`🛡️  SAFETY: Skipping old form (${createdAt.toDateString()}): ${form.refKey}`);
          return false;
        }
      } catch (e) {
        console.log(`🛡️  SAFETY: Skipping form with invalid date: ${form.refKey}`);
        return false;
      }
    }

    return isTest;
  }

  // Delete a test form
  async deleteTestForm(refKey) {
    console.log(`🗑️  Deleting test form: ${refKey}`);
    
    try {
      // Properly encode the refKey to handle special characters
      const encodedRefKey = encodeURIComponent(refKey);
      const response = await this.makeRequest('DELETE', `/api/forms?refKey=${encodedRefKey}&adminKey=${this.config.adminKey}`);
      
      if (response.status === 200 && response.data.ok) {
        console.log(`✅ Successfully deleted form: ${refKey}`);
        this.deletedItems.forms.push(refKey);
        return true;
      } else {
        console.log(`⚠️  Could not delete form ${refKey}: ${response.data.error?.message || 'Unknown error'}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ Error deleting form ${refKey}: ${error.message}`);
      return false;
    }
  }

  // Clean up test forms
  async cleanupTestForms() {
    console.log('\n🧹 Starting test form cleanup...');
    
    const allForms = await this.getAllForms();
    const testForms = allForms.filter(form => this.isTestForm(form));
    
    if (testForms.length === 0) {
      console.log('✅ No test forms found to clean up');
      return;
    }

    console.log(`📋 Found ${testForms.length} test forms to clean up:`);
    testForms.forEach(form => {
      console.log(`   - ${form.refKey} (${form.title || 'No title'})`);
    });

    // Delete each test form
    for (const form of testForms) {
      await this.deleteTestForm(form.refKey);
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Clean up test submissions from Google Sheets
  async cleanupTestSubmissions() {
    console.log('\n🧹 Test submissions cleanup...');
    
    const testSheets = [
      '1nw64BTzTPMAsC4al3K0AvxWHwcpcxp9gj-jLsQIv_Kw#sheet=Sheet1',
      '1N4Qi7ouqMGQuZEe5j65uhzfd_T7NYlo5fGuGaxXyFz0#sheet=Sheet1',
    ];

    let deletedTotal = 0;
    
    for (const sheetUrl of testSheets) {
      console.log(`🗑️  Cleaning responses from sheet: ${sheetUrl}`);
      
      try {
        const response = await this.makeRequest('DELETE', `/api/responses?sheetUrl=${encodeURIComponent(sheetUrl)}&adminKey=${this.config.adminKey}`);
        
        if (response.status === 200 && response.data.ok) {
          const deletedCount = response.data.deletedCount || 0;
          console.log(`   ✅ Deleted ${deletedCount} responses from ${response.data.sheetName}`);
          deletedTotal += deletedCount;
        } else {
          console.log(`   ⚠️  Could not clean sheet responses: ${response.data.error?.message || 'Unknown error'}`);
        }
      } catch (error) {
        console.log(`   ❌ Error cleaning sheet responses: ${error.message}`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    if (deletedTotal > 0) {
      console.log(`✅ Total responses deleted: ${deletedTotal}`);
      this.deletedItems.submissions = deletedTotal;
    } else {
      console.log('ℹ️  No test responses found to delete');
    }
  }

  // Clean up test screenshots
  async cleanupTestScreenshots() {
    console.log('\n🧹 Cleaning up test screenshots...');
    
    const fs = require('fs').promises;
    const path = require('path');
    
    const screenshotDirs = [
      './tests/screenshots',
      './tests/results'
    ];

    for (const dir of screenshotDirs) {
      try {
        const dirPath = path.resolve(dir);
        const files = await fs.readdir(dirPath);
        
        // Filter for test files (screenshots, reports, etc.)
        const testFiles = files.filter(file => 
          file.match(/\.(png|jpg|jpeg|html|json)$/) && 
          file.match(/\d{13}/) // contains timestamp
        );

        if (testFiles.length > 0) {
          console.log(`📁 Cleaning ${testFiles.length} files from ${dir}`);
          
          for (const file of testFiles) {
            await fs.unlink(path.join(dirPath, file));
            console.log(`   ✅ Deleted: ${file}`);
          }
        } else {
          console.log(`✅ No test files to clean in ${dir}`);
        }
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.log(`⚠️  Error cleaning ${dir}: ${error.message}`);
        }
      }
    }
  }

  // Full cleanup process
  async performFullCleanup() {
    console.log('\n🧹=============================================');
    console.log('        TEST DATA CLEANUP UTILITY');
    console.log('=============================================');
    
    const startTime = Date.now();
    
    try {
      // Clean up forms
      await this.cleanupTestForms();
      
      // Clean up screenshots and reports
      await this.cleanupTestScreenshots();
      
      // Note about submissions
      await this.cleanupTestSubmissions();
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      // Summary
      console.log('\n✅=============================================');
      console.log('           CLEANUP SUMMARY');
      console.log('=============================================');
      console.log(`🗑️  Forms deleted: ${this.deletedItems.forms.length}`);
      if (this.deletedItems.forms.length > 0) {
        this.deletedItems.forms.forEach(form => {
          console.log(`   - ${form}`);
        });
      }
      console.log(`📊 Responses deleted: ${this.deletedItems.submissions}`);
      console.log(`⏱️  Duration: ${duration}s`);
      console.log('✅ Cleanup completed successfully!');
      
    } catch (error) {
      console.error('❌ Cleanup failed:', error.message);
      process.exit(1);
    }
  }

  // Interactive cleanup with confirmation
  async interactiveCleanup() {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const question = (prompt) => new Promise((resolve) => {
      rl.question(prompt, resolve);
    });

    console.log('\n🧹 INTERACTIVE TEST DATA CLEANUP');
    console.log('=================================');
    
    // Show what will be cleaned
    const allForms = await this.getAllForms();
    const testForms = allForms.filter(form => this.isTestForm(form));
    
    if (testForms.length > 0) {
      console.log(`\n📋 Found ${testForms.length} test forms:`);
      testForms.forEach(form => {
        console.log(`   - ${form.refKey} (${form.title || 'No title'})`);
      });
    } else {
      console.log('\n✅ No test forms found');
    }

    const confirm = await question('\n❓ Do you want to proceed with cleanup? (y/N): ');
    rl.close();

    if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
      await this.performFullCleanup();
    } else {
      console.log('❌ Cleanup cancelled');
    }
  }
}

// CLI execution
if (require.main === module) {
  const cleanup = new TestDataCleanup();
  const args = process.argv.slice(2);
  
  if (args.includes('--interactive') || args.includes('-i')) {
    cleanup.interactiveCleanup();
  } else if (args.includes('--forms-only')) {
    cleanup.cleanupTestForms();
  } else if (args.includes('--files-only')) {
    cleanup.cleanupTestScreenshots();
  } else {
    cleanup.performFullCleanup();
  }
}

module.exports = TestDataCleanup;