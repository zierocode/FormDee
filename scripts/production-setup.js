#!/usr/bin/env node

/**
 * FormDee Production Setup Script
 *
 * This script prepares the project for production deployment by:
 * - Generating secure API keys
 * - Updating environment variables
 * - Running production checks
 * - Preparing deployment configurations
 */

const { execSync } = require('child_process')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

class ProductionSetup {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..')
    this.envFile = path.join(this.projectRoot, '.env')
    this.envExampleFile = path.join(this.projectRoot, '.env.example')
    this.envProductionFile = path.join(this.projectRoot, '.env.production')
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

  generateSecureKey(length = 32) {
    return crypto.randomBytes(length).toString('base64url')
  }

  async promptForInput(question, defaultValue = '') {
    const readline = require('readline')
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    return new Promise((resolve) => {
      const prompt = defaultValue ? `${question} (${defaultValue}): ` : `${question}: `
      rl.question(prompt, (answer) => {
        rl.close()
        resolve(answer.trim() || defaultValue)
      })
    })
  }

  async generateProductionEnvironment() {
    this.log('🔧 Setting up production environment variables...', 'info')

    // Load existing environment
    const existingEnv = {}
    if (fs.existsSync(this.envFile)) {
      const envContent = fs.readFileSync(this.envFile, 'utf8')
      envContent.split('\n').forEach((line) => {
        if (line.trim() && !line.startsWith('#')) {
          const [key, ...valueParts] = line.split('=')
          if (key && valueParts.length > 0) {
            existingEnv[key.trim()] = valueParts.join('=').trim()
          }
        }
      })
    }

    // Generate new secure keys
    const newAdminApiKey = this.generateSecureKey(32)
    const newAdminUiKey = this.generateSecureKey(32)

    this.log('✅ Generated secure API keys', 'success')

    // Get production domain
    const productionDomain = await this.promptForInput(
      'Enter your production domain (e.g., https://yourdomain.com)',
      'https://your-domain.com'
    )

    // Get Supabase service role key if missing
    let serviceRoleKey = existingEnv.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey || serviceRoleKey.includes('YOUR_SERVICE_ROLE_KEY_HERE')) {
      serviceRoleKey = await this.promptForInput(
        'Enter your Supabase Service Role Key (from Supabase dashboard)',
        ''
      )
    }

    // Create production environment configuration
    const productionEnv = {
      // Core application
      NODE_ENV: 'production',
      NEXT_PUBLIC_BASE_URL: productionDomain,

      // Supabase (keep existing)
      SUPABASE_URL: existingEnv.SUPABASE_URL || 'https://your-project-id.supabase.co',
      SUPABASE_ANON_KEY: existingEnv.SUPABASE_ANON_KEY || 'your-supabase-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey || 'your-supabase-service-role-key',

      // Admin authentication (new secure keys)
      ADMIN_API_KEY: newAdminApiKey,
      ADMIN_UI_KEY: newAdminUiKey,

      // Cloudflare R2 (keep existing)
      R2_ACCOUNT_ID: existingEnv.R2_ACCOUNT_ID || '',
      R2_ACCESS_KEY_ID: existingEnv.R2_ACCESS_KEY_ID || '',
      R2_SECRET_ACCESS_KEY: existingEnv.R2_SECRET_ACCESS_KEY || '',
      R2_BUCKET_NAME: existingEnv.R2_BUCKET_NAME || '',
      R2_PUBLIC_URL: existingEnv.R2_PUBLIC_URL || '',
      NEXT_PUBLIC_R2_PUBLIC_URL: existingEnv.NEXT_PUBLIC_R2_PUBLIC_URL || '',
    }

    // Write production environment file
    const envContent = Object.entries(productionEnv)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')

    fs.writeFileSync(this.envProductionFile, envContent)
    this.log('✅ Created .env.production file', 'success')

    // Update main .env file with new keys for development
    if (fs.existsSync(this.envFile)) {
      let currentEnv = fs.readFileSync(this.envFile, 'utf8')

      // Update admin keys if they're insecure
      if (existingEnv.ADMIN_API_KEY && existingEnv.ADMIN_API_KEY.length < 32) {
        currentEnv = currentEnv.replace(/ADMIN_API_KEY=.*/, `ADMIN_API_KEY=${newAdminApiKey}`)
      }
      if (existingEnv.ADMIN_UI_KEY && existingEnv.ADMIN_UI_KEY.length < 32) {
        currentEnv = currentEnv.replace(/ADMIN_UI_KEY=.*/, `ADMIN_UI_KEY=${newAdminUiKey}`)
      }

      fs.writeFileSync(this.envFile, currentEnv)
      this.log('✅ Updated .env file with secure keys', 'success')
    }

    return productionEnv
  }

  async testProductionBuild() {
    this.log('🏗️  Testing production build...', 'info')

    try {
      // Clean previous build
      execSync('rm -rf .next', { cwd: this.projectRoot, stdio: 'pipe' })

      // Run production build
      execSync('npm run build', {
        cwd: this.projectRoot,
        stdio: 'pipe',
        env: { ...process.env, NODE_ENV: 'production' },
      })

      this.log('✅ Production build successful', 'success')
      return true
    } catch (error) {
      this.log(`❌ Production build failed: ${error.message}`, 'error')
      return false
    }
  }

  async createDockerEnvironment(prodEnv) {
    this.log('🐳 Creating Docker environment file...', 'info')

    const dockerEnv = Object.entries(prodEnv)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')

    const dockerEnvFile = path.join(this.projectRoot, '.env.docker')
    fs.writeFileSync(dockerEnvFile, dockerEnv)

    this.log('✅ Created .env.docker file', 'success')
  }

  async createDeploymentInstructions(prodEnv) {
    this.log('📋 Creating deployment instructions...', 'info')

    const instructions = `# FormDee Production Deployment Instructions

## 🔑 Generated Configuration

### Admin API Keys (KEEP SECURE!)
- Admin API Key: ${prodEnv.ADMIN_API_KEY}
- Admin UI Key: ${prodEnv.ADMIN_UI_KEY}

### Environment Files Created:
- \`.env.production\` - Complete production configuration
- \`.env.docker\` - Docker deployment configuration

## 🚀 Deployment Options

### Option 1: Docker (Recommended)
\`\`\`bash
# Quick deploy
npm run deploy:docker:auto

# Or manual
docker-compose up -d
\`\`\`

### Option 2: Vercel
\`\`\`bash
# Set environment variables in Vercel dashboard
# Then deploy
npm run deploy:vercel
\`\`\`

### Option 3: Manual Server
\`\`\`bash
# Copy .env.production to .env on server
# Then build and start
npm run build:production
npm start
\`\`\`

## 🔒 Security Checklist
- [ ] Environment variables set on production platform
- [ ] API keys are secure (32+ characters)
- [ ] HTTPS enabled with SSL certificate
- [ ] Firewall configured properly
- [ ] Database access restricted
- [ ] Regular security updates scheduled

## 📊 Monitoring
- Health check: ${prodEnv.NEXT_PUBLIC_BASE_URL}/api/health
- Form builder: ${prodEnv.NEXT_PUBLIC_BASE_URL}/builder
- Admin login with your generated keys

## 🆘 Support
- Documentation: ./docs/DEPLOYMENT.md
- Health check: \`curl ${prodEnv.NEXT_PUBLIC_BASE_URL}/api/health\`

Generated on: ${new Date().toISOString()}
`

    const instructionsFile = path.join(this.projectRoot, 'PRODUCTION_DEPLOY.md')
    fs.writeFileSync(instructionsFile, instructions)

    this.log('✅ Created PRODUCTION_DEPLOY.md with instructions', 'success')
  }

  async run() {
    try {
      this.log('🚀 Starting FormDee Production Setup...', 'info')

      // Generate production environment
      const prodEnv = await this.generateProductionEnvironment()

      // Test production build
      const buildSuccess = await this.testProductionBuild()
      if (!buildSuccess) {
        throw new Error('Production build failed - please fix build issues first')
      }

      // Create Docker environment
      await this.createDockerEnvironment(prodEnv)

      // Create deployment instructions
      await this.createDeploymentInstructions(prodEnv)

      // Final success message
      this.log('🎉 Production setup complete!', 'success')
      this.log('📁 Files created:', 'info')
      this.log('   - .env.production (production environment)', 'info')
      this.log('   - .env.docker (Docker deployment)', 'info')
      this.log('   - PRODUCTION_DEPLOY.md (deployment instructions)', 'info')

      this.log('🚀 Ready to deploy:', 'success')
      this.log('   npm run deploy:docker:auto', 'success')
      this.log('   npm run deploy:vercel', 'success')
    } catch (error) {
      this.log(`❌ Setup failed: ${error.message}`, 'error')
      process.exit(1)
    }
  }
}

// Run if called directly
if (require.main === module) {
  const setup = new ProductionSetup()
  setup.run()
}

module.exports = ProductionSetup
