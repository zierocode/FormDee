# Changelog

All notable changes to FormDee will be documented in this file.

## [1.1.0] - 2025-01-08

### ✨ New Features
- **AI-Powered Form Generation**: Create forms using natural language prompts with AI
- **Settings Management**: Configure AI model and API key through dedicated Settings page
- **AI Model Support**: Added GPT-5-mini as the default AI model
- **Test Configuration**: Validate AI settings before saving with real API testing
- **Generic AI Provider Support**: System designed to work with various AI providers

### 🔧 Improvements
- Enhanced authentication system with admin key context support
- Better error messages guiding users to Settings when AI is not configured
- Custom dropdown component matching form creator design
- Loading animations during AI processing
- Tips for better AI form generation results

### 🗑️ Cleanup & Optimization
- Removed unused test files and artifacts
- Consolidated deployment scripts (kept deploy-production.sh as primary)
- Removed unused server implementation (gas-simple.ts)
- Cleaned up playwright screenshots and test results
- Optimized project structure

### 📚 Documentation
- Updated to version 1.1.0
- Added CHANGELOG.md for version tracking
- Streamlined documentation to reduce redundancy

## [1.0.0] - 2025-01-07

### Initial Release
- Dynamic form builder with drag-and-drop interface
- Google Sheets integration for form storage
- File upload support with Google Drive
- Real-time form submissions
- Comprehensive admin authentication
- Production-ready deployment scripts
- 4-tier testing system
- International support with Unicode handling
- Data migration tools for form structure changes