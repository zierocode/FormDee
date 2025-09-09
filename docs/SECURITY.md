# Security and Authentication Guide

## Supabase Authentication System

FormDee uses a secure Supabase-based authentication system with SHA-256 hashed API keys, rate limiting, and comprehensive audit trails.

### Authentication Keys

#### 1. UI Key (ADMIN_UI_KEY)

- **Purpose**: Browser and UI access only
- **Format**: Any custom string (no restrictions)
- **Used for**:
  - Login page (`/login`)
  - Builder interface (`/builder`)
- **Storage**: HTTP-only cookies after login
- **Security**: SHA-256 hashed in database
- **Management**: CLI-only via SSH
- **Limit**: Only one UI key allowed
- **Example**: Can be simple like `mypassword` or complex

#### 2. API Key (ADMIN_API_KEY)

- **Purpose**: Programmatic API access only
- **Format**: Random 43-character string (no prefix)
- **Used for**:
  - External integrations
  - CI/CD pipelines
  - Automated scripts
  - Third-party applications
- **Storage**: Never stored in browser
- **Security**: SHA-256 hashed in database
- **Management**: CLI-only via SSH
- **Limit**: Only one API key allowed
- **Example**: `LT-DBsreC1ftA9xLhe8O36olYwWulUuGscYPcd8MDko`

### Authentication Methods

The system detects the authentication source and validates accordingly:

| Source                                  | Priority | Accepted Keys | Use Case                     |
| --------------------------------------- | -------- | ------------- | ---------------------------- |
| **Header** (`x-admin-key`, `x-api-key`) | 1        | API Key ONLY  | API clients, scripts         |
| **Cookie** (`admin_key`)                | 2        | UI Key ONLY   | Browser after login          |
| **Query** (`?adminKey=`)                | 3        | API Key ONLY  | Testing, simple integrations |

**⚠️ STRICT ENFORCEMENT**: UI keys are NEVER accepted for API access, regardless of source.

### API Endpoints Security

#### Public Endpoints (No Auth Required)

- `GET /api/forms?refKey={key}` - Get single form configuration
- `POST /api/submit` - Submit form data
- `GET /api/health` - Health check

#### Protected Endpoints (Auth Required)

##### Forms Management

- `GET /api/forms` - List all forms (UI/API key)
- `POST /api/forms` - Create/update form (UI/API key)
- `DELETE /api/forms` - Delete form (UI/API key)

##### Additional Operations

- `GET /api/forms/sheets` - Sheet metadata (UI/API key)
- `POST /api/forms/test-slack` - Test Slack webhook (UI/API key)
- `GET /api/responses` - Get form responses (UI/API key)
- `POST /api/settings` - Update settings (UI key only)
- `POST /api/ai/generate` - Generate form with AI (UI/API key)

### Implementation Examples

#### Browser/UI Access (JavaScript)

```javascript
// Login with UI key
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ adminKey: 'your-ui-key' }),
})

// After login, cookie is set automatically
// Subsequent requests use the cookie
const forms = await fetch('/api/forms')
```

#### API Access (cURL)

```bash
# Using API key in header (recommended)
curl -H "x-api-key: your-api-key" \
  https://your-domain.com/api/forms

# Using API key in query (backward compatibility)
curl "https://your-domain.com/api/forms?adminKey=your-api-key"
```

#### API Access (Node.js)

```javascript
// Using API key in header
const response = await fetch('https://your-domain.com/api/forms', {
  headers: {
    'x-api-key': process.env.ADMIN_API_KEY,
    'Content-Type': 'application/json',
  },
})
```

### Security Features

1. **SHA-256 Hashing**
   - All keys are hashed before storage
   - Original keys cannot be recovered from database
   - Keys are only shown once during generation

2. **Rate Limiting**
   - Default: 60 requests per minute
   - Default: 1000 requests per hour
   - Configurable per key

3. **Audit Trail**
   - Every API request is logged
   - Tracks IP, endpoint, method, response time
   - Usage statistics available in dashboard

4. **Key Management**
   - Keys can have expiration dates
   - Revocation with reason tracking
   - Usage count and last used timestamp
   - Permissions system (JSONB for flexibility)

### Security Best Practices

1. **Never share or expose keys**
   - Keep UI key private to authorized admin users
   - Keep API key in secure environment variables
   - Never commit keys to version control
   - Keys are only shown once when generated

2. **Use appropriate keys**
   - Browser access → UI key only
   - Programmatic access → API key only
   - Never use API key in frontend code

3. **Rotate keys regularly**
   - Use the management UI at `/admin/api-keys`
   - Or use CLI: `npx tsx scripts/generate-api-keys.ts`
   - Update all integrations when rotating keys

4. **Monitor access**
   - Check audit logs in Supabase
   - Review usage in `/admin/api-keys`
   - Set up alerts for rate limit violations

### Error Messages

| Error                                              | Meaning                          | Solution                |
| -------------------------------------------------- | -------------------------------- | ----------------------- |
| "You are not authorized to perform this action"    | No key provided                  | Include valid key       |
| "Invalid key type. This endpoint requires UI key"  | API key used where UI key needed | Use UI key for browser  |
| "Invalid key type. This endpoint requires API key" | UI key used where API key needed | Use API key for scripts |

### Environment Variables

```env
# UI Key - for browser/admin access (generated via CLI)
ADMIN_UI_KEY=fmd_ui_YOUR_GENERATED_KEY_HERE

# API Key - for programmatic access (generated via CLI)
ADMIN_API_KEY=fmd_api_YOUR_GENERATED_KEY_HERE

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Other settings
NODE_ENV=production
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

### Key Management (CLI Only)

All key management must be done via SSH access to the server:

```bash
# Initial setup (interactive)
npx tsx scripts/setup-keys.ts

# Manage keys (set UI key or regenerate API key)
npx tsx scripts/manage-keys.ts

# Non-interactive reset for testing
npx tsx scripts/reset-keys.ts
```

**Features:**

- Set custom UI key (any string)
- Generate random API key (auto-updates .env)
- View current keys (shows prefix only)
- Only one key per type allowed
- Automatic .env file updates

### Migration to Supabase Auth

When migrating from plain text keys to Supabase Auth:

1. **Run the setup SQL** in Supabase: `supabase-setup.sql`
2. **Generate new keys** using: `npx tsx scripts/generate-initial-keys.ts`
3. **Update .env** with the new generated keys
4. **Logout and login** with the new UI key in browser
5. **Update API integrations** to use the new API key
6. **Test thoroughly** before deploying to production

### Troubleshooting

#### "Invalid key type" errors after update

- Check you're using the correct key for your access method
- Browser/cookie requests need UI key
- API/header requests need API key

#### Login not working

- Verify ADMIN_UI_KEY is set correctly
- Check cookie settings in production
- Ensure HTTPS in production environment

#### API integration failing

- Confirm using ADMIN_API_KEY not UI key
- Pass key in header not cookie
- Check key hasn't been rotated
