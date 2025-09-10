#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * E2E Test Report Manager
 * Handles opening and managing Playwright test reports
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class E2EReportManager {
  constructor() {
    this.verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
    this.reportPath = path.join(process.cwd(), 'playwright-report');
    this.reportFile = path.join(this.reportPath, 'index.html');
  }

  log(message, force = false) {
    if (this.verbose || force) {
      console.log(message);
    }
  }

  async checkReportExists() {
    try {
      await fs.promises.access(this.reportFile);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getReportStats() {
    try {
      const stats = await fs.promises.stat(this.reportFile);
      return {
        exists: true,
        size: stats.size,
        lastModified: stats.mtime,
        ageMinutes: Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60))
      };
    } catch (error) {
      return { exists: false };
    }
  }

  async openReport() {
    this.log('\n📊 Opening Playwright Test Report...');
    
    const stats = await this.getReportStats();
    
    if (!stats.exists) {
      console.error('❌ No test report found!');
      console.error('   Run tests first: npm run test:e2e:head');
      console.error('   Or: npm run test:e2e:standard');
      return false;
    }

    console.log(`📈 Report found (${(stats.size / 1024).toFixed(1)} KB, ${stats.ageMinutes} min ago)`);
    
    return new Promise((resolve, reject) => {
      // Find available port
      const basePort = 9323;
      const maxPort = basePort + 10;
      
      let port = basePort;
      const tryPort = () => {
        this.log(`   Trying port ${port}...`);
        
        const args = ['playwright', 'show-report', '--port', port.toString()];
        
        console.log(`🚀 Starting report server: npx ${args.join(' ')}`);
        console.log('   📋 The report will open in your default browser');
        console.log('   🛑 Press Ctrl+C to stop the server when done');

        const child = spawn('npx', args, {
          stdio: 'inherit',
          env: { ...process.env }
        });

        child.on('spawn', () => {
          console.log(`✅ Report server started successfully!`);
          console.log(`   🌐 URL: http://localhost:${port}`);
          console.log(`   📁 Report: ${this.reportFile}`);
          resolve(true);
        });

        child.on('error', (error) => {
          if (error.code === 'EADDRINUSE' && port < maxPort) {
            port++;
            this.log(`   Port ${port - 1} in use, trying ${port}...`);
            setTimeout(tryPort, 100);
          } else {
            console.error(`❌ Failed to start report server: ${error.message}`);
            reject(error);
          }
        });

        child.on('close', (code) => {
          if (code !== 0 && code !== null) {
            console.log(`\n📊 Report server stopped (code: ${code})`);
          } else {
            console.log(`\n📊 Report server stopped`);
          }
        });
      };
      
      tryPort();
    });
  }

  async generateFreshReport() {
    this.log('\n🔄 Generating fresh test report...');
    
    return new Promise((resolve, reject) => {
      console.log('🚀 Running E2E tests to generate fresh report...');
      
      const args = ['playwright', 'test', 'tests/e2e/standard-suite.spec.ts', '--project=chromium'];
      
      const child = spawn('npx', args, {
        stdio: 'inherit',
        env: { ...process.env, PLAYWRIGHT_HEAD: 'false' }
      });

      child.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Fresh report generated successfully!');
          resolve(true);
        } else {
          console.error(`❌ Test run failed with code ${code}`);
          reject(new Error(`Test run failed with code ${code}`));
        }
      });

      child.on('error', (error) => {
        console.error(`❌ Failed to run tests: ${error.message}`);
        reject(error);
      });
    });
  }

  async showReportInfo() {
    const stats = await this.getReportStats();
    
    console.log('📊 Playwright Test Report Status');
    console.log('=================================');
    
    if (stats.exists) {
      console.log(`✅ Report exists: ${this.reportFile}`);
      console.log(`📏 File size: ${(stats.size / 1024).toFixed(1)} KB`);
      console.log(`🕒 Last modified: ${stats.lastModified.toLocaleString()}`);
      console.log(`⏰ Age: ${stats.ageMinutes} minutes ago`);
      
      console.log('\n🎯 Available actions:');
      console.log('   📖 Open report: npm run test:e2e:report');
      console.log('   🔄 Generate fresh: npm run test:e2e:report -- --fresh');
      console.log('   📁 Report location: playwright-report/index.html');
    } else {
      console.log('❌ No report found');
      console.log('\n💡 To generate a report:');
      console.log('   🏃 Run tests: npm run test:e2e:head');
      console.log('   🔄 Generate fresh: npm run test:e2e:report -- --fresh');
    }
  }

  async run() {
    const action = process.argv[2] || 'open';
    
    try {
      switch (action) {
        case 'open':
        case 'show':
          await this.openReport();
          break;
          
        case 'fresh':
        case 'generate':
          await this.generateFreshReport();
          await this.openReport();
          break;
          
        case 'info':
        case 'status':
          await this.showReportInfo();
          break;
          
        default:
          console.log('📊 E2E Test Report Manager');
          console.log('===========================');
          console.log('Usage: node e2e-report-manager.js [action]');
          console.log('');
          console.log('Actions:');
          console.log('  open     Open existing report (default)');
          console.log('  fresh    Generate fresh report and open');
          console.log('  info     Show report status information');
          console.log('');
          console.log('Options:');
          console.log('  --verbose    Show detailed output');
          console.log('');
          console.log('Examples:');
          console.log('  npm run test:e2e:report');
          console.log('  npm run test:e2e:report -- fresh');
          console.log('  npm run test:e2e:report -- info');
      }
    } catch (error) {
      console.error('\n❌ Report Manager Error');
      console.error('========================');
      console.error(`Error: ${error.message}`);
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Ensure tests have been run at least once');
      console.error('   2. Check if Playwright is installed: npm install');
      console.error('   3. Generate fresh report: npm run test:e2e:report -- fresh');
      process.exit(1);
    }
  }
}

// Command line usage
if (require.main === module) {
  const manager = new E2EReportManager();
  manager.run();
}

module.exports = { E2EReportManager };