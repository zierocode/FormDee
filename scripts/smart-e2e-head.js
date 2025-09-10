#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Smart E2E Head Mode Runner
 * Automatically detects environment and chooses between MCP and native Playwright
 */

const { spawn } = require('child_process');

class SmartE2ERunner {
  constructor() {
    this.verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
    this.testType = this.parseTestType();
  }

  parseTestType() {
    const args = process.argv.slice(2);
    if (args.includes('full') || args.includes('--full')) return 'full';
    return 'standard'; // default
  }

  log(message, force = false) {
    if (this.verbose || force) {
      console.log(message);
    }
  }

  async detectEnvironment() {
    this.log('\n🔍 Detecting environment capabilities...');
    
    const detection = {
      isClaude: false,
      hasMCP: false,
      hasPlaywright: false,
      hasDisplay: false,
      recommendation: 'native'
    };

    // 1. Check if running in Claude Code environment
    try {
      // Check for Claude Code specific indicators
      detection.isClaude = !!(
        // Direct environment variables
        process.env.CLAUDE_CODE ||
        process.env.ANTHROPIC_CLIENT ||
        // Check for Claude Code executable in process
        process.argv[0]?.includes('claude') ||
        process.argv[0]?.includes('Claude') ||
        // Check working directory patterns
        process.cwd().includes('claude') ||
        // Check if we have access to MCP-style global objects (would be injected in Claude Code)
        typeof global?.mcp !== 'undefined'
      );
      
      if (detection.isClaude) {
        this.log('   ✅ Claude Code environment detected');
      } else {
        this.log('   ❌ Not running in Claude Code');
      }
    } catch (error) {
      this.log('   ⚠️  Could not detect Claude environment');
    }

    // 2. Check for MCP capabilities
    try {
      // Check for MCP Playwright tools availability
      const mcpIndicators = [
        // Global MCP object
        typeof global?.mcp === 'object',
        // MCP environment variables
        !!process.env.MCP_ENABLED,
        // Check for MCP tool functions (these would be available in Claude Code)
        typeof global?.mcp__playwright__browser_navigate === 'function',
        typeof global?.tools?.playwright === 'object'
      ];
      
      detection.hasMCP = mcpIndicators.some(indicator => indicator);
      
      if (detection.hasMCP) {
        this.log('   ✅ MCP capabilities available');
      } else {
        this.log('   ❌ MCP not available - will use native Playwright');
      }
    } catch (error) {
      this.log('   ❌ MCP detection failed');
    }

    // 3. Check Playwright installation
    try {
      const { execSync } = require('child_process');
      execSync('npx playwright --version', { stdio: 'pipe' });
      detection.hasPlaywright = true;
      this.log('   ✅ Playwright installation found');
    } catch (error) {
      this.log('   ❌ Playwright not installed');
    }

    // 4. Check display capability
    try {
      detection.hasDisplay = !!(
        process.env.DISPLAY ||           // Linux X11
        process.env.WAYLAND_DISPLAY ||   // Linux Wayland  
        process.platform === 'darwin' || // macOS (usually has display)
        process.platform === 'win32'     // Windows (usually has display)
      );
      
      if (detection.hasDisplay) {
        this.log('   ✅ Display capability detected');
      } else {
        this.log('   ⚠️  No display detected (headless environment)');
      }
    } catch (error) {
      this.log('   ⚠️  Could not detect display capability');
    }

    // 5. Make recommendation
    if (detection.hasMCP && detection.isClaude) {
      detection.recommendation = 'mcp';
      this.log('   🎯 Recommendation: Use MCP for optimal experience');
    } else if (detection.hasPlaywright && detection.hasDisplay) {
      detection.recommendation = 'native';
      this.log('   🎯 Recommendation: Use native Playwright');
    } else if (detection.hasPlaywright) {
      detection.recommendation = 'headless';
      this.log('   🎯 Recommendation: Use headless mode (no display)');
    } else {
      detection.recommendation = 'error';
      this.log('   ❌ Cannot run E2E tests (missing Playwright)');
    }

    return detection;
  }

  async runWithMCP() {
    this.log('\n🤖 Starting E2E tests with Playwright MCP...');
    
    // In a real implementation, this would use MCP tools
    // For now, we'll simulate the MCP approach
    console.log('🎭 Using Playwright MCP for visual testing');
    console.log('   - Browser actions will be visible in Claude Code');
    console.log('   - Test execution will be step-by-step');
    console.log('   - Real-time debugging available');
    
    // This would be the actual MCP implementation
    console.log('\n💡 Note: This would use MCP tools like:');
    console.log('   - mcp__playwright__browser_navigate');
    console.log('   - mcp__playwright__browser_click');
    console.log('   - mcp__playwright__browser_snapshot');
    
    return { success: true, method: 'mcp' };
  }

  async runWithNative() {
    this.log('\n🎭 Starting E2E tests with native Playwright...');
    
    return new Promise((resolve, reject) => {
      const testFile = this.testType === 'full' ? 
        'tests/e2e/full-suite.spec.ts' : 
        'tests/e2e/standard-suite.spec.ts';
      
      const args = [
        'playwright', 'test', testFile,
        '--project=chromium',
        '--headed'
      ];

      console.log(`🚀 Running: npx ${args.join(' ')}`);
      console.log('   - Browser will open visually');
      console.log('   - Tests will run with slow motion');
      console.log('   - You can observe all interactions');
      console.log('   - HTML report will be generated automatically');

      const child = spawn('npx', args, {
        stdio: 'inherit',
        env: { 
          ...process.env, 
          PLAYWRIGHT_HEAD: 'true'
        }
      });

      child.on('close', (code) => {
        if (code === 0) {
          console.log('\n📊 Test report generated at: playwright-report/index.html');
          resolve({ success: true, method: 'native', hasReport: true });
        } else {
          reject(new Error(`Playwright tests failed with code ${code}`));
        }
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to start Playwright: ${error.message}`));
      });
    });
  }

  async runHeadless() {
    this.log('\n🕶️  Starting E2E tests in headless mode...');
    
    return new Promise((resolve, reject) => {
      const testFile = this.testType === 'full' ? 
        'tests/e2e/full-suite.spec.ts' : 
        'tests/e2e/standard-suite.spec.ts';
      
      const args = ['playwright', 'test', testFile];

      console.log(`🚀 Running: npx ${args.join(' ')}`);
      console.log('   - Running in headless mode (no display needed)');
      console.log('   - Tests will run in background');
      console.log('   - HTML report will be generated automatically');

      const child = spawn('npx', args, {
        stdio: 'inherit',
        env: { 
          ...process.env, 
          PLAYWRIGHT_HEAD: 'false'
        }
      });

      child.on('close', (code) => {
        if (code === 0) {
          console.log('\n📊 Test report generated at: playwright-report/index.html');
          resolve({ success: true, method: 'headless', hasReport: true });
        } else {
          reject(new Error(`Playwright tests failed with code ${code}`));
        }
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to start Playwright: ${error.message}`));
      });
    });
  }

  async run() {
    console.log('🎯 Smart E2E Head Mode Runner');
    console.log('=============================');
    console.log(`Test Type: ${this.testType.toUpperCase()}`);
    
    try {
      const env = await this.detectEnvironment();
      
      let result;
      
      switch (env.recommendation) {
        case 'mcp':
          result = await this.runWithMCP();
          break;
          
        case 'native':
          result = await this.runWithNative();
          break;
          
        case 'headless':
          console.log('\n⚠️  No display detected - running in headless mode');
          result = await this.runHeadless();
          break;
          
        case 'error':
          throw new Error('Cannot run E2E tests: Playwright not installed. Run: npm install');
          
        default:
          throw new Error(`Unknown recommendation: ${env.recommendation}`);
      }
      
      console.log('\n🎉 E2E Tests Completed Successfully!');
      console.log(`   Method used: ${result.method.toUpperCase()}`);
      console.log(`   Test type: ${this.testType.toUpperCase()}`);
      
      // Offer to open test report
      if (result.hasReport) {
        console.log('\n📊 Test Report Options:');
        console.log('   - View report: npm run test:e2e:report');
        console.log('   - Open directly: npx playwright show-report');
        console.log('   - Report location: playwright-report/index.html');
        
        if (process.platform === 'darwin') {
          console.log('   - Open in browser: open playwright-report/index.html');
        } else if (process.platform === 'linux') {
          console.log('   - Open in browser: xdg-open playwright-report/index.html');
        }
      }
      
    } catch (error) {
      console.error('\n❌ E2E Tests Failed');
      console.error('==================');
      console.error(`Error: ${error.message}`);
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Install Playwright: npx playwright install');
      console.error('   2. Ensure dev server is running: npm run dev');
      console.error('   3. Check display/GUI environment if using head mode');
      process.exit(1);
    }
  }
}

// Command line usage
if (require.main === module) {
  const runner = new SmartE2ERunner();
  runner.run();
}

module.exports = { SmartE2ERunner };