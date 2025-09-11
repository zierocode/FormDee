# FormDee API Documentation v1.3.0

## Overview

FormDee provides a comprehensive REST API for form management, submission handling, AI generation, and third-party integrations. All API endpoints are built with Next.js API routes and follow RESTful conventions.

## Base URL

```
Development: http://localhost:3000
Production: https://your-domain.com
```

## Authentication

FormDee uses two authentication methods:

### 1. Cookie-Based Authentication

Used for browser-based admin access:

```javascript
POST /api/auth/login
{
  "password": "your-admin-ui-key"
}
```

### 2. API Key Authentication

Used for programmatic access:

```javascript
Headers: {
  "x-admin-key": "your-admin-api-key"
}
```

## API Endpoints

### 🔐 Authentication

#### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "password": "admin-ui-key"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Logged in successfully"
}
```

#### Logout

```http
POST /api/auth/logout
```

#### Check Authentication Status

```http
GET /api/auth/check
```

**Response:**

```json
{
  "authenticated": true,
  "user": "admin"
}
```

### 📝 Forms Management

#### List All Forms

```http
GET /api/forms
x-admin-key: your-api-key
```

**Response:**

```json
[
  {
    "id": "uuid",
    "refKey": "contact-form",
    "title": "Contact Form",
    "description": "Get in touch with us",
    "fields": [...],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
]
```

#### Get Single Form

```http
GET /api/forms?refKey=contact-form
```

#### Create/Update Form

```http
POST /api/forms
x-admin-key: your-api-key
Content-Type: application/json

{
  "refKey": "contact-form",
  "title": "Contact Form",
  "description": "Get in touch",
  "fields": [
    {
      "key": "name",
      "label": "Full Name",
      "type": "text",
      "required": true,
      "placeholder": "Enter your name"
    },
    {
      "key": "email",
      "label": "Email",
      "type": "email",
      "required": true,
      "pattern": "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$"
    }
  ],
  "slackWebhookUrl": "https://hooks.slack.com/...",
  "googleSheetUrl": "https://docs.google.com/spreadsheets/d/..."
}
```

#### Delete Form

```http
DELETE /api/forms
x-admin-key: your-api-key
Content-Type: application/json

{
  "refKey": "contact-form"
}
```

### 🤖 AI Generation

#### Generate Form with AI

```http
POST /api/ai/generate
x-admin-key: your-api-key
Content-Type: application/json

{
  "prompt": "Create a job application form with resume upload"
}
```

**Response:**

```json
{
  "title": "Job Application Form",
  "description": "Apply for open positions",
  "refKey": "job-application",
  "fields": [
    {
      "key": "full_name",
      "label": "Full Name",
      "type": "text",
      "required": true
    },
    {
      "key": "resume",
      "label": "Upload Resume",
      "type": "file",
      "acceptedTypes": [".pdf", ".doc", ".docx"],
      "maxFileSize": 5242880,
      "required": true
    }
  ]
}
```

**Supported Models:**

- `gpt-4o` (Recommended)
- `gpt-4o-mini`
- `gpt-5-mini` (May exhaust reasoning tokens)
- `gpt-5-nano` (May exhaust reasoning tokens)

**Error Handling:**
For GPT-5 models, if reasoning tokens are exhausted:

```json
{
  "error": "AI model used reasoning tokens but generated no content. Try using GPT-4o instead of GPT-5 models for form generation."
}
```

### 📤 Form Submission

#### Submit Form Data

```http
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

#### Submit to Supabase

```http
POST /api/submit/supabase
Content-Type: application/json

{
  "refKey": "contact-form",
  "formData": {
    "name": "John Doe",
    "email": "john@example.com"
  },
  "files": {
    "resume": "https://r2.example.com/file.pdf"
  }
}
```

### 📊 Responses

#### Get Form Responses

```http
GET /api/responses?refKey=contact-form&limit=10&offset=0
x-admin-key: your-api-key
```

**Response:**

```json
{
  "responses": [
    {
      "id": "uuid",
      "refKey": "contact-form",
      "formData": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "files": {},
      "ip": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "submittedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 100,
  "limit": 10,
  "offset": 0
}
```

### 📁 File Upload

#### Upload File

```http
POST /api/upload
Content-Type: multipart/form-data

FormData:
  - file: (binary)
  - formId: "contact-form"
```

**Response:**

```json
{
  "url": "https://r2.example.com/contact-form-1234567890-resume.pdf",
  "key": "contact-form-1234567890-resume.pdf",
  "size": 102400,
  "type": "application/pdf"
}
```

### 🔧 Settings

#### Get Settings

```http
GET /api/settings
x-admin-key: your-api-key
```

**Response:**

```json
{
  "model": "gpt-4o",
  "hasApiKey": true,
  "googleAuthEnabled": true
}
```

#### Update Settings

```http
POST /api/settings
x-admin-key: your-api-key
Content-Type: application/json

{
  "model": "gpt-4o",
  "apiKey": "sk-proj-..."
}
```

#### Test Settings

```http
POST /api/settings/test
x-admin-key: your-api-key
Content-Type: application/json

{
  "aiModel": "gpt-4o",
  "aiApiKey": "sk-proj-..."
}
```

### 📊 Google Sheets Integration

#### Initiate Google OAuth

```http
GET /api/auth/google
x-admin-key: your-api-key
```

**Response:** Redirects to Google OAuth consent screen

#### OAuth Callback

```http
GET /api/auth/google/callback?code=auth-code&state=state
```

#### Check Google Auth Status

```http
GET /api/auth/google/status
x-admin-key: your-api-key
```

**Response:**

```json
{
  "authenticated": true,
  "email": "user@example.com",
  "expiresAt": "2024-01-01T00:00:00Z"
}
```

#### Logout from Google

```http
POST /api/auth/google/logout
x-admin-key: your-api-key
```

#### Validate Google Sheet URL

```http
POST /api/forms/validate-google-sheet
x-admin-key: your-api-key
Content-Type: application/json

{
  "sheetUrl": "https://docs.google.com/spreadsheets/d/1234567890/edit"
}
```

**Response:**

```json
{
  "valid": true,
  "sheetId": "1234567890",
  "sheetName": "Sheet1"
}
```

#### Test Google Sheet Connection

```http
POST /api/forms/test-google-sheet
x-admin-key: your-api-key
Content-Type: application/json

{
  "sheetId": "1234567890",
  "sheetName": "Sheet1"
}
```

#### Export Responses to Google Sheets

```http
POST /api/forms/export-responses
x-admin-key: your-api-key
Content-Type: application/json

{
  "refKey": "contact-form",
  "sheetUrl": "https://docs.google.com/spreadsheets/d/1234567890/edit"
}
```

**Response:**

```json
{
  "success": true,
  "exported": 25,
  "sheetUrl": "https://docs.google.com/spreadsheets/d/1234567890/edit"
}
```

### 🔔 Slack Integration

#### Test Slack Webhook

```http
POST /api/forms/test-slack
x-admin-key: your-api-key
Content-Type: application/json

{
  "webhookUrl": "https://hooks.slack.com/services/..."
}
```

**Response:**

```json
{
  "success": true,
  "message": "Test message sent successfully"
}
```

### 🏥 Health Check

#### Basic Health Check

```http
GET /api/health
```

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### Detailed Health Check

```http
GET /api/health?detailed=true
```

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "services": {
    "database": "connected",
    "storage": "connected",
    "ai": "configured"
  },
  "version": "1.3.0",
  "environment": "production"
}
```

## Error Responses

All endpoints return consistent error responses:

### 400 Bad Request

```json
{
  "error": "Invalid request data",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### 401 Unauthorized

```json
{
  "error": "Unauthorized access"
}
```

### 404 Not Found

```json
{
  "error": "Form not found"
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal server error",
  "message": "Database connection failed"
}
```

## Rate Limiting

- **Public endpoints**: 100 requests/minute per IP
- **Authenticated endpoints**: 1000 requests/minute per API key
- **File uploads**: 10 requests/minute per IP

## Field Types

Supported field types for forms:

- `text` - Single line text input
- `textarea` - Multi-line text input
- `email` - Email input with validation
- `number` - Numeric input
- `date` - Date picker
- `select` - Dropdown selection
- `radio` - Radio button group
- `checkbox` - Multiple checkboxes
- `file` - File upload

## Field Validation Options

```javascript
{
  "required": true,                    // Field is required
  "pattern": "^[A-Za-z]+$",            // Regex pattern
  "min": 0,                            // Minimum value (number/date)
  "max": 100,                          // Maximum value (number/date)
  "minLength": 3,                      // Minimum text length
  "maxLength": 255,                    // Maximum text length
  "acceptedTypes": [".pdf", ".doc"],   // File types (file field)
  "maxFileSize": 5242880,              // Max file size in bytes
  "allowMultiple": false               // Allow multiple files
}
```

## WebSocket Events (Coming Soon)

Real-time updates for form submissions:

```javascript
ws://localhost:3000/api/ws

// Subscribe to form submissions
{
  "type": "subscribe",
  "refKey": "contact-form"
}

// Receive submission events
{
  "type": "submission",
  "refKey": "contact-form",
  "data": {...}
}
```

## SDK Examples

### JavaScript/TypeScript

```typescript
import { FormDeeClient } from '@formdee/client';

const client = new FormDeeClient({
  baseUrl: 'https://api.example.com',
  apiKey: 'your-api-key'
});

// Create a form
const form = await client.forms.create({
  refKey: 'survey-2024',
  title: 'Customer Survey',
  fields: [...]
});

// Submit to form
const response = await client.forms.submit('survey-2024', {
  rating: 5,
  feedback: 'Great service!'
});
```

### Python

```python
from formdee import FormDeeClient

client = FormDeeClient(
    base_url='https://api.example.com',
    api_key='your-api-key'
)

# Get form responses
responses = client.responses.list(
    ref_key='survey-2024',
    limit=100
)

# Export to Google Sheets
result = client.google.export_responses(
    ref_key='survey-2024',
    sheet_url='https://docs.google.com/...'
)
```

## Postman Collection

Download our [Postman Collection](https://api.formdee.com/postman) for easy API testing.

## Support

For API support, please contact:

- GitHub Issues: [github.com/formdee/issues](https://github.com/formdee/issues)
- Email: api-support@formdee.com
- Documentation: [docs.formdee.com](https://docs.formdee.com)

---

**FormDee API v1.3.0** - Last updated: January 2025
