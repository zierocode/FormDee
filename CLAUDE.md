# FormDee - Dynamic Form Builder

## 🚀 Production Status - Complete & Deployed
This project is **production-ready** and **feature-complete** with comprehensive testing and deployment tools. All major features implemented:

### ✅ Core Features Complete
- ✅ **Advanced Form Builder** - Drag-and-drop with real-time column mapping
- ✅ **Google Sheets Integration** - Full CRUD with automatic response collection
- ✅ **File Upload System** - Google Drive integration with secure handling
- ✅ **Authentication System** - Cookie-based admin login with session management
- ✅ **Comprehensive Testing** - 4-tier test suite (API + E2E) with automatic cleanup
- ✅ **Production Deployment** - Docker, Vercel, and manual deployment options
- ✅ **Performance Optimized** - 87.3 kB shared bundle with caching strategies
- ✅ **Enterprise Security** - Multi-layer protection with admin authentication
- ✅ **International Support** - Unicode handling and multi-language forms
- ✅ **Data Migration Tools** - Smart handling of form structure changes

## Overview
A dynamic form builder application with Google Sheets integration. Forms are stored in a master Google Sheet and responses are saved to designated sheets.

## Tech Stack
- **Frontend**: Next.js 14 with TypeScript
- **Backend**: Google Apps Script (GAS)
- **Database**: Google Sheets
- **Styling**: Tailwind CSS

## Project Structure
```
/app
  /api
    /auth          # Authentication endpoints (login, logout, check)
    /forms         # Form CRUD operations with admin protection
      /sheets      # Google Sheets metadata operations
      /test-slack  # Slack webhook testing
    /submit        # Public form submission with validation
    /upload        # File upload to Google Drive
    /responses     # Response data management
    /health        # Application health check
  /builder         # Form builder interface with auth protection
    /[refKey]      # Edit existing forms
  /f
    /[refKey]      # Public form display/submission
  /login           # Admin authentication page
/components
  AuthProvider.tsx     # Authentication context and session management
  BuilderForm.tsx      # Advanced form builder with column indicators
  FormRenderer.tsx     # Public form display with validation
  FieldEditor.tsx      # Field configuration with file upload support
  FieldList.tsx        # Field list with Google Sheets column mapping
  DataMigrationModal.tsx # Smart migration for form structure changes
  AdminKeyGate.tsx     # Authentication wrapper component
/lib
  /auth.ts         # Server-side authentication utilities
  /server          # Server-side API helpers and optimizations
  /api.ts          # Typed API client functions
  /validation.ts   # Zod validation schemas
  /types.ts        # Complete TypeScript definitions
/tests
  /api             # API test suites (21 standard + 50+ comprehensive)
  /e2e             # End-to-end Playwright tests (4 standard + 25+ full)
  /utils           # Testing utilities with automatic cleanup
  test-runner.js   # Unified test runner with 4-tier system
/scripts
  setup-deployment.js  # Interactive deployment setup
  docker-deploy.js     # Automated Docker deployment
  docker-manage.js     # Docker container management
/apps-script
  Code.gs          # Production Google Apps Script backend
```

## Key Features

### 1. Form Management
- Create new forms with unique reference keys
- Edit existing forms
- Configure Google Sheets for response storage
- Add multiple field types (text, email, number, date, textarea, select, radio, checkbox)
- Field validation with required/optional, patterns, min/max values

### 2. Google Sheets Integration
- **Master Sheet Management** - Centralized form configuration storage
- **Response Collection** - Each form saves to designated response sheets
- **Column Mapping Indicators** - Visual field-to-column mapping in form builder
- **Data Migration Support** - Smart handling of form structure changes
- **Metadata Operations** - Sheet analysis and validation
- **Automatic Header Generation** - Dynamic column creation based on form fields
- **Comprehensive Data Storage** - Timestamp, IP, user agent, and all field data

### 3. Complete API System

#### Authentication Endpoints
- **POST /api/auth/login** - Admin authentication with secure cookies
- **POST /api/auth/logout** - Session termination with cookie cleanup  
- **GET /api/auth/check** - Authentication status verification

#### Form Management (Admin Protected)
- **GET /api/forms** - List all forms or get specific form by refKey
- **POST /api/forms** - Create or update form configurations
- **DELETE /api/forms** - Remove forms with data protection
- **GET /api/forms/sheets** - Google Sheets metadata operations
- **POST /api/forms/test-slack** - Slack webhook testing

#### Public Endpoints
- **POST /api/submit** - Form submission with validation and file support
- **POST /api/upload** - File upload to Google Drive
- **GET /api/responses** - Response data retrieval (with auth)
- **GET /api/health** - Application health monitoring

## Environment Variables
```env
GAS_BASE_URL=https://script.google.com/macros/s/DEPLOYMENT_ID/exec
ADMIN_API_KEY=your-api-key
ADMIN_UI_KEY=your-ui-key
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Google Sheets Structure

### Master Sheet
The master Google Sheet URL is the same as the GAS_BASE_URL in the .env file. This sheet contains the Forms tab:

1. **Forms Tab** - Stores form configurations (DO NOT use for testing or create new tabs here):
   - Column A: refKey (unique identifier)
   - Column B: title
   - Column C: description
   - Column D: responseSheetUrl
   - Column E: slackWebhookUrl
   - Column F: fields (JSON)
   - Column G: createdAt
   - Column H: updatedAt
   - **Important**: This tab is for form configuration storage only. Never use the master sheet for testing form submissions or create additional tabs.

2. **Response Sheets** - Each form saves responses to separate Google Sheets (not in the master sheet):
   - Column A: timestamp
   - Column B: refKey
   - Column C: ip
   - Column D: userAgent
   - Remaining columns: Form field data

## Recent Bug Fixes

### Reference Key Validation (Fixed)
**Issue**: The API was returning all forms when checking if a specific refKey exists.
**Fix**: Updated `/app/api/forms/route.ts` to properly filter the GAS response and return 404 for non-existent forms.

### UI Improvements
- Added back button to form creation mode (consistent with edit mode)
- Hide existing forms list when creating new form
- Back button uses `btn-secondary` class for consistent styling

## Comprehensive Testing System

### 4-Tier Test Architecture
```bash
# === Main Test Categories ===
npm run test:api:standard    # 21 core API tests (~1 min)
npm run test:api:full        # 50+ comprehensive API tests (~3-5 min)
npm run test:e2e:standard    # 4 essential E2E tests (~2 min)
npm run test:e2e:full        # 25+ complete E2E tests (~5-10 min)

# === Combined Suites ===
npm run test:all:standard    # Both standard suites (~3 min)
npm run test:all:full        # All test suites (~15 min)
npm run test:all             # Complete test coverage

# === Quick Commands ===
npm run test:quick           # Critical tests only (~1 min)
npm run test:ci              # CI/CD optimized testing
npm run test:cleanup         # Manual cleanup of test data
npm run test:safety-check    # Verify cleanup configuration
```

### Automatic Cleanup System
- ✅ **Zero Test Data Accumulation** - All test forms and responses auto-deleted
- ✅ **Production Data Protection** - Multi-layer safety mechanisms
- ✅ **Cleanup on Failure** - Cleanup runs even when tests fail
- ✅ **Manual Cleanup Options** - Interactive and automated cleanup tools

### Development Commands
```bash
# Development server
npm run dev

# Code quality
npm run lint && npm run typecheck
npm run build:production     # Production build with all checks

# API testing
curl -s "http://localhost:3000/api/health" | jq
curl -s "http://localhost:3000/api/forms?refKey=example" | jq
```

## Common Tasks

### Creating a New Form
1. Navigate to `/builder`
2. Click "Create Form"
3. Fill in form details and unique reference key
4. Configure Google Sheet for responses
5. Add fields with validation rules
6. Save form

### Testing Form Submission
1. Navigate to `/f/{refKey}`
2. Fill in form fields
3. Submit form
4. Check Google Sheet for response data - visit the Google Sheet URL to verify data was saved (both for form settings in master sheet and form submissions in response sheets)

### Test Google Sheets for Form Submissions
Use these separate Google Sheets for testing form submissions (NOT the master sheet):

1. <https://docs.google.com/spreadsheets/d/1nw64BTzTPMAsC4al3K0AvxWHwcpcxp9gj-jLsQIv_Kw/edit?usp=sharing>
2. <https://docs.google.com/spreadsheets/d/1N4Qi7ouqMGQuZEe5j65uhzfd_T7NYlo5fGuGaxXyFz0/edit?usp=share_link>
3. <https://docs.google.com/spreadsheets/d/1nw64BTzTPMAsC4al3K0AvxWHwcpcxp9gj-jLsQIv_Kw/edit?usp=share_link>

**Note**: Always use separate sheets for form responses. Never configure forms to save responses to the master sheet.

## Important Notes

1. **Authentication**: Admin operations require either `ADMIN_API_KEY` or `ADMIN_UI_KEY`
2. **Google Sheets Access**: Ensure the Apps Script project has edit access to all configured spreadsheets
3. **Reference Keys**: Must be unique across all forms
4. **Response Sheets**: Can be shared between forms but headers will be overwritten based on the last saved form's fields

## Development Guidelines

1. Always validate form data on both client and server
2. Use TypeScript types from `/lib/types.ts`
3. Handle API errors gracefully with user-friendly messages
4. Test form creation and submission flow after changes
5. Ensure Google Sheets integration works with proper permissions

## Troubleshooting

### Form Save Fails
- Check if reference key already exists
- Verify Google Sheet URL is valid
- Ensure Apps Script has access to the sheet

### Submissions Not Appearing
- Check browser console for errors
- Verify response sheet URL is configured
- Check Google Apps Script logs

### API Returns Unexpected Data
- Clear Next.js cache with `rm -rf .next`
- Check environment variables
- Verify GAS deployment is up to date

## 🚢 Advanced Deployment System

### Interactive Setup (Recommended)
```bash
# One-command setup with guided configuration
npm run setup:deployment
# ✅ Auto-generates secure ADMIN_API_KEY (32+ chars)
# ✅ Interactively collects ADMIN_UI_KEY
# ✅ Creates properly formatted .env file
# ✅ Provides Google Apps Script setup guide
# ✅ Offers deployment platform selection
```

### Docker Deployment (Automated)
```bash
# Complete automated Docker deployment
npm run deploy:docker:auto
# ✅ Auto-generates secure keys
# ✅ Checks Docker environment
# ✅ Builds optimized production image
# ✅ Starts production container
# ✅ Provides management commands

# Docker Compose (Advanced)
npm run deploy:docker:compose

# Container Management
npm run docker:logs       # View container logs
npm run docker:restart    # Restart application
npm run docker:status     # Check container status
npm run docker:clean      # Cleanup unused containers
```

### Traditional Deployment
```bash
# Production build with quality checks
npm run build:production  # Includes lint, typecheck, and build

# Deployment options
npm run deploy:vercel     # Automated Vercel deployment
npm start                 # Manual server deployment

# Performance analysis
npm run build:analyze     # Bundle size analysis
```

### Environment Variables (Production)
```env
GAS_BASE_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
ADMIN_API_KEY=your-secure-admin-api-key
ADMIN_UI_KEY=your-secure-admin-ui-key
NEXT_PUBLIC_BASE_URL=https://your-production-domain.com
NODE_ENV=production
```

### Enterprise Security Features
- ✅ **Cookie-Based Authentication** - Secure session management with HTTP-only cookies
- ✅ **Admin Access Control** - Multi-layer protection for form builder and API
- ✅ **Production Data Protection** - Comprehensive safeguards against accidental data loss
- ✅ **Input Validation** - Server-side validation with Zod schemas
- ✅ **Security Headers** - CSP, XSS protection, and secure headers
- ✅ **API Key Management** - Secure generation and validation
- ✅ **File Upload Security** - Secure handling with type and size validation

### Performance Optimizations
- ✅ Next.js compression enabled
- ✅ Image optimization configured
- ✅ Bundle splitting and tree shaking
- ✅ Cache headers for static assets
- ✅ Minimal dependencies

## 🔌 API for External Developers

### Available Endpoints

#### 1. Submit Form Data (Public)
```javascript
POST /api/submit
Content-Type: application/json

{
  "refKey": "contact-form",
  "values": {
    "name": "John Doe",
    "email": "john@example.com",
    "message": "Hello world"
  }
}
```

#### 2. Get Form Configuration (Public)
```javascript
GET /api/forms?refKey=contact-form

// Returns form structure for validation/rendering
{
  "refKey": "contact-form",
  "title": "Contact Form",
  "fields": [...],
  "responseSheetUrl": "..."
}
```

#### 3. Create/Update Forms (Admin)
```javascript
POST /api/forms
Content-Type: application/json
x-api-key: your-admin-key

{
  "refKey": "new-form",
  "title": "New Form",
  "description": "Form description",
  "fields": [...],
  "responseSheetUrl": "..."
}
```

### External Integration Examples

#### React/Next.js Integration
```javascript
// Custom form component using FormDee API
const MyCustomForm = () => {
  const handleSubmit = async (formData) => {
    const response = await fetch('https://yourapp.com/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refKey: 'contact-form',
        values: formData
      })
    });
    
    if (response.ok) {
      console.log('Form submitted successfully!');
    }
  };
  
  return (
    // Your custom form JSX
  );
};
```

#### Mobile App Integration
```javascript
// React Native or mobile app
const submitToFormDee = async (data) => {
  try {
    const response = await fetch('https://yourapp.com/api/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MyMobileApp/1.0'
      },
      body: JSON.stringify({
        refKey: 'mobile-feedback',
        values: data
      })
    });
    
    return await response.json();
  } catch (error) {
    console.error('Submission failed:', error);
  }
};
```

### CORS Configuration
The API supports CORS for external domains. Contact the administrator to whitelist your domain for API access.

### Rate Limiting
- Public endpoints: 100 requests/minute per IP
- Admin endpoints: 1000 requests/minute with valid API key