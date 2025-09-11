# Changelog

All notable changes to FormDee will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2025-01-11

### 🎉 Major Release - AI Enhancements & Google Sheets Integration

### Added

- 🤖 **Enhanced GPT-5 Model Support**
  - Intelligent detection of reasoning token exhaustion
  - Helpful error messages suggesting GPT-4o when tokens are exhausted
  - Improved system prompts for GPT-5 models
  - Console logging for debugging AI responses

- 📊 **Google Sheets Integration**
  - Complete OAuth 2.0 authentication flow
  - Export form responses to Google Sheets
  - Validate Google Sheet URLs
  - Test sheet connections before export
  - Automatic column creation from form fields

- 🧪 **Comprehensive Test Coverage**
  - Added 13 new AI generation tests
  - Added 9 Google integration tests
  - Merged all tests into comprehensive suite
  - Total test count: 70+ API tests, 25+ E2E tests

- 📚 **Documentation**
  - Complete API documentation (API_DOCUMENTATION.md)
  - Updated README with v1.3.0 features
  - Architecture diagrams and database schema
  - Environment variable documentation

### Changed

- Improved error handling in AI generation endpoint
- Enhanced test runner with better categorization
- Updated comprehensive test suite structure
- Optimized API response handling

### Fixed

- GPT-5 empty content error handling
- Token exhaustion detection and reporting
- Test cleanup for Google integration tests
- API key validation in settings

### Security

- Added Google OAuth token encryption
- Improved API key handling in tests
- Enhanced input validation for Google Sheets URLs

## [1.2.1] - 2025-01-09

### Added

- Smart E2E Head Mode with environment detection
- Enhanced Playwright report management
- Cross-platform testing support

### Changed

- Improved form builder UX with delete functionality
- Consistent notification placement (bottom-right)
- Enhanced error pages with beautiful design

### Fixed

- TypeScript compilation errors
- API key persistence in tests
- Authentication flow error messages

## [1.2.0] - 2025-01-07

### Added

- AI-powered form generation using OpenAI
- Supabase database integration
- Cloudflare R2 file storage
- Comprehensive 4-tier testing system
- Docker deployment support

### Changed

- Migrated from Google Sheets to Supabase backend
- Improved form builder interface
- Enhanced validation system

## [1.1.0] - 2024-12-15

### Added

- Drag and drop form builder
- Real-time form preview
- Advanced field validation
- Slack webhook integration

### Changed

- Redesigned UI with Ant Design
- Improved responsive design
- Enhanced accessibility

## [1.0.0] - 2024-11-01

### Initial Release

- Basic form builder
- Form submission handling
- Google Sheets integration
- Admin authentication
- File upload support

---

## Upgrade Guide

### From 1.2.x to 1.3.0

1. **Update Dependencies**

   ```bash
   npm install
   ```

2. **Environment Variables**
   Add Google OAuth credentials if using Google Sheets:

   ```env
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
   ```

3. **Database Migration**
   No database changes required for this version.

4. **Test Your Integration**
   ```bash
   npm run test:api:full
   ```

### From 1.1.x to 1.2.x

1. **Database Migration Required**
   - Migrate from Google Sheets to Supabase
   - Run: `npm run setup:supabase`

2. **Update Environment Variables**
   - Add Supabase credentials
   - Add Cloudflare R2 credentials

3. **Update API Calls**
   - Change `/api/sheets` to `/api/forms`
   - Update submission endpoint to `/api/submit/supabase`

## Breaking Changes

### v1.3.0

- None - Fully backward compatible

### v1.2.0

- Google Sheets as primary storage deprecated
- API endpoint changes for form management
- New authentication system

## Deprecated Features

### Will be removed in v2.0.0

- Direct Google Sheets storage (use Supabase + export instead)
- Legacy `/api/sheets` endpoints
- Old authentication tokens

## Support

For migration assistance or questions:

- GitHub Issues: [github.com/formdee/issues](https://github.com/formdee/issues)
- Documentation: [docs.formdee.com](https://docs.formdee.com)
- Email: support@formdee.com

---

[Unreleased]: https://github.com/formdee/formdee/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/formdee/formdee/compare/v1.2.1...v1.3.0
[1.2.1]: https://github.com/formdee/formdee/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/formdee/formdee/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/formdee/formdee/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/formdee/formdee/releases/tag/v1.0.0
