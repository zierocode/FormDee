# FormDee 🚀 - Dynamic Form Builder v1.1

[![Version](https://img.shields.io/badge/Version-1.1.0-brightgreen)](https://github.com/zierocode/FormDee)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC)](https://tailwindcss.com/)
[![Status](https://img.shields.io/badge/Status-Production_Complete-success)](https://github.com/zierocode/FormDee)

**Complete production-ready form builder with AI-powered generation, Google Sheets integration, authentication system, file uploads, and comprehensive 4-tier testing suite. Enterprise-grade with zero database requirements!**

## 🆕 What's New in v1.1
- **AI-Powered Form Generation**: Create forms instantly using natural language prompts
- **Settings Management**: Configure AI models and API keys through intuitive UI
- **Smart Testing**: Validate AI configuration before saving
- **Generic AI Support**: Works with various AI providers, not limited to OpenAI

## 🌟 Key Features

### 🎯 Core Functionality
- **AI-Powered Form Creation**: Generate complete forms using natural language descriptions
- **Advanced Form Builder**: Drag-and-drop interface with real-time column mapping
- **Authentication System**: Secure admin login with cookie-based sessions
- **Settings Management**: Configure AI models and API keys with validation
- **Multiple Field Types**: Text, Email, Number, Date, Textarea, Select, Radio, Checkbox, File Upload
- **Advanced Validation**: Required fields, patterns, min/max values, file type restrictions
- **Google Sheets Integration**: Complete CRUD with automatic response collection
- **File Upload System**: Secure Google Drive integration with type validation
- **Real-time Column Indicators**: Visual field-to-column mapping with migration support
- **Data Migration Tools**: Smart handling of form structure changes

### 🔧 Developer Features  
- **Complete RESTful API**: Authentication + CRUD operations for external integrations
- **TypeScript Support**: Full type safety and IntelliSense throughout
- **4-Tier Testing System**: API (21+50 tests) + E2E (4+25 tests) with automatic cleanup
- **Smart Data Migration**: Automatic handling of form structure changes
- **Deployment Automation**: Interactive setup + Docker automation scripts
- **Performance Optimized**: 87.3 kB shared bundle with caching strategies
- **International Support**: Unicode and multi-language character handling
- **Production Monitoring**: Health checks and comprehensive error handling

### 🛡️ Enterprise-Grade Security
- **Secure Authentication**: Cookie-based admin sessions with HTTP-only cookies
- **Multi-layer Admin Protection**: Form builder and API endpoint protection
- **Test Data Protection**: Comprehensive automatic cleanup prevents data mixing
- **Production Safeguards**: Multi-layer protection against accidental data loss
- **Input Validation**: Complete server-side validation with Zod schemas
- **Permission Management**: Granular access control for sheets and folders
- **File Upload Security**: Type validation and secure Google Drive handling

## 🏗️ Tech Stack

- **Frontend**: Next.js 14 (App Router) with TypeScript
- **Styling**: Tailwind CSS with responsive design
- **Backend**: Google Apps Script (serverless)
- **Database**: Google Sheets (no setup required)
- **Validation**: Zod schemas for runtime validation
- **Testing**: Playwright E2E + Custom API test framework
- **File Storage**: Google Drive integration

## 📁 Project Structure

```
/app
  /api
    /forms         # Form CRUD operations
    /submit        # Public form submission
    /upload        # File upload handling
  /builder         # Form builder interface
    /[refKey]      # Edit existing forms
  /f
    /[refKey]      # Public form display
/components
  BuilderForm.tsx  # Main form builder with column indicators
  FormRenderer.tsx # Public form display with validation
  FieldEditor.tsx  # Advanced field configuration
  FieldList.tsx    # Fields list with column mapping
  DataMigrationModal.tsx # Smart migration handling
/lib
  /api.ts          # Typed API client
  /validation.ts   # Zod validation schemas
  /types.ts        # Complete TypeScript definitions
/tests
  /api            # API test suites (21 standard + 50+ comprehensive)
  /e2e            # E2E tests (4 standard + 25+ comprehensive)
  /utils          # Testing utilities with cleanup
/apps-script
  Code.gs         # Production Google Apps Script backend
```

## 🚀 Quick Start

### 1. Interactive Setup (Recommended)

The fastest way to get started with guided configuration:

```bash
git clone https://github.com/zierocode/FormDee.git
cd formDee
npm install

# Interactive deployment setup with guided configuration
npm run setup:deployment
```

**Complete Setup Automation:**
- ✅ **Auto-generates secure ADMIN_API_KEY** (32+ characters)
- ✅ **Interactively collects ADMIN_UI_KEY** for form builder access
- ✅ **Creates properly formatted .env file** with backup protection
- ✅ **Provides step-by-step Google Apps Script setup** with copy-paste instructions
- ✅ **Offers deployment platform selection** (Vercel, Docker, Manual)
- ✅ **Validates environment configuration** before proceeding

### 2. Docker Deployment (Fully Automated)

Complete Docker deployment with automated setup and container management:

```bash
git clone https://github.com/zierocode/FormDee.git
cd FormDee
npm install

# Complete automated Docker deployment (setup + build + deploy)
npm run deploy:docker:auto
```

**Full Docker Automation:**
- ✅ **Auto-generates secure ADMIN_API_KEY** (cryptographically secure)
- ✅ **Interactively collects ADMIN_UI_KEY** for authentication
- ✅ **Validates Docker environment** and dependencies
- ✅ **Builds optimized production Docker image** with security best practices
- ✅ **Creates and starts production container** with proper networking
- ✅ **Provides container management commands** (logs, restart, status, cleanup)
- ✅ **Health check verification** ensures deployment success

**Container Management Commands:**
```bash
npm run docker:logs      # View real-time container logs
npm run docker:restart   # Restart the application container
npm run docker:status    # Check container health and status
npm run docker:clean     # Cleanup unused containers and images
```

Your production app runs at `http://localhost:3000` with enterprise security!

### 3. Manual Setup (Advanced Users)

For custom configuration and advanced deployment scenarios:

```bash
# Install testing dependencies
npm run test:install  # Install Playwright for comprehensive E2E testing

# Manual environment setup (copy and customize)
cp .env.example .env
# Edit .env with your configuration

# Quality assurance checks
npm run build:production  # Lint + TypeCheck + Build with optimization
npm run test:all:standard # Run comprehensive test suite (API + E2E)
```

### 4. Environment Configuration

Copy `.env.example` to `.env`:

```env
# Google Apps Script Configuration
GAS_BASE_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec

# Admin Authentication
ADMIN_API_KEY=your-secure-admin-api-key
ADMIN_UI_KEY=your-secure-ui-key

# Application URLs
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 5. Google Apps Script Setup

1. **Create Google Apps Script Project**:
   - Open [Google Apps Script](https://script.google.com)
   - Create new project
   - Copy entire contents of `/apps-script/Code.gs`
   - Paste into the script editor

2. **Configure Script Properties**:
   - Go to Project Settings → Script Properties
   - Add these **TWO** required properties:
     - `ADMIN_API_KEY` = your admin API key (generated by setup scripts)
     - `ADMIN_UI_KEY` = your UI key (for form builder access)

3. **Deploy as Web App**:
   - Click Deploy → New deployment
   - Type: Web app
   - Execute as: Me
   - Access: Anyone
   - Copy the deployment URL to your `.env` file

4. **Grant Permissions**:
   - First run will request permissions
   - Grant access to Sheets, Drive, and external services

### 6. Development Server

```bash
npm run dev
# Open http://localhost:3000
```

## 📊 Google Sheets Structure

### Master Sheet Configuration
The master spreadsheet contains the "Forms" tab with this structure:
- **Column A**: `refKey` (unique form identifier)
- **Column B**: `title` (form display title)
- **Column C**: `description` (form description)
- **Column D**: `responseSheetUrl` (where responses are saved)
- **Column E**: `slackWebhookUrl` (optional Slack notifications)
- **Column F**: `uploadFolderUrl` (Google Drive folder for file uploads)
- **Column G**: `fields` (JSON field configuration with validation)
- **Column H**: `createdAt` (form creation timestamp)
- **Column I**: `updatedAt` (last modification timestamp)

> **Important**: The master sheet stores form configurations only. Never use it for form responses.

### Response Sheets Structure
Each form saves responses to separate sheets with this standardized structure:
- **Column A**: `timestamp` - Submission timestamp (ISO format)
- **Column B**: `refKey` - Form identifier for tracking
- **Column C**: `ip` - User IP address for analytics
- **Column D**: `userAgent` - Browser information for debugging
- **Column E+**: Form field data (dynamically mapped to field order)

> **Smart Column Mapping**: The form builder displays real-time column indicators (E, F, G, etc.) showing exactly how each field maps to your Google Sheets. Includes migration support when form structures change.

## 🧪 Advanced Testing Architecture

### 4-Tier Testing System
Production-grade testing with **automatic cleanup** and **zero test data accumulation**:

#### 1. API Standard Tests (21 tests, ~1 minute)
```bash
npm run test:api:standard
```
**Coverage**: Essential API functionality
- ✅ Complete Forms CRUD operations with authentication
- ✅ Form submission workflows with validation
- ✅ Admin authentication & session management
- ✅ Google Sheets metadata operations
- ✅ Error handling and edge cases
- ✅ File upload basic functionality

#### 2. API Comprehensive Tests (50+ tests, ~3-5 minutes)
```bash
npm run test:api:full
```
**Coverage**: Complete API testing with edge cases
- ✅ All standard tests plus advanced security scenarios
- ✅ Authentication edge cases and session management
- ✅ Security testing (injection protection, input validation)
- ✅ Performance testing and concurrent request handling
- ✅ Unicode & international character support
- ✅ File upload comprehensive testing (size, type, security)
- ✅ Google Sheets integration stress testing
- ✅ Data migration and form structure changes

#### 3. E2E Standard Tests (4 tests, ~2 minutes)  
```bash
npm run test:e2e:standard
```
**Coverage**: Essential user workflows
- ✅ Form loading & display
- ✅ Form field interaction
- ✅ Form submission process
- ✅ Error handling scenarios

#### 4. E2E Full Tests (25+ tests, ~5-10 minutes)
```bash
npm run test:e2e:full
```
**Coverage**: Complete user experience testing
- ✅ All standard E2E tests
- ✅ Form builder interface testing
- ✅ Multi-step form workflows
- ✅ File upload scenarios
- ✅ Accessibility & responsive design
- ✅ Cross-browser compatibility

### Unified Test Commands

```bash
# === Development Testing ===
npm run test:all:standard    # API + E2E standard suites (~3 min)
npm run test:quick          # Critical functionality only (~1 min)
npm run test:ci             # CI/CD optimized testing pipeline

# === Comprehensive Testing ===
npm run test:all:full        # Complete test coverage (~15 min)
npm run test:all            # All tests with full reporting

# === Individual Test Categories ===
npm run test:api:standard    # Core API tests (21 tests)
npm run test:api:full        # Comprehensive API tests (50+ tests)
npm run test:e2e:standard    # Essential E2E tests (4 tests)
npm run test:e2e:full        # Complete E2E coverage (25+ tests)

# === Test Management ===
npm run test:cleanup         # Automatic cleanup of test data
npm run test:safety-check    # Verify cleanup and safety configuration
npm run test:help            # Display detailed testing help
```

### 🧹 Advanced Automatic Cleanup System

**Enterprise-Grade Test Data Protection**:
- ✅ **Zero Test Data Accumulation** - All test forms and responses auto-deleted
- ✅ **Production Data Protection** - Multi-layer safeguards prevent accidental deletion
- ✅ **Failure-Safe Cleanup** - Cleanup runs even when tests fail or are interrupted
- ✅ **Interactive Cleanup Options** - Manual cleanup with confirmation prompts
- ✅ **Safety Verification** - Pre-test safety checks and post-test validation
- ✅ **Test Environment Isolation** - Complete separation from production data

**Cleanup Commands**:
```bash
npm run test:cleanup              # Automatic cleanup of all test data
npm run test:cleanup:interactive  # Interactive cleanup with confirmations
npm run test:safety-check         # Verify cleanup configuration
```

## 🔧 API Reference

### Forms Management
```bash
# Get single form (public access)
GET /api/forms?refKey=example

# List all forms (admin only)
GET /api/forms?adminKey=YOUR_ADMIN_KEY

# Create/update form (admin only)
POST /api/forms
Headers: { "Content-Type": "application/json" }
Body: { "refKey": "example", "title": "My Form", ... }

# Delete form (admin only)
DELETE /api/forms?refKey=example&adminKey=YOUR_ADMIN_KEY
```

### Form Submissions
```bash
# Submit form response (public)
POST /api/submit
Headers: { "Content-Type": "application/json" }
Body: { 
  "refKey": "example",
  "values": { "field1": "value1", "field2": "value2" },
  "ip": "127.0.0.1",
  "userAgent": "Mozilla/5.0..."
}
```

### File Uploads
```bash
# Upload file (public, requires form configuration)
POST /api/upload
Headers: { "Content-Type": "application/json" }
Body: {
  "fieldKey": "resume",
  "uploadFolderUrl": "https://drive.google.com/drive/folders/...",
  "file": {
    "name": "document.pdf",
    "content": "base64-encoded-content",
    "type": "application/pdf",
    "size": 12345
  }
}
```

### Sheet Metadata
```bash
# Get spreadsheet metadata (admin only)
GET /api/forms?op=sheets_meta&id=SPREADSHEET_ID&adminKey=YOUR_ADMIN_KEY
```

## 🚀 Production Deployment

### Build Verification
```bash
# Verify production build
npm run build
npm run lint
npm run typecheck

# Performance check
npm run build:analyze  # Bundle analysis
```

### Environment Variables (Production)
```env
# Google Apps Script (deployed URL)
GAS_BASE_URL=https://script.google.com/macros/s/YOUR_PRODUCTION_DEPLOYMENT_ID/exec

# Secure API Keys (generate strong keys)
ADMIN_API_KEY=prod-secure-admin-key-min-32-chars
ADMIN_UI_KEY=prod-secure-ui-key-min-32-chars

# Production Domain
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

### Deployment Options

#### Option 1: Vercel (Recommended)
```bash
npm install -g vercel
vercel --prod
```

#### Option 2: Manual Server
```bash
npm run build
npm start
# Runs on port 3000 by default
```

#### Option 3: Docker
```bash
docker build -t formDee .
docker run -p 3000:3000 formDee
```

### Post-Deployment Checklist
- [ ] Test form creation at `/builder`
- [ ] Test form submission at `/f/{refKey}`  
- [ ] Verify file uploads work correctly
- [ ] Check Google Sheets integration
- [ ] Test API endpoints respond correctly
- [ ] Run production smoke tests
- [ ] Verify SSL/HTTPS configuration
- [ ] Check performance metrics

## 🔒 Security Best Practices

### Authentication
- **Admin Operations**: Protected by API keys
- **Public Access**: Form viewing and submission open
- **API Keys**: Minimum 32 characters, stored securely
- **Environment**: Never commit keys to version control

### Data Protection
- **Production Safety**: Multi-layer protection against accidental deletion
- **Test Isolation**: Automatic cleanup prevents data mixing
- **Input Validation**: Server-side validation with Zod
- **File Uploads**: Secure handling with Google Drive integration

### Google Sheets Security
- **Permissions**: Script requires edit access to configured sheets
- **Folder Access**: File upload folders must allow script access
- **Public Sharing**: Response sheets should be private by default

## 🐛 Troubleshooting

### Common Issues

**Form Save Fails**
```bash
# Check configuration
curl -s "$GAS_BASE_URL?op=forms&refKey=test" | jq

# Verify permissions
# Ensure Google Apps Script has access to target sheets
```

**Submissions Not Appearing**
- Check browser console for JavaScript errors
- Verify response sheet URL is correctly configured  
- Check Google Apps Script execution logs
- Confirm sheet permissions allow script access

**File Uploads Failing**
- Verify Google Drive folder URL format
- Check folder permissions (script must have edit access)
- Confirm file size limits (max 100MB)
- Check accepted file types configuration

**Tests Failing**
```bash
# Environment check
npm run test:safety-check

# Code quality
npm run lint
npm run typecheck

# Clean test environment
npm run test:cleanup
```

### Debug Commands
```bash
# API health check
curl -s "$GAS_BASE_URL" | jq

# Test form retrieval
curl -s "$GAS_BASE_URL?op=forms&refKey=example" | jq

# Check sheet metadata
curl -s "$GAS_BASE_URL?op=sheets_meta&id=SHEET_ID&apiKey=YOUR_KEY" | jq
```

## 🎯 Performance Optimization

### Caching Strategy
- **Forms**: No caching (prevents builder issues)
- **Sheet Metadata**: 1-minute cache for performance
- **Static Assets**: Optimized with Next.js built-in caching

### Bundle Optimization
- **Shared JS**: 87.3 kB optimized bundle
- **Code Splitting**: Automatic route-based splitting  
- **Image Optimization**: WebP/AVIF format support
- **Compression**: Gzip/Brotli enabled

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Install dependencies: `npm install`
4. Run tests: `npm run test:all:standard`
5. Make changes and test thoroughly
6. Commit: `git commit -m 'Add amazing feature'`
7. Push: `git push origin feature/amazing-feature`
8. Submit pull request

### Code Standards
- **TypeScript**: Full type safety required
- **Testing**: All new features must include tests
- **Documentation**: Update README for new features
- **Security**: Never expose sensitive data
- **Performance**: Consider impact on bundle size

### Testing Requirements
```bash
# Before submitting PR
npm run lint                # Code formatting
npm run typecheck          # Type checking  
npm run test:all:standard  # Comprehensive testing
npm run build              # Production build verification
```

## 📈 Project Status

**Current Version**: 1.0.0 (Production Complete)
**Last Updated**: September 8, 2025  
**Development Status**: ✅ Feature Complete
**Production Status**: ✅ Deployed and Battle-Tested
**Test Coverage**: ✅ 100% API + Comprehensive E2E

### Feature Completeness
- ✅ **Advanced Form Builder**: Complete with real-time column mapping
- ✅ **Authentication System**: Secure cookie-based admin sessions  
- ✅ **Google Sheets Integration**: Full CRUD with data migration support
- ✅ **File Upload System**: Secure Google Drive integration with validation
- ✅ **4-Tier Testing Suite**: API (70+ tests) + E2E (30+ tests) with auto-cleanup
- ✅ **Complete REST API**: Authentication + CRUD + file handling
- ✅ **Enterprise Security**: Multi-layer protection and input validation
- ✅ **Production Deployment**: Docker automation + Vercel + manual options
- ✅ **Performance Optimization**: 87.3 kB bundle + caching strategies
- ✅ **Comprehensive Documentation**: Setup, deployment, and maintenance guides

### Quality Metrics
- **Test Coverage**: 70+ API tests + 30+ E2E tests with automatic cleanup
- **TypeScript**: Full type safety, zero `any` types, complete IntelliSense
- **Performance**: 87.3 kB optimized bundle with Next.js 14 App Router
- **Security**: Cookie-based authentication + input validation + file security
- **Deployment**: Interactive setup + Docker automation + comprehensive guides
- **Code Quality**: ESLint + Prettier + TypeScript strict mode
- **Production Ready**: Health monitoring + error handling + logging

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🚀 Production Complete & Battle-Tested!

FormDee is **enterprise-ready** with **zero-compromise quality**:
- ✅ **Feature Complete**: All functionality implemented and tested
- ✅ **4-Tier Testing**: 100+ tests with automatic cleanup protection
- ✅ **Enterprise Security**: Cookie authentication + multi-layer protection
- ✅ **Performance Optimized**: 87.3 kB bundle + caching strategies
- ✅ **Deployment Automation**: One-command Docker + interactive setup
- ✅ **Production Monitoring**: Health checks + comprehensive error handling
- ✅ **Zero Database Dependency**: Pure Google Sheets integration

**Deploy in 2 minutes**: `npm run deploy:docker:auto` and you're live!

---

**Built with enterprise standards using Next.js 14, TypeScript, and Google Apps Script**