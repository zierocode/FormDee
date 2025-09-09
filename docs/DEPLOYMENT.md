# FormDee Deployment Guide

Complete deployment guide for FormDee dynamic form builder with multiple deployment options and production configurations.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Supabase account
- Cloudflare R2 account (optional, for file uploads)
- Docker (for containerized deployment)

### Environment Setup

1. **Copy environment template:**

   ```bash
   cp .env.example .env
   ```

2. **Configure required variables:**

   ```env
   # Supabase Configuration
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

   # Admin Authentication
   ADMIN_API_KEY=your-secure-admin-api-key-32-chars-min
   ADMIN_UI_KEY=your-secure-ui-key-32-chars-min

   # Application
   NEXT_PUBLIC_BASE_URL=https://your-domain.com
   ```

3. **Set up database:**
   ```bash
   npm run setup:supabase
   ```

## 🐳 Docker Deployment (Recommended)

### Automated Docker Setup

```bash
# Complete automated deployment
npm run deploy:docker:auto
```

This will:

- ✅ Generate secure API keys
- ✅ Build optimized Docker image
- ✅ Start production container
- ✅ Provide management commands

### Manual Docker Setup

```bash
# Build image
docker build -t formdee .

# Run container
docker run -d \
  --name formdee-app \
  -p 3000:3000 \
  --env-file .env \
  formdee
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - '3000:3000'
    env_file:
      - .env
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3000/api/health']
      interval: 30s
      timeout: 10s
      retries: 3
```

Run with: `npm run deploy:docker:compose`

## ☁️ Vercel Deployment

### Automatic Deployment

```bash
# Deploy to Vercel
npm run deploy:vercel
```

### Manual Vercel Setup

1. **Install Vercel CLI:**

   ```bash
   npm i -g vercel
   ```

2. **Deploy:**

   ```bash
   vercel --prod
   ```

3. **Configure environment variables:**
   - Go to Vercel dashboard
   - Add all environment variables from `.env`
   - Redeploy

### Vercel Configuration

```json
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "env": {
    "NEXT_PUBLIC_BASE_URL": "@next-public-base-url"
  },
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

## 🖥️ Manual Server Deployment

### Production Build

```bash
# Full production build with checks
npm run build:production

# Start production server
npm start
```

### PM2 Process Manager

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start npm --name "formdee" -- start

# Enable auto-restart
pm2 startup
pm2 save
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;

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

## 🗄️ Database Setup

### Supabase Configuration

1. **Create Supabase project:**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Copy credentials to `.env`

2. **Run setup script:**

   ```bash
   npm run setup:supabase
   ```

3. **Verify setup:**
   - Check tables in Supabase dashboard
   - Test API endpoints

### Manual Database Setup

If automated setup fails, run SQL manually in Supabase SQL Editor:

```sql
-- See scripts/setup-supabase.js for complete SQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public."Forms" (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    "refKey" TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- ... more tables
```

## 📁 File Storage Setup

### Cloudflare R2 Configuration

1. **Create R2 bucket:**
   - Go to Cloudflare dashboard
   - Create new R2 bucket
   - Configure public access

2. **Add R2 credentials:**
   ```env
   R2_ACCOUNT_ID=your-account-id
   R2_ACCESS_KEY_ID=your-access-key
   R2_SECRET_ACCESS_KEY=your-secret-key
   R2_BUCKET_NAME=your-bucket-name
   R2_PUBLIC_URL=https://your-domain.com
   NEXT_PUBLIC_R2_PUBLIC_URL=https://your-domain.com
   ```

### Alternative Storage Options

Without R2, forms still work but file uploads will be disabled. You can:

- Use AWS S3 (modify `lib/r2-storage.ts`)
- Use local storage (not recommended for production)
- Use Google Drive API (legacy option)

## 🔒 Security Configuration

### API Key Generation

```bash
# Generate secure keys automatically
npm run setup:deployment
```

Or manually:

```bash
# Generate 32+ character secure keys
openssl rand -base64 32
```

### Security Headers

Add to `next.config.js`:

```javascript
const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
]

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}
```

## 📊 Monitoring & Health Checks

### Health Check Endpoint

```bash
curl http://your-domain.com/api/health
```

Expected response:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.2.0",
  "database": "connected",
  "storage": "connected"
}
```

### Monitoring Setup

1. **Application monitoring:**
   - Monitor `/api/health` endpoint
   - Set up alerts for failures
   - Monitor response times

2. **Database monitoring:**
   - Supabase provides built-in monitoring
   - Check connection pool usage
   - Monitor query performance

3. **Log monitoring:**
   - Check application logs
   - Monitor error rates
   - Set up log aggregation

## 🚀 Performance Optimization

### Build Optimization

```bash
# Analyze bundle size
npm run build:analyze
```

### Caching Strategy

1. **Static assets:** Cached at CDN level
2. **API responses:** Cached with TanStack Query
3. **Database queries:** Optimized with indexes
4. **Images:** Next.js automatic optimization

### Performance Monitoring

- Monitor Core Web Vitals
- Use Lighthouse for auditing
- Monitor bundle size growth
- Check memory usage

## 🔄 CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - run: npm ci
      - run: npm run build:production
      - run: npm run test:all:standard

      - name: Deploy to Vercel
        run: npm run deploy:vercel
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

### Deployment Checklist

- [ ] All tests pass (`npm run test:all`)
- [ ] Production build successful (`npm run build:production`)
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Health checks passing
- [ ] Security headers configured
- [ ] SSL certificate installed
- [ ] Monitoring configured

## 🆘 Troubleshooting

### Common Issues

1. **Build failures:**

   ```bash
   # Clear Next.js cache
   rm -rf .next
   npm run build
   ```

2. **Database connection:**

   ```bash
   # Test Supabase connection
   curl -H "apikey: YOUR_ANON_KEY" https://your-project.supabase.co/rest/v1/
   ```

3. **File upload issues:**
   ```bash
   # Check R2 credentials
   curl -X PUT "https://api.cloudflareapi.com/client/v4/accounts/$R2_ACCOUNT_ID/r2/buckets"
   ```

### Debug Commands

```bash
# Check environment
npm run test:safety-check

# Validate configuration
npm run setup:supabase --dry-run

# Monitor logs
npm run docker:logs

# Health check
curl http://localhost:3000/api/health
```

## 📚 Additional Resources

- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Supabase Documentation](https://supabase.com/docs)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Vercel Documentation](https://vercel.com/docs)
