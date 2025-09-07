# 🚀 FormDee Production Deployment Guide

This guide covers everything you need to deploy FormDee to production with best practices for security, performance, and reliability.

## 🚀 Quick Setup (Recommended)

### Interactive Deployment Setup Tool

For the easiest deployment experience, use our interactive setup tool:

```bash
npm run setup:deployment
```

This tool will:
- ✅ Generate secure ADMIN_API_KEY automatically (32+ characters)
- ✅ Ask for your ADMIN_UI_KEY interactively
- ✅ Collect your deployment configuration  
- ✅ Create a properly configured .env file
- ✅ Provide step-by-step Google Apps Script setup instructions
- ✅ Backup your existing .env file safely

**What you'll need:**
- Your ADMIN_UI_KEY for form builder access
- Your Google Apps Script deployment URL
- Your production domain (or choose local development)

---

## 📋 Manual Setup (Advanced Users)

### ✅ Code Quality
```bash
# Run all quality checks
npm run lint                # Code formatting check
npm run typecheck          # TypeScript validation
npm run build:production   # Production build with checks
npm run test:all:standard  # Comprehensive testing
```

### ✅ Environment Setup
- [ ] Production environment variables configured
- [ ] Google Apps Script deployed and tested
- [ ] Admin API keys generated (32+ characters)
- [ ] Production Google Sheets prepared
- [ ] File upload Google Drive folders configured

### ✅ Security Review
- [ ] API keys are strong and unique
- [ ] No sensitive data in version control
- [ ] Google Apps Script permissions verified
- [ ] HTTPS enabled for production domain
- [ ] Environment variables secured

## 🔧 Google Apps Script Deployment

### Step 1: Prepare the Script
1. **Copy the Script**:
   ```bash
   # Copy the production-ready script
   cat apps-script/Code.gs
   ```

2. **Open Google Apps Script**:
   - Navigate to [script.google.com](https://script.google.com)
   - Create new project: "FormDee Production"
   - Paste the entire contents of `Code.gs`

3. **Configure Script Properties**:
   - Go to Project Settings → Script Properties
   - Add `ADMIN_API_KEY`: Your production admin key (32+ chars)
   - Example: `prod_abcd1234567890abcd1234567890abcd`

### Step 2: Deploy the Web App
1. **Create Deployment**:
   - Click Deploy → New deployment
   - Choose type: Web app
   - Description: "FormDee Production v1.0.0"
   - Execute as: Me (your Google account)
   - Who has access: Anyone

2. **Copy Deployment URL**:
   - Save the URL (ends with `/exec`)
   - Format: `https://script.google.com/macros/s/DEPLOYMENT_ID/exec`

3. **Test the Deployment**:
   ```bash
   # Test the health endpoint
   curl -s "YOUR_DEPLOYMENT_URL" | jq
   
   # Should return: {"ok": true, "data": {"message": "FormDee GAS API", ...}}
   ```

## 🌐 Next.js Application Deployment

### Option 1: Vercel (Recommended)

#### Quick Deploy
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to production
npm run deploy:vercel
```

#### Manual Deploy
1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Production ready deployment"
   git push origin main
   ```

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Import your repository
   - Configure build settings (auto-detected)

3. **Environment Variables**:
   Add these in Vercel Project Settings → Environment Variables:
   ```
   GAS_BASE_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
   ADMIN_API_KEY=your-production-admin-key
   ADMIN_UI_KEY=your-production-ui-key
   NEXT_PUBLIC_BASE_URL=https://yourdomain.vercel.app
   ```

### Option 2: Docker Deployment

#### Automated Docker Deployment (Recommended)
```bash
# Complete automated Docker deployment
npm run deploy:docker:auto
```

**This automated script will:**
- ✅ Generate secure ADMIN_API_KEY automatically
- ✅ Ask for your ADMIN_UI_KEY interactively
- ✅ Check Docker environment
- ✅ Collect deployment configuration
- ✅ Build optimized Docker image
- ✅ Create and start production container
- ✅ Provide management commands and health check

#### Docker Compose Deployment
```bash
# First run the setup to generate .env.docker
npm run deploy:docker:auto

# Then use docker-compose for advanced setups
npm run deploy:docker:compose
```

#### Manual Docker Build
```bash
# Traditional Docker commands
npm run deploy:docker

# Or manually:
docker build -t formdee .
docker run -p 3000:3000 --env-file .env formdee
```

#### Production Docker Deployment
```bash
# Using Docker Compose
docker-compose up -d

# Check health
curl -s http://localhost:3000/api/health | jq
```

#### Cloud Deployment (AWS/GCP/Azure)
```bash
# Tag for cloud registry
docker tag formdee your-registry/formdee:1.0.0

# Push to registry
docker push your-registry/formdee:1.0.0

# Deploy to your cloud service
# (specific commands vary by provider)
```

### Option 3: Traditional Server

#### Node.js Production Server
```bash
# Build for production
npm run build:production

# Start production server
npm start

# Or with PM2 for process management
npm install -g pm2
pm2 start npm --name "formdee" -- start
pm2 save
pm2 startup
```

#### Nginx Reverse Proxy
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔒 Production Security Configuration

### Environment Variables (Production)
```env
# Google Apps Script
GAS_BASE_URL=https://script.google.com/macros/s/YOUR_PRODUCTION_ID/exec

# Strong API Keys (generate with: openssl rand -base64 32)
ADMIN_API_KEY=prod_secure_key_minimum_32_characters_long
ADMIN_UI_KEY=prod_ui_key_minimum_32_characters_long_different

# Production Domain
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

### Security Best Practices
1. **API Key Security**:
   - Use different keys for different environments
   - Minimum 32 characters length
   - Regular rotation schedule
   - Store in secure secret management

2. **Google Apps Script Security**:
   - Limit access to necessary Google services only
   - Regular permission audits
   - Monitor execution logs for suspicious activity

3. **Application Security**:
   - Enable HTTPS only
   - Configure security headers
   - Regular dependency updates
   - Monitor for security vulnerabilities

## 📊 Post-Deployment Verification

### Health Checks
```bash
# Application health
curl -s https://yourdomain.com/api/health | jq

# Google Apps Script connectivity
curl -s https://yourdomain.com/api/forms?refKey=test | jq

# Form builder access (requires admin key)
curl -H "x-admin-key: YOUR_UI_KEY" https://yourdomain.com/builder
```

### Functional Testing
1. **Form Creation**:
   - Visit `/builder`
   - Create a test form
   - Verify Google Sheets integration

2. **Form Submission**:
   - Visit `/f/your-test-form`
   - Submit test data
   - Check response sheet for data

3. **File Upload Testing**:
   - Create form with file upload field
   - Test file upload functionality
   - Verify files appear in Google Drive

### Performance Verification
```bash
# Load testing
curl -w "@curl-format.txt" -s https://yourdomain.com/

# Bundle analysis
npm run build:analyze
```

## 🚨 Troubleshooting Production Issues

### Common Issues & Solutions

#### 1. "Form not found" errors
```bash
# Check Google Apps Script deployment
curl -s "$GAS_BASE_URL?op=forms&refKey=example" | jq

# Verify environment variables
echo $GAS_BASE_URL
```

#### 2. File upload failures
- Check Google Drive folder permissions
- Verify Google Apps Script has Drive access
- Confirm folder URL format

#### 3. Performance issues
```bash
# Check Next.js build output
npm run build

# Analyze bundle size
npm run build:analyze
```

#### 4. Authentication errors
- Verify API keys match between environments
- Check Google Apps Script properties
- Confirm admin key format and length

### Monitoring & Logging

#### Application Monitoring
```javascript
// Add to your monitoring solution
fetch('/api/health')
  .then(res => res.json())
  .then(data => console.log('Health check:', data))
  .catch(err => console.error('Health check failed:', err));
```

#### Google Apps Script Monitoring
- Monitor execution transcripts in GAS console
- Set up error notifications
- Track usage quotas and limits

## 🔄 Updates & Maintenance

### Updating the Application
```bash
# 1. Update code
git pull origin main
npm install

# 2. Run quality checks
npm run build:production
npm run test:all:standard

# 3. Deploy updates
# (Follow your chosen deployment method)
```

### Updating Google Apps Script
1. Copy new version of `Code.gs`
2. Update in Google Apps Script editor
3. Create new deployment version
4. Update `GAS_BASE_URL` if deployment ID changed

### Backup Strategy
1. **Application**: Code in version control
2. **Google Sheets**: Regular exports/backups
3. **Environment Variables**: Secure documentation
4. **Deployment Configs**: Infrastructure as Code

## 📈 Scaling Considerations

### Performance Optimization
- Enable Next.js caching strategies
- Use CDN for static assets
- Implement request rate limiting
- Monitor Google Apps Script quotas

### High Availability
- Multiple deployment regions
- Load balancing
- Database replication (if migrating from Sheets)
- Monitoring and alerting

---

## ✅ Production Deployment Complete!

Your FormDee application is now production-ready with:
- 🚀 Scalable Next.js deployment
- 🔒 Enterprise-grade security
- 📊 Comprehensive monitoring
- 🧪 Tested and validated
- 📚 Complete documentation

**Need help?** Check the main [README](README.md) or create an issue on GitHub.