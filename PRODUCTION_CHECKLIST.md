# 🚀 FormDee v1.1 - Production Deployment Checklist

## ✅ Pre-Deployment Requirements

### 1. Google Apps Script Setup
- [ ] Deploy the Apps Script code from `/apps-script/Code.gs` to Google Apps Script
- [ ] Set the `ADMIN_API_KEY` in Script Properties (min 32 characters)
- [ ] Deploy as Web App with:
  - Execute as: **Me**
  - Who has access: **Anyone**
- [ ] Copy the deployment URL for `GAS_BASE_URL`
- [ ] Test the deployment with: `curl YOUR_GAS_URL?op=health`

### 2. Environment Configuration
- [ ] Copy `.env.example` to `.env.production`
- [ ] Generate secure keys (32+ characters):
  ```bash
  # Generate ADMIN_API_KEY
  openssl rand -base64 32
  
  # Generate ADMIN_UI_KEY
  openssl rand -base64 32
  ```
- [ ] Update environment variables:
  - `GAS_BASE_URL`: Your Google Apps Script deployment URL
  - `ADMIN_API_KEY`: Same key as in Script Properties
  - `ADMIN_UI_KEY`: Your secure UI access key
  - `NEXT_PUBLIC_BASE_URL`: Your production domain

### 3. Google Sheets Setup
- [ ] Create or identify your Master Google Sheet
- [ ] Ensure the Apps Script has edit access to the sheet
- [ ] The script will automatically create:
  - `Forms` tab for form configurations
  - `Settings` tab for AI configuration

### 4. AI Configuration (Optional)
- [ ] Obtain API key from your AI provider (e.g., OpenAI)
- [ ] Configure through Settings page after deployment
- [ ] Test the API key before saving

## 🏗️ Build & Deployment

### Option 1: Vercel Deployment (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod

# Set environment variables in Vercel Dashboard
# Project Settings → Environment Variables
```

### Option 2: Docker Deployment
```bash
# Use the automated deployment script
npm run deploy:docker:auto

# Or manually:
docker build -t formdee:latest .
docker run -d -p 3000:3000 --env-file .env.production formdee:latest
```

### Option 3: Traditional Server Deployment
```bash
# Build the production bundle
npm run build:production

# Start the production server
npm start

# Or use PM2 for process management
npm install -g pm2
pm2 start npm --name "formdee" -- start
pm2 save
pm2 startup
```

### Option 4: Platform-Specific Deployment

#### Netlify
```bash
# Build command
npm run build

# Publish directory
.next

# Environment variables: Set in Netlify Dashboard
```

#### Railway
```bash
# Connect GitHub repo
# Set environment variables in Railway Dashboard
# Deploy automatically on push
```

## 🔍 Post-Deployment Verification

### 1. Health Checks
- [ ] Application health: `https://yourdomain.com/api/health`
- [ ] Google Apps Script: `curl YOUR_GAS_URL?op=health`
- [ ] Authentication: Try logging in with your `ADMIN_UI_KEY`

### 2. Functionality Tests
- [ ] **Authentication**
  - Login with admin key
  - Verify session persistence
  - Test logout functionality

- [ ] **Form Builder**
  - Create a test form
  - Add various field types
  - Configure Google Sheet for responses
  - Save and verify in master sheet

- [ ] **AI Features** (if configured)
  - Navigate to Settings
  - Configure AI model and API key
  - Test configuration
  - Try "Create by AI" feature

- [ ] **Form Submission**
  - Access public form via `/f/[refKey]`
  - Submit test data
  - Verify data in Google Sheet
  - Check timestamp and metadata

- [ ] **File Upload** (if using)
  - Test file upload field
  - Verify files in Google Drive
  - Check file permissions

## 🔒 Security Checklist

- [ ] Environment variables are properly set (not exposed)
- [ ] HTTPS is enabled (SSL certificate active)
- [ ] Admin keys are strong (32+ characters)
- [ ] Different keys for dev/staging/production
- [ ] CORS settings are appropriate
- [ ] Rate limiting is configured (if needed)
- [ ] Error messages don't expose sensitive info
- [ ] Logs don't contain sensitive data

## 📊 Performance Optimization

- [ ] Enable Next.js compression
- [ ] Configure CDN (Cloudflare, Fastly, etc.)
- [ ] Set appropriate cache headers
- [ ] Enable image optimization
- [ ] Monitor bundle size: `npm run build:analyze`

## 🔄 Backup & Recovery

- [ ] Document Google Sheet IDs
- [ ] Backup form configurations
- [ ] Export important response data
- [ ] Document deployment process
- [ ] Keep deployment scripts updated

## 📈 Monitoring & Maintenance

### Setup Monitoring
- [ ] Application uptime monitoring (UptimeRobot, Pingdom)
- [ ] Error tracking (Sentry, Rollbar)
- [ ] Analytics (Google Analytics, Plausible)
- [ ] Performance monitoring (Web Vitals)

### Regular Maintenance
- [ ] Weekly: Check error logs
- [ ] Monthly: Review form submissions
- [ ] Quarterly: Update dependencies
- [ ] Annually: Rotate API keys

## 🚨 Troubleshooting Guide

### Common Issues & Solutions

1. **"Failed to fetch forms"**
   - Check `GAS_BASE_URL` is correct
   - Verify `ADMIN_API_KEY` matches Script Properties
   - Ensure Apps Script is deployed as Web App

2. **"Authentication failed"**
   - Verify `ADMIN_UI_KEY` is set correctly
   - Check cookie settings for production domain
   - Clear browser cookies and retry

3. **"Cannot save to Google Sheet"**
   - Verify Apps Script has edit permissions
   - Check sheet URL format is correct
   - Ensure sheet is not protected/locked

4. **"AI generation not working"**
   - Check Settings configuration
   - Verify API key is valid
   - Test with the Test Configuration button
   - Check API provider status

5. **"File upload fails"**
   - Verify Google Drive permissions
   - Check file size limits
   - Ensure upload folder exists

## 📝 Final Checklist

- [ ] All environment variables configured
- [ ] Production build successful
- [ ] Health checks passing
- [ ] Core features tested
- [ ] Security measures in place
- [ ] Monitoring configured
- [ ] Documentation updated
- [ ] Team trained on system

## 🎉 Launch Ready!

Once all items are checked, your FormDee v1.1 installation is production-ready!

### Support Resources
- GitHub Issues: Report bugs or request features
- Documentation: `/CLAUDE.md` for detailed technical info
- Deployment Guide: `/DEPLOYMENT_GUIDE.md` for platform-specific instructions

### Quick Commands Reference
```bash
# Production build
npm run build:production

# Start production server
npm start

# Run tests
npm test

# Check deployment
curl https://yourdomain.com/api/health
```

---
*Last Updated: FormDee v1.1.0 - AI-Powered Form Builder*