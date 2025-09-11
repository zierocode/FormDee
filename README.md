# FormDee v1.3.0

## 🚀 Production-Ready Dynamic Form Builder with AI & Google Sheets

A comprehensive form building platform with AI-powered generation, Google Sheets integration, Supabase backend, file uploads to Cloudflare R2, and enterprise-grade testing infrastructure.

![Version](https://img.shields.io/badge/version-1.3.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)
![Tests](https://img.shields.io/badge/tests-70%2B%20API%20+%2025%2B%20E2E-green)
![Coverage](https://img.shields.io/badge/API%20coverage-100%25-brightgreen)
![License](https://img.shields.io/badge/license-MIT-green)

### 🎉 **New in v1.3.0**

- 🤖 **Enhanced GPT-5 Model Support**: Intelligent handling of reasoning token exhaustion with helpful error messages
- 📊 **Google Sheets Integration**: Full OAuth flow, validation, and export functionality
- 🧪 **Comprehensive Test Coverage**: 70+ API tests including AI and Google Sheets integration
- 🔐 **Google OAuth Authentication**: Secure authentication flow for Google services
- 📝 **Improved Error Messages**: Clear, actionable error messages for better debugging
- ⚡ **Performance Optimizations**: Enhanced caching and request handling

## ✨ Core Features

### Form Builder

- **AI-Powered Generation** - Natural language to form conversion using OpenAI GPT models
- **Drag & Drop Builder** - Intuitive visual form construction with real-time preview
- **Field Types** - Text, email, number, date, textarea, select, radio, checkbox, file upload
- **Advanced Validation** - Pattern matching, min/max values, required fields, custom rules
- **Conditional Logic** - Show/hide fields based on user input

### Backend & Storage

- **Supabase Integration** - PostgreSQL database for forms and responses
- **Cloudflare R2** - Secure file storage with public URL generation
- **Google Sheets Export** - Export form responses directly to Google Sheets
- **Slack Notifications** - Real-time notifications for form submissions

### Authentication & Security

- **Cookie-Based Auth** - Secure session management for admin access
- **Google OAuth 2.0** - Secure authentication for Google services
- **API Key Protection** - Multiple layers of API security
- **Input Sanitization** - XSS and SQL injection protection

### Testing & Quality

- **Comprehensive Testing** - 70+ API tests, 25+ E2E tests
- **Smart Test Runner** - Intelligent test environment detection
- **Automatic Cleanup** - Test data cleanup with production safeguards
- **Performance Metrics** - Request timing and optimization tracking

## 🏗️ Architecture

```
formdee/
├── app/                      # Next.js 14 App Router
│   ├── api/                 # API Routes
│   │   ├── ai/generate/     # AI form generation
│   │   ├── auth/            # Authentication endpoints
│   │   │   ├── google/      # Google OAuth flow
│   │   │   ├── login/       # Admin login
│   │   │   └── logout/      # Session management
│   │   ├── forms/           # Form CRUD operations
│   │   │   ├── export-responses/  # Google Sheets export
│   │   │   ├── test-google-sheet/ # Sheet validation
│   │   │   └── test-slack/        # Slack webhook testing
│   │   ├── submit/          # Form submission handlers
│   │   │   └── supabase/    # Database submission
│   │   ├── responses/       # Response data retrieval
│   │   ├── settings/        # Configuration management
│   │   └── upload/          # File upload to R2
│   ├── builder/             # Form builder interface
│   │   └── [refKey]/        # Edit existing forms
│   ├── f/[refKey]/          # Public form display
│   └── login/               # Admin authentication
├── components/              # React Components
│   ├── BuilderForm.tsx      # Main form builder
│   ├── FormRenderer.tsx     # Public form display
│   ├── FieldEditor.tsx      # Field configuration
│   ├── FieldList.tsx        # Draggable field list
│   └── ui/                  # Reusable UI components
├── lib/                     # Core Libraries
│   ├── supabase.ts          # Database client
│   ├── google-auth.ts       # Google OAuth handler
│   ├── google-sheets.ts     # Sheets API integration
│   ├── auth-server.ts       # Server auth utilities
│   └── types.ts             # TypeScript definitions
├── hooks/                   # Custom React Hooks
│   ├── use-forms.ts         # Form data management
│   ├── use-settings.ts      # Settings management
│   └── use-auth.ts          # Authentication state
├── tests/                   # Test Suites
│   ├── api/                 # API tests
│   ├── e2e/                 # End-to-end tests
│   └── utils/               # Test utilities
└── docs/                    # Documentation
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- OpenAI API key (for AI features)
- Cloudflare R2 bucket (for file uploads)
- Google Cloud Console project (for Google Sheets integration)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/formdee.git
cd formdee

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Run database migrations
npm run setup:supabase

# Start development server
npm run dev
```

### Environment Variables

Create a `.env` file with the following:

```env
# Admin Authentication
ADMIN_API_KEY=your-secure-api-key-32-chars
ADMIN_UI_KEY=your-secure-ui-key-32-chars

# Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_BUCKET_NAME=your-bucket-name
R2_PUBLIC_URL=https://your-r2-public-url.com
NEXT_PUBLIC_R2_PUBLIC_URL=https://your-r2-public-url.com

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

## 📊 Database Schema

### Forms Table

```sql
CREATE TABLE forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  refKey VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  fields JSONB NOT NULL,
  slackWebhookUrl TEXT,
  googleSheetUrl TEXT,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

### Responses Table

```sql
CREATE TABLE responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  refKey VARCHAR(255) NOT NULL,
  formData JSONB NOT NULL,
  files JSONB,
  ip VARCHAR(45),
  userAgent TEXT,
  submittedAt TIMESTAMP DEFAULT NOW(),
  metadata JSONB,
  FOREIGN KEY (refKey) REFERENCES forms(refKey)
);
```

### Settings Table

```sql
CREATE TABLE settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  api_key TEXT,
  ai_model VARCHAR(50),
  google_credentials JSONB,
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm run test:all

# API Tests
npm run test:api:standard    # Core API tests (21 tests)
npm run test:api:full        # Comprehensive tests (70+ tests)

# E2E Tests
npm run test:e2e:standard    # Essential workflows (8 tests)
npm run test:e2e:full        # Complete scenarios (25+ tests)

# Quick smoke test
npm run test:quick

# Cleanup test data
npm run test:cleanup
```

### Test Coverage Areas

- ✅ All API endpoints (100% coverage)
- ✅ Authentication flows
- ✅ Form CRUD operations
- ✅ File upload handling
- ✅ Google Sheets integration
- ✅ AI form generation with GPT-5 handling
- ✅ Error scenarios and edge cases
- ✅ Performance and load testing

## 🚢 Deployment

### Docker Deployment

```bash
# Build and run with Docker
npm run deploy:docker:auto

# Or use Docker Compose
docker-compose up -d

# Check status
npm run docker:status

# View logs
npm run docker:logs
```

### Vercel Deployment

```bash
# Deploy to Vercel
npm run deploy:vercel
```

### Manual Deployment

```bash
# Build for production
npm run build:production

# Start production server
npm start
```

## 📚 API Documentation

### Authentication

All admin endpoints require either:

- Cookie-based authentication (via `/api/auth/login`)
- API key header: `x-admin-key: your-api-key`

### Core Endpoints

#### Forms Management

- `GET /api/forms` - List all forms or get specific form
- `POST /api/forms` - Create or update form
- `DELETE /api/forms` - Delete form

#### Form Submission

- `POST /api/submit` - Submit form data
- `POST /api/submit/supabase` - Submit with Supabase integration

#### AI Generation

- `POST /api/ai/generate` - Generate form from prompt
  - Supports GPT-4o, GPT-5-mini, GPT-5-nano models
  - Intelligent error handling for token exhaustion

#### Google Integration

- `GET /api/auth/google` - Initiate OAuth flow
- `GET /api/auth/google/callback` - OAuth callback
- `POST /api/forms/validate-google-sheet` - Validate sheet URL
- `POST /api/forms/export-responses` - Export to Google Sheets

#### File Upload

- `POST /api/upload` - Upload files to Cloudflare R2

## 🔐 Security Features

- **Authentication**: Secure cookie-based sessions with HTTP-only cookies
- **Authorization**: Multi-layer API protection
- **Input Validation**: Zod schemas for all inputs
- **SQL Injection Protection**: Parameterized queries via Supabase
- **XSS Protection**: Input sanitization and CSP headers
- **File Upload Security**: Type validation, size limits, virus scanning
- **Rate Limiting**: Request throttling for API endpoints
- **CORS Configuration**: Strict origin validation

## 🤝 Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/) and [TypeScript](https://www.typescriptlang.org/)
- Database by [Supabase](https://supabase.com/)
- File storage by [Cloudflare R2](https://www.cloudflare.com/products/r2/)
- AI powered by [OpenAI](https://openai.com/)
- UI components from [Ant Design](https://ant.design/)

---

**FormDee v1.3.0** - Built with ❤️ for developers who need powerful, reliable form solutions.
