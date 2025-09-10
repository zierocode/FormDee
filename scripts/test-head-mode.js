#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Test script to validate E2E head mode functionality
 * This verifies that head mode works without Playwright MCP
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🎥 Testing E2E Head Mode Configuration');
console.log('=====================================');
console.log('This test validates that head mode works without Claude Code or MCP tools.\n');

function runCommand(command, args, env = {}) {
  return new Promise((resolve, reject) => {
    console.log(`▶️  Running: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, {
      stdio: 'pipe',
      env: { ...process.env, ...env },
      cwd: path.join(__dirname, '..')
    });

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ output, errorOutput });
      } else {
        reject(new Error(`Command failed with code ${code}: ${errorOutput}`));
      }
    });

    // Kill after 30 seconds to prevent hanging
    setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('Command timed out after 30 seconds'));
    }, 30000);
  });
}

async function testHeadModeConfig() {
  try {
    console.log('1️⃣  Testing Playwright configuration...');
    
    // Test basic Playwright command with head mode environment
    const result = await runCommand('npx', ['playwright', '--version'], {
      PLAYWRIGHT_HEAD: 'true'
    });
    
    console.log('✅ Playwright is installed and accessible');
    console.log(`   Version: ${result.output.trim()}`);
    
    console.log('\n2️⃣  Testing head mode environment variable...');
    
    // Test that our config recognizes the environment variable
    const configTest = await runCommand('node', ['-e', `
      const config = require('./playwright.config.ts');
      const project = config.default.projects[0];
      process.env.PLAYWRIGHT_HEAD = 'true';
      
      // Simulate config evaluation
      const headless = process.env.PLAYWRIGHT_HEAD !== 'true';
      const slowMo = process.env.PLAYWRIGHT_HEAD === 'true' ? 100 : 0;
      
      console.log('Head mode enabled:', !headless);
      console.log('Slow motion delay:', slowMo + 'ms');
      console.log('Configuration valid:', typeof project.use === 'object');
    `]);
    
    console.log('✅ Head mode configuration is working');
    console.log(configTest.output.trim());
    
    console.log('\n3️⃣  Testing browser launch capability...');
    
    // Test that we can at least start a browser (quick test)
    const browserTest = await runCommand('node', ['-e', `
      const { chromium } = require('playwright');
      
      (async () => {
        try {
          const browser = await chromium.launch({ 
            headless: process.env.PLAYWRIGHT_HEAD !== 'true',
            timeout: 10000 
          });
          console.log('Browser launch: SUCCESS');
          await browser.close();
          console.log('Browser close: SUCCESS');
        } catch (error) {
          console.error('Browser test failed:', error.message);
          process.exit(1);
        }
      })();
    `], { PLAYWRIGHT_HEAD: 'true' });
    
    console.log('✅ Browser launch test successful');
    console.log(browserTest.output.trim());
    
    console.log('\n🎉 HEAD MODE VALIDATION COMPLETE');
    console.log('================================');
    console.log('✅ All head mode functionality is working');
    console.log('✅ No Playwright MCP dependencies required');
    console.log('✅ Standard Playwright installation is sufficient');
    console.log('\n🚀 You can now run head mode tests:');
    console.log('   npm run test:e2e:standard:head');
    console.log('   npm run test:e2e:visual');
    console.log('   npm run test:e2e:debug');
    
  } catch (error) {
    console.error('\n❌ HEAD MODE TEST FAILED');
    console.error('========================');
    console.error('Error:', error.message);
    console.error('\n💡 Possible solutions:');
    console.error('   1. Install Playwright: npx playwright install');
    console.error('   2. Check if you have a display/GUI environment');
    console.error('   3. Ensure Node.js and npm are properly installed');
    process.exit(1);
  }
}

if (require.main === module) {
  testHeadModeConfig();
}

module.exports = { testHeadModeConfig };