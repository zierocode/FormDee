# Google Sheets Integration Setup Guide

This guide explains how to set up Google Sheets API integration with user-based OAuth2 authentication for FormDee.

## Prerequisites

- Google Account
- Access to Google Cloud Console
- FormDee application with environment variables

## Authentication Method

FormDee now uses **user-based OAuth2 authentication** instead of service accounts. This means:

- Users authenticate with their own Google accounts
- No need to share spreadsheets with service accounts
- Users can access their own Google Sheets directly
- More secure and user-friendly experience

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note down your Project ID

## Step 2: Enable Google Sheets API

1. In Google Cloud Console, go to **APIs & Services > Library**
2. Search for "Google Sheets API"
3. Click on it and click **Enable**

## Step 3: Create OAuth2 Credentials

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth client ID**
3. If prompted, configure the OAuth consent screen:
   - **User Type**: External (for personal use) or Internal (for organization)
   - **Application name**: FormDee
   - **User support email**: Your email
   - **Developer contact information**: Your email
4. Choose **Web application** as the application type
5. Fill in the details:
   - **Name**: FormDee OAuth Client
   - **Authorized redirect URIs**: Add your callback URL:
     - For development: `http://localhost:3000/api/auth/google/callback`
     - For production: `https://yourdomain.com/api/auth/google/callback`
6. Click **Create**
7. Note down the **Client ID** and **Client Secret**

## Step 4: Update Environment Variables

Add these to your `.env` file:

```env
# Google Sheets API Configuration (User OAuth2 Authentication)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
NEXTAUTH_SECRET=your-secret-key-for-jwt-signing
```

**Important Notes:**

- Replace `your-client-id` and `your-client-secret` with actual values from Google Cloud Console
- Generate a secure random string for `NEXTAUTH_SECRET`
- Update `GOOGLE_REDIRECT_URI` for production deployment
- Never commit these credentials to version control

## Step 5: OAuth Consent Screen (if using External)

If you selected "External" for the OAuth consent screen:

1. Go to **APIs & Services > OAuth consent screen**
2. Add your email to **Test users** (for testing)
3. For production, you may need to verify your application

## Step 6: Test the Integration

1. Restart your FormDee application
2. Go to the form builder
3. Enable Google Sheets integration
4. Click **Authenticate** to sign in with your Google account
5. Grant permissions to FormDee to access your Google Sheets
6. Enter your Google Sheet URL
7. Click the **Test** button
8. You should see "Google Sheet connection test successful!"

## How It Works

1. **User Authentication**: Users authenticate with their own Google accounts
2. **OAuth2 Flow**: FormDee redirects users to Google for permission
3. **Access Tokens**: FormDee receives temporary access tokens
4. **Direct Access**: FormDee uses user tokens to access their Google Sheets
5. **No Sharing Required**: Users can access their own sheets without sharing

## Troubleshooting

### Common Issues

1. **"Google OAuth not configured"**
   - Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set correctly
   - Restart the application after adding environment variables

2. **"Authentication failed"**
   - Verify the OAuth redirect URI matches your Google Cloud Console settings
   - Check that the OAuth consent screen is properly configured

3. **"Permission denied"**
   - Make sure the user owns the Google Sheet or has edit access
   - Verify the user granted all requested permissions during OAuth

4. **"Spreadsheet not found"**
   - Check that the Google Sheet URL is correct
   - Ensure the authenticated user has access to the sheet

5. **OAuth redirect URI mismatch**
   - Ensure the redirect URI in your `.env` file matches the one configured in Google Cloud Console
   - For development: `http://localhost:3000/api/auth/google/callback`
   - For production: `https://yourdomain.com/api/auth/google/callback`

### Testing Checklist

- [ ] Google Sheets API is enabled in Google Cloud Console
- [ ] OAuth2 client is created with correct redirect URIs
- [ ] Environment variables are set correctly
- [ ] OAuth consent screen is configured
- [ ] User is added to test users (for external apps)
- [ ] Application is restarted after adding environment variables

### Security Best Practices

1. **Never commit credentials to version control**
2. **Use environment variables for all secrets**
3. **Use HTTPS in production for OAuth callbacks**
4. **Regularly review OAuth consent screen settings**
5. **Monitor OAuth usage in Google Cloud Console**

## Additional Resources

- [Google Sheets API Documentation](https://developers.google.com/sheets/api)
- [Google Cloud Service Accounts](https://cloud.google.com/iam/docs/service-accounts)
- [Environment Variables Best Practices](https://12factor.net/config)

## Support

If you encounter issues:

1. Check the server logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test the connection using the built-in test feature
4. Refer to the troubleshooting section above
