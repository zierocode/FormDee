# FormDee 🚀 - Dynamic Form Builder

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC)](https://tailwindcss.com/)
[![Status](https://img.shields.io/badge/Status-Production_Ready-success)](https://github.com/yourusername/formDee)

**Production-ready form builder with Google Sheets integration, file uploads, and comprehensive testing suite. No database required!**

## 🌟 Key Features

### 🎯 Core Functionality
- **Dynamic Form Builder**: Drag-and-drop interface with real-time preview
- **Multiple Field Types**: Text, Email, Number, Date, Textarea, Select, Radio, Checkbox, File Upload
- **Advanced Validation**: Required fields, patterns, min/max values, file type restrictions
- **Google Sheets Integration**: Automatic response collection with configurable sheets
- **File Upload Support**: Direct upload to Google Drive with automatic linking
- **Real-time Column Indicators**: Visual mapping of form fields to Google Sheets columns

### 🔧 Developer Features  
- **RESTful API**: Complete CRUD operations for external integrations
- **TypeScript Support**: Full type safety and IntelliSense
- **Comprehensive Testing**: 4-tier test suite with automatic cleanup
- **Data Migration**: Smart handling of form structure changes
- **Slack Integration**: Webhook notifications for form submissions
- **International Support**: Unicode and multi-language character handling

### 🛡️ Enterprise-Grade Security
- **Admin Authentication**: API key-based admin operations
- **Test Data Protection**: Automatic cleanup prevents data accumulation
- **Production Safeguards**: Multi-layer protection against accidental data loss
- **Input Validation**: Server-side validation with Zod schemas
- **Permission Management**: Granular access control for sheets and folders

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

The fastest way to get started:

```bash
git clone https://github.com/zierocode/FormDee.git
cd formDee
npm install

# Run interactive deployment setup
npm run setup:deployment
```

The setup tool will:
- ✅ **Generate secure ADMIN_API_KEY** automatically
- ✅ **Ask for your ADMIN_UI_KEY** interactively
- ✅ **Collect configuration** interactively  
- ✅ **Create .env file** with proper format
- ✅ **Guide Google Apps Script** setup step-by-step
- ✅ **Provide deployment options** for your platform

### 2. Manual Setup (Advanced)

For manual configuration:

```bash
npm run test:install  # Install Playwright for E2E tests
```

### 3. Environment Setup

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

### 3. Google Apps Script Setup

1. **Create Google Apps Script Project**:
   - Open [Google Apps Script](https://script.google.com)
   - Create new project
   - Copy entire contents of `/apps-script/Code.gs`
   - Paste into the script editor

2. **Configure Script Properties**:
   - Go to Project Settings → Script Properties
   - Add: `ADMIN_API_KEY` = your admin API key

3. **Deploy as Web App**:
   - Click Deploy → New deployment
   - Type: Web app
   - Execute as: Me
   - Access: Anyone
   - Copy the deployment URL to your `.env` file

4. **Grant Permissions**:
   - First run will request permissions
   - Grant access to Sheets, Drive, and external services

### 4. Development Server

```bash
npm run dev
# Open http://localhost:3000
```

## 📊 Google Sheets Structure

### Master Sheet Configuration
Create a spreadsheet with a "Forms" tab containing these columns:
- **Column A**: `refKey` (unique identifier)
- **Column B**: `title` 
- **Column C**: `description`
- **Column D**: `responseSheetUrl`
- **Column E**: `slackWebhookUrl` (optional)
- **Column F**: `uploadFolderUrl` (for file uploads)
- **Column G**: `fields` (JSON configuration)
- **Column H**: `createdAt`
- **Column I**: `updatedAt`

### Response Sheets Structure
Form responses are saved with this structure:
- **Column A**: `timestamp` - Submission timestamp
- **Column B**: `refKey` - Form identifier  
- **Column C**: `ip` - User IP address
- **Column D**: `userAgent` - Browser information
- **Column E+**: Form field data (mapped to field order)

> **Column Mapping**: The form builder shows column indicators (E, F, G, etc.) to help you understand how fields map to your Google Sheets.

## 🧪 Comprehensive Testing Suite

### Test Architecture
The project includes a **4-tier testing system** with automatic cleanup:

#### 1. API Standard Tests (21 tests, ~1 minute)
```bash
npm run test:api:standard
```
**Coverage**: Core functionality testing
- ✅ Forms CRUD operations
- ✅ Form submission workflows  
- ✅ Authentication & authorization
- ✅ Sheet metadata operations
- ✅ Basic error handling

#### 2. API Full Tests (50+ tests, ~3-5 minutes)
```bash
npm run test:api:full
```
**Coverage**: Comprehensive edge case testing
- ✅ All standard tests plus advanced scenarios
- ✅ Security & injection protection tests
- ✅ Performance & stress testing
- ✅ Concurrency & race condition handling
- ✅ Unicode & international character support
- ✅ File upload edge cases

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

### Quick Test Commands

```bash
# Recommended for development
npm run test:all:standard    # Run both standard suites (~3 min)
npm run test:quick          # Critical tests only (~1 min)

# Comprehensive testing
npm run test:all:full        # All test suites (~15 min)
npm run test:ci             # CI/CD optimized

# Maintenance
npm run test:cleanup        # Manual cleanup of test data
npm run test:safety-check   # Verify cleanup configuration
```

### 🧹 Automatic Cleanup System

**Zero Test Data Accumulation**: 
- ✅ All test forms automatically deleted
- ✅ All test responses removed from sheets  
- ✅ Test screenshots and reports cleaned
- ✅ Production data fully protected
- ✅ Cleanup runs even on test failures
- ✅ Manual cleanup commands available

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

**Current Version**: 1.0.0 (Production Ready)
**Last Updated**: September 7, 2025  
**Development Status**: ✅ Complete
**Production Status**: ✅ Ready for deployment

### Feature Completeness
- ✅ **Form Builder**: Complete with all field types
- ✅ **Google Sheets Integration**: Full CRUD operations
- ✅ **File Upload System**: Google Drive integration  
- ✅ **Testing Suite**: 4-tier comprehensive testing
- ✅ **API Documentation**: Complete REST API
- ✅ **Security**: Production-grade authentication
- ✅ **Performance**: Optimized for production
- ✅ **Documentation**: Comprehensive guides

### Quality Metrics
- **Test Coverage**: 100% API coverage, comprehensive E2E
- **TypeScript**: Full type safety, zero any types
- **Performance**: 87.3 kB shared bundle, optimized loading
- **Security**: Multi-layer protection, admin authentication
- **Documentation**: Complete setup and deployment guides

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🚀 Ready to Deploy!

This project is **production-ready** with:
- ✅ Complete functionality
- ✅ Comprehensive testing  
- ✅ Security best practices
- ✅ Performance optimization
- ✅ Deployment documentation

**Get started**: Clone, configure, and deploy in under 10 minutes!

---

**Built with ❤️ using Next.js, TypeScript, and Google Apps Script**