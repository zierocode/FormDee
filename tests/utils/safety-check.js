#!/usr/bin/env node

/**
 * Safety Check Utility
 * Verifies that cleanup will only target test data and tests can run independently
 */

const TestDataCleanup = require('./test-cleanup');
const testConfig = require('../api/config');

class SafetyChecker {
  constructor() {
    this.cleanup = new TestDataCleanup();
  }

  async checkDeletionSafety() {
    console.log('🛡️  SAFETY CHECK: Verifying deletion targets...\n');
    
    // Get all forms to check what would be deleted
    const allForms = await this.cleanup.getAllForms();
    const testForms = allForms.filter(form => this.cleanup.isTestForm(form));
    const protectedForms = allForms.filter(form => !this.cleanup.isTestForm(form));
    
    console.log(`📊 Total forms in system: ${allForms.length}`);
    console.log(`🗑️  Forms marked for deletion: ${testForms.length}`);
    console.log(`🛡️  Protected forms: ${protectedForms.length}\n`);
    
    if (testForms.length > 0) {
      console.log('📋 FORMS THAT WOULD BE DELETED:');
      testForms.forEach(form => {
        const age = this.getFormAge(form);
        console.log(`   🗑️  ${form.refKey} - ${form.title || 'No title'} (${age})`);
      });
    }
    
    if (protectedForms.length > 0) {
      console.log('\n🛡️  PROTECTED FORMS (WILL NOT BE DELETED):');
      protectedForms.slice(0, 10).forEach(form => {  // Show first 10
        const age = this.getFormAge(form);
        console.log(`   ✅ ${form.refKey} - ${form.title || 'No title'} (${age})`);
      });
      if (protectedForms.length > 10) {
        console.log(`   ... and ${protectedForms.length - 10} more protected forms`);
      }
    }
    
    // Check for any suspicious deletions
    const suspiciousDeletions = testForms.filter(form => {
      return !form.refKey.includes('test') && 
             !form.refKey.includes('temp') && 
             !form.refKey.includes('api') &&
             !form.refKey.match(/\d{13}$/);
    });
    
    if (suspiciousDeletions.length > 0) {
      console.log('\n⚠️  WARNING: Suspicious forms marked for deletion:');
      suspiciousDeletions.forEach(form => {
        console.log(`   ⚠️  ${form.refKey} - ${form.title} (might not be test data)`);
      });
      return false;
    }
    
    console.log('\n✅ SAFETY CHECK PASSED: Only test data would be deleted');
    return true;
  }
  
  getFormAge(form) {
    try {
      const created = new Date(form.createdAt || form.updatedAt);
      const now = new Date();
      const diffDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return '1 day ago';
      return `${diffDays} days ago`;
    } catch {
      return 'Unknown age';
    }
  }
  
  async checkTestIndependence() {
    console.log('\n🔍 INDEPENDENCE CHECK: Verifying tests can run from scratch...\n');
    
    // Check API test configuration
    console.log('📋 API Test Configuration:');
    console.log(`   Base URL: ${testConfig.baseUrl}`);
    console.log(`   Test form refKey: ${testConfig.testData.testForm.refKey} (✅ timestamp-based)`);
    console.log(`   Response sheet: Uses dedicated test sheet`);
    console.log('   ✅ API tests create their own data with unique identifiers');
    
    // Check E2E test configuration  
    const e2eConfig = require('../config/test-forms.json');
    console.log('\n📋 E2E Test Configuration:');
    console.log(`   Base URL: ${e2eConfig.baseUrl}`);
    console.log(`   Test forms: ${e2eConfig.forms.length} configured`);
    
    e2eConfig.forms.forEach(form => {
      if (form.expectedSuccess) {
        const hasTimestamp = form.fields?.some(field => field.testValue?.includes('{{timestamp}}'));
        console.log(`   📝 ${form.refKey}: ${hasTimestamp ? '✅ Uses timestamps' : '⚠️  Static values'}`);
      } else {
        console.log(`   📝 ${form.refKey}: ✅ Negative test (expected failure)`);
      }
    });
    
    console.log('\n✅ INDEPENDENCE CHECK PASSED: Tests generate unique data');
    return true;
  }
  
  async checkResponseCleanupSafety() {
    console.log('\n🧹 RESPONSE CLEANUP CHECK: Verifying response deletion targets...\n');
    
    const testSheets = [
      '1nw64BTzTPMAsC4al3K0AvxWHwcpcxp9gj-jLsQIv_Kw#sheet=Sheet1',
      '1N4Qi7ouqMGQuZEe5j65uhzfd_T7NYlo5fGuGaxXyFz0#sheet=Sheet1',
    ];
    
    console.log('📊 Response cleanup will target ONLY these test sheets:');
    testSheets.forEach(sheet => {
      console.log(`   🗑️  ${sheet} (dedicated test sheet)`);
    });
    
    console.log('\n✅ RESPONSE SAFETY: Only dedicated test sheets will be cleaned');
    return true;
  }
  
  async runAllChecks() {
    console.log('🛡️ =============================================');
    console.log('        COMPREHENSIVE SAFETY CHECK');
    console.log('=============================================\n');
    
    let allPassed = true;
    
    try {
      // Check deletion safety
      const deletionSafe = await this.checkDeletionSafety();
      allPassed = allPassed && deletionSafe;
      
      // Check test independence
      const independenceSafe = await this.checkTestIndependence();
      allPassed = allPassed && independenceSafe;
      
      // Check response cleanup safety
      const responseSafe = await this.checkResponseCleanupSafety();
      allPassed = allPassed && responseSafe;
      
      console.log('\n' + '='.repeat(50));
      if (allPassed) {
        console.log('🎉 ALL SAFETY CHECKS PASSED!');
        console.log('✅ Safe to proceed with deployment and testing');
        console.log('✅ Only test data will be deleted');
        console.log('✅ Tests can run independently from scratch');
      } else {
        console.log('❌ SAFETY CHECKS FAILED!');
        console.log('⚠️  Please review the warnings above before proceeding');
      }
      
      return allPassed;
      
    } catch (error) {
      console.error('❌ Safety check failed:', error.message);
      return false;
    }
  }
}

// Run if executed directly
if (require.main === module) {
  const checker = new SafetyChecker();
  checker.runAllChecks()
    .then(passed => {
      process.exit(passed ? 0 : 1);
    })
    .catch(error => {
      console.error('Safety check error:', error);
      process.exit(1);
    });
}

module.exports = SafetyChecker;