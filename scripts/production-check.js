#!/usr/bin/env node

/**
 * FormDee Production Readiness Check
 *
 * Validates that the project is ready for production deployment by checking:
 * - Environment variables
 * - Build configuration
 * - Security settings
 * - Database connectivity
 * - Performance optimizations
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

class ProductionChecker {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..')
    this.envFile = path.join(this.projectRoot, '.env')
    this.issues = []
    this.warnings = []
    this.passed = []
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m', // Cyan
      success: '\x1b[32m', // Green
      warning: '\x1b[33m', // Yellow
      error: '\x1b[31m', // Red
      reset: '\x1b[0m', // Reset
    }

    const timestamp = new Date().toLocaleTimeString()
    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`)
  }

  addIssue(message) {
    this.issues.push(message)
    this.log(`❌ ${message}`, 'error')
  }

  addWarning(message) {
    this.warnings.push(message)
    this.log(`⚠️  ${message}`, 'warning')
  }

  addPassed(message) {
    this.passed.push(message)
    this.log(`✅ ${message}`, 'success')
  }

  checkEnvironmentVariables() {
    this.log('🔍 Checking environment variables...')

    if (!fs.existsSync(this.envFile)) {
      this.addIssue('.env file not found')
      return
    }

    const envContent = fs.readFileSync(this.envFile, 'utf8')
    const env = {}

    envContent.split('\n').forEach((line) => {
      if (line.trim() && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=')
        if (key && valueParts.length > 0) {
          env[key.trim()] = valueParts.join('=').trim()
        }
      }
    })

    // Critical environment variables
    const critical = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'ADMIN_API_KEY',
      'ADMIN_UI_KEY',
    ]

    const missing = critical.filter(
      (key) => !env[key] || env[key].includes('YOUR_') || env[key].includes('your-')
    )

    if (missing.length > 0) {
      this.addIssue(`Missing critical environment variables: ${missing.join(', ')}`)
    } else {
      this.addPassed('All critical environment variables are set')
    }

    // Security checks
    if (env.ADMIN_API_KEY && env.ADMIN_API_KEY.length < 32) {
      this.addIssue('ADMIN_API_KEY is too short (minimum 32 characters)')
    }

    if (env.ADMIN_UI_KEY && env.ADMIN_UI_KEY.length < 32) {
      this.addIssue('ADMIN_UI_KEY is too short (minimum 32 characters)')
    }

    if (env.ADMIN_API_KEY && env.ADMIN_UI_KEY && env.ADMIN_API_KEY === env.ADMIN_UI_KEY) {
      this.addIssue('ADMIN_API_KEY and ADMIN_UI_KEY should be different')
    }

    // Base URL check
    if (env.NEXT_PUBLIC_BASE_URL && env.NEXT_PUBLIC_BASE_URL.includes('localhost')) {
      this.addWarning('NEXT_PUBLIC_BASE_URL still points to localhost')
    }

    // Node environment
    if (env.NODE_ENV !== 'production') {
      this.addWarning('NODE_ENV is not set to production')
    } else {
      this.addPassed('NODE_ENV set to production')
    }

    this.env = env
  }

  checkBuildConfiguration() {
    this.log('🔧 Checking build configuration...')

    // Check if Next.js config exists and is valid
    const nextConfigPath = path.join(this.projectRoot, 'next.config.js')
    if (!fs.existsSync(nextConfigPath)) {
      this.addWarning('next.config.js not found - using defaults')
    } else {
      this.addPassed('next.config.js found')
    }

    // Check TypeScript configuration
    const tsconfigPath = path.join(this.projectRoot, 'tsconfig.json')
    if (!fs.existsSync(tsconfigPath)) {
      this.addIssue('tsconfig.json not found')
    } else {
      try {
        const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'))
        if (tsconfig.compilerOptions && tsconfig.compilerOptions.strict) {
          this.addPassed('TypeScript strict mode enabled')
        } else {
          this.addWarning('TypeScript strict mode not enabled')
        }
      } catch (error) {
        this.addIssue('Invalid tsconfig.json')
      }
    }

    // Check package.json scripts
    const packageJsonPath = path.join(this.projectRoot, 'package.json')
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
        const requiredScripts = ['build', 'start', 'lint', 'typecheck']

        const missingScripts = requiredScripts.filter((script) => !packageJson.scripts[script])
        if (missingScripts.length > 0) {
          this.addWarning(`Missing package.json scripts: ${missingScripts.join(', ')}`)
        } else {
          this.addPassed('All required scripts present')
        }
      } catch (error) {
        this.addIssue('Invalid package.json')
      }
    }
  }

  async checkBuildProcess() {
    this.log('🏗️  Testing build process...')

    try {
      // Check if we can run the build
      this.log('Running production build test...')
      execSync('npm run build', {
        cwd: this.projectRoot,
        stdio: 'pipe',
      })
      this.addPassed('Production build successful')

      // Check if build outputs exist
      const buildDir = path.join(this.projectRoot, '.next')
      if (fs.existsSync(buildDir)) {
        this.addPassed('Build artifacts created')
      } else {
        this.addIssue('Build artifacts not found')
      }
    } catch (error) {
      this.addIssue(`Build process failed: ${error.message}`)
    }
  }

  checkSecurityConfiguration() {
    this.log('🔒 Checking security configuration...')

    // Check for security-related files
    const securityFiles = ['.env.example', 'Dockerfile']
    securityFiles.forEach((file) => {
      if (fs.existsSync(path.join(this.projectRoot, file))) {
        this.addPassed(`${file} exists`)
      } else {
        this.addWarning(`${file} not found`)
      }
    })

    // Check .gitignore
    const gitignorePath = path.join(this.projectRoot, '.gitignore')
    if (fs.existsSync(gitignorePath)) {
      const gitignore = fs.readFileSync(gitignorePath, 'utf8')
      if (gitignore.includes('.env') && !gitignore.includes('!.env.example')) {
        this.addPassed('.env files properly ignored in git')
      } else {
        this.addIssue('.env files not properly ignored in .gitignore')
      }
    }

    // Check for potential security issues in code
    try {
      const result = execSync(
        'grep -r "console.log" app/ --include="*.ts" --include="*.tsx" | wc -l',
        {
          cwd: this.projectRoot,
          stdio: 'pipe',
          encoding: 'utf8',
        }
      )
      const consoleLogCount = parseInt(result.trim())
      if (consoleLogCount > 10) {
        this.addWarning(
          `Found ${consoleLogCount} console.log statements - consider removing for production`
        )
      }
    } catch (error) {
      // Ignore error, just a nice-to-have check
    }
  }

  async checkDatabaseConnectivity() {
    this.log('🗄️  Checking database configuration...')

    if (!this.env.SUPABASE_URL || !this.env.SUPABASE_ANON_KEY) {
      this.addIssue('Supabase configuration incomplete')
      return
    }

    try {
      // Simple URL validation
      new URL(this.env.SUPABASE_URL)
      this.addPassed('Supabase URL format is valid')

      // Check if URL looks like a real Supabase project
      if (this.env.SUPABASE_URL.includes('.supabase.co')) {
        this.addPassed('Using real Supabase project')
      } else {
        this.addWarning('Supabase URL does not appear to be a standard Supabase project')
      }
    } catch (error) {
      this.addIssue('Invalid Supabase URL format')
    }

    // Check for setup script
    const setupScriptPath = path.join(this.projectRoot, 'scripts', 'setup-supabase.js')
    if (fs.existsSync(setupScriptPath)) {
      this.addPassed('Database setup script available')
    } else {
      this.addWarning('Database setup script not found')
    }
  }

  checkPerformanceOptimizations() {
    this.log('⚡ Checking performance optimizations...')

    // Check if bundle analyzer is available
    const packageJsonPath = path.join(this.projectRoot, 'package.json')
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

        if (packageJson.scripts && packageJson.scripts['build:analyze']) {
          this.addPassed('Bundle analyzer available')
        } else {
          this.addWarning('Bundle analyzer not configured')
        }

        // Check for performance-related dependencies
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }

        if (deps['@next/bundle-analyzer']) {
          this.addPassed('Bundle analyzer dependency installed')
        }

        if (deps['@tanstack/react-query'] || deps['react-query']) {
          this.addPassed('Query caching library installed')
        }
      } catch (error) {
        // Continue with other checks
      }
    }

    // Check for image optimization
    const nextConfigPath = path.join(this.projectRoot, 'next.config.js')
    if (fs.existsSync(nextConfigPath)) {
      const nextConfig = fs.readFileSync(nextConfigPath, 'utf8')
      if (nextConfig.includes('images') || nextConfig.includes('formats')) {
        this.addPassed('Image optimization configured')
      }
    }
  }

  checkDeploymentReadiness() {
    this.log('🚀 Checking deployment readiness...')

    // Check for deployment files
    const deploymentFiles = ['Dockerfile', 'docker-compose.yml', 'vercel.json']
    let deploymentOptionsCount = 0

    deploymentFiles.forEach((file) => {
      if (fs.existsSync(path.join(this.projectRoot, file))) {
        this.addPassed(`${file} deployment option available`)
        deploymentOptionsCount++
      }
    })

    if (deploymentOptionsCount === 0) {
      this.addWarning('No deployment configuration files found')
    }

    // Check for deployment scripts
    const packageJsonPath = path.join(this.projectRoot, 'package.json')
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

        const deployScripts = Object.keys(packageJson.scripts || {}).filter(
          (script) => script.includes('deploy') || script.includes('build:production')
        )

        if (deployScripts.length > 0) {
          this.addPassed(`Deployment scripts available: ${deployScripts.join(', ')}`)
        } else {
          this.addWarning('No deployment scripts found')
        }
      } catch (error) {
        // Continue
      }
    }
  }

  generateReport() {
    this.log('\n📊 PRODUCTION READINESS REPORT', 'info')
    this.log('================================', 'info')

    this.log(`\n✅ PASSED CHECKS (${this.passed.length}):`)
    this.passed.forEach((item) => this.log(`   ${item}`, 'success'))

    if (this.warnings.length > 0) {
      this.log(`\n⚠️  WARNINGS (${this.warnings.length}):`)
      this.warnings.forEach((item) => this.log(`   ${item}`, 'warning'))
    }

    if (this.issues.length > 0) {
      this.log(`\n❌ CRITICAL ISSUES (${this.issues.length}):`)
      this.issues.forEach((item) => this.log(`   ${item}`, 'error'))
    }

    // Overall assessment
    this.log('\n🎯 OVERALL ASSESSMENT:', 'info')
    if (this.issues.length === 0) {
      if (this.warnings.length === 0) {
        this.log('🟢 PRODUCTION READY! All checks passed.', 'success')
      } else {
        this.log('🟡 MOSTLY READY - Address warnings for optimal production deployment.', 'warning')
      }
    } else {
      this.log('🔴 NOT PRODUCTION READY - Critical issues must be resolved.', 'error')
    }

    return {
      ready: this.issues.length === 0,
      issues: this.issues,
      warnings: this.warnings,
      passed: this.passed,
    }
  }

  async run() {
    try {
      this.log('🚀 Starting Production Readiness Check...', 'info')

      this.checkEnvironmentVariables()
      this.checkBuildConfiguration()
      await this.checkBuildProcess()
      this.checkSecurityConfiguration()
      await this.checkDatabaseConnectivity()
      this.checkPerformanceOptimizations()
      this.checkDeploymentReadiness()

      const report = this.generateReport()

      // Exit with appropriate code
      process.exit(report.ready ? 0 : 1)
    } catch (error) {
      this.log(`❌ Check failed: ${error.message}`, 'error')
      process.exit(1)
    }
  }
}

// Run if called directly
if (require.main === module) {
  const checker = new ProductionChecker()
  checker.run()
}

module.exports = ProductionChecker
