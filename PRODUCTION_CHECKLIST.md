# FormDee v1.3.0 - Production Deployment Checklist

## Pre-Deployment Checklist

### 1. Environment Configuration ✅

- [ ] Copy `.env.production` and fill in all production values
- [ ] Generate secure API keys (32+ characters) using `openssl rand -base64 32`
- [ ] Configure Supabase production project URL and keys
- [ ] Set up Cloudflare R2 production bucket
- [ ] Update `NEXT_PUBLIC_BASE_URL` with production domain
- [ ] Configure Google OAuth credentials (if using Google Sheets)

### 2. Security Verification ✅

- [ ] All API keys are unique and secure (32+ characters)
- [ ] Service role keys are only on server-side
- [ ] HTTPS is enabled on production domain
- [ ] CSP headers are properly configured
- [ ] Rate limiting is enabled (default: 100 req/min)
- [ ] CORS is configured for your domain only

### 3. Database Setup ✅

- [ ] Supabase tables are created (`Forms`, `Responses`)
- [ ] RLS policies are configured
- [ ] Database indexes are optimized
- [ ] Backup strategy is in place
- [ ] Connection pooling is configured

### 4. Build Verification ✅

```bash
# Run production build
npm run build:production

# Test production build locally
npm start
```

### 5. Testing ✅

```bash
# Run comprehensive test suite
npm run test:all:full

# Verify no test data in production
npm run test:cleanup
```

### 6. Performance Optimization ✅

- [ ] Bundle size optimized (check with `npm run build:analyze`)
- [ ] Images are optimized (WebP/AVIF formats)
- [ ] Static assets are cached (1 year TTL)
- [ ] Database queries are optimized
- [ ] API responses are cached where appropriate

### 7. Monitoring Setup

- [ ] Error tracking configured (e.g., Sentry)
- [ ] Analytics configured (e.g., Google Analytics)
- [ ] Uptime monitoring configured
- [ ] Log aggregation setup
- [ ] Alert notifications configured

## Deployment Options

### Option 1: Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel --prod

# Set environment variables in Vercel dashboard
# Project Settings → Environment Variables
```

### Option 2: Docker

```bash
# Automated Docker deployment
npm run deploy:docker:auto

# Or manual Docker deployment
docker build -t formdee:latest .
docker run -d -p 3000:3000 --env-file .env.production formdee:latest
```

### Option 3: Traditional Server

```bash
# Build the application
npm run build

# Start production server
NODE_ENV=production npm start
```

### Option 4: Platform-as-a-Service

- **Railway**: Connect GitHub repo, add env vars
- **Render**: Connect GitHub repo, add env vars
- **Fly.io**: Use `fly launch` and configure

## Post-Deployment Verification

### 1. Functionality Tests

- [ ] Create a test form through UI
- [ ] Submit a test response
- [ ] Verify data in Supabase
- [ ] Test file upload functionality
- [ ] Test Slack integration (if configured)
- [ ] Test Google Sheets integration (if configured)
- [ ] Test AI form generation

### 2. Security Tests

- [ ] Verify HTTPS is working
- [ ] Check security headers (use securityheaders.com)
- [ ] Test rate limiting
- [ ] Verify admin authentication
- [ ] Test CORS configuration

### 3. Performance Tests

- [ ] Page load time < 3 seconds
- [ ] API response time < 500ms
- [ ] Test under load (use tools like k6 or Apache Bench)
- [ ] Verify caching is working

### 4. Monitoring Verification

- [ ] Error tracking is capturing errors
- [ ] Analytics is tracking page views
- [ ] Logs are being collected
- [ ] Alerts are configured and working

## Production Environment Variables

```env
# Required Variables
NODE_ENV=production
NEXT_PUBLIC_BASE_URL=https://your-domain.com
ADMIN_API_KEY=[32+ char secure key]
ADMIN_UI_KEY=[32+ char secure key]
SUPABASE_URL=https://[project].supabase.co
SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-key]
R2_ACCOUNT_ID=[cloudflare-account-id]
R2_ACCESS_KEY_ID=[r2-access-key]
R2_SECRET_ACCESS_KEY=[r2-secret-key]
R2_BUCKET_NAME=[bucket-name]
R2_PUBLIC_URL=https://[r2-domain].com
NEXT_PUBLIC_R2_PUBLIC_URL=https://[r2-domain].com

# Optional Variables
RATE_LIMIT_PER_MINUTE=100
MAX_FILE_SIZE_MB=10
GENERATE_SOURCEMAP=false
```

## Rollback Plan

If issues occur after deployment:

1. **Immediate Rollback**
   - Revert to previous deployment version
   - Restore database from backup if needed

2. **Debug Production Issues**

   ```bash
   # Check production logs
   npm run docker:logs  # If using Docker
   vercel logs         # If using Vercel
   ```

3. **Emergency Contacts**
   - Technical Lead: [contact]
   - DevOps Team: [contact]
   - Database Admin: [contact]

## Security Reminders

⚠️ **NEVER**:

- Commit `.env` files with real values
- Share API keys in plain text
- Use development keys in production
- Disable HTTPS in production
- Skip security headers

✅ **ALWAYS**:

- Rotate API keys regularly
- Monitor for suspicious activity
- Keep dependencies updated
- Backup data regularly
- Test disaster recovery plan

## Support

For deployment issues:

- Check logs for errors
- Review this checklist
- Contact support team
- File issue at: https://github.com/your-repo/issues

---

**Last Updated**: v1.3.0 - Enhanced with GPT-5 support, Google Sheets integration, and comprehensive security features
