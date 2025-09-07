# FormDee - Dynamic Form Builder

## 🚀 MVP Ready - Production Status
This project is production-ready and optimized for deployment. Key features completed:
- ✅ Full form builder with drag-and-drop field management
- ✅ Google Sheets integration for data storage
- ✅ File upload support with Google Drive integration  
- ✅ Slack notifications for form submissions
- ✅ Comprehensive help modals and user guidance
- ✅ Security headers and performance optimizations
- ✅ API-ready for external developers
- ✅ Mobile-responsive design

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
    /forms         # API endpoints for form CRUD operations
    /submit        # Form submission endpoint
  /builder         # Form builder interface
    /[refKey]      # Edit existing form
  /f
    /[refKey]      # Public form display/submission
/components
  BuilderForm.tsx  # Main form builder component
  FormsList.tsx    # List of existing forms
  FieldEditor.tsx  # Field configuration editor
/lib
  /api.ts          # API client functions
  /validation.ts   # Form validation schemas
  /types.ts        # TypeScript type definitions
```

## Key Features

### 1. Form Management
- Create new forms with unique reference keys
- Edit existing forms
- Configure Google Sheets for response storage
- Add multiple field types (text, email, number, date, textarea, select, radio, checkbox)
- Field validation with required/optional, patterns, min/max values

### 2. Google Sheets Integration
- Master sheet stores all form configurations
- Each form can have its own response sheet
- Automatic header generation based on form fields
- Form submissions are saved with timestamp, IP, user agent, and field data

### 3. API Endpoints

#### GET /api/forms
- With `refKey` param: Returns specific form (public)
- With admin key: Returns all forms
- Fixed to properly return 404 for non-existent forms

#### POST /api/forms
- Creates or updates form configuration
- Requires admin authentication
- Updates master Google Sheet

#### POST /api/submit
- Handles form submissions
- Saves to configured Google Sheet
- No authentication required

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

## Testing Commands
```bash
# Run development server
npm run dev

# Test API endpoints
curl -s "http://localhost:3000/api/forms?refKey=example" | jq
curl -s "http://localhost:3000/api/forms?adminKey=YOUR_KEY" | jq

# Lint and typecheck (if configured)
npm run lint
npm run typecheck
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

## 🚢 Production Deployment

### Build and Deploy Commands
```bash
# Install dependencies
npm install

# Run production build
npm run build

# Start production server
npm start

# Optional: Run bundle analyzer
ANALYZE=true npm run build
```

### Environment Variables (Production)
```env
GAS_BASE_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
ADMIN_API_KEY=your-secure-admin-api-key
ADMIN_UI_KEY=your-secure-admin-ui-key
NEXT_PUBLIC_BASE_URL=https://your-production-domain.com
NODE_ENV=production
```

### Security Checklist
- ✅ Security headers configured in next.config.mjs
- ✅ API keys properly secured
- ✅ CORS protection enabled
- ✅ Input validation on all endpoints
- ✅ XSS protection headers
- ✅ Content type validation

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