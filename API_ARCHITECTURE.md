# API Architecture - Authentication Rules

## 🔴 CRITICAL SECURITY RULE

**NEVER modify an endpoint to accept both UI and API keys using `withApiAuth(req, 'any')`**

If you need UI access to API data, create a separate `/api/ui/*` endpoint instead.

## Endpoint Structure

### `/api/*` - API Endpoints (API Key Only)

These endpoints are for programmatic/external access:

- Authentication: `withApiAuth(req, 'api')`
- Header: `x-api-key: YOUR_API_KEY`
- Examples:
  - `/api/forms` - Form CRUD operations
  - `/api/responses` - Response data
  - `/api/storage-stats` - Detailed storage statistics
  - `/api/submit` - Form submission (public)

### `/api/ui/*` - UI Endpoints (UI Key Only)

These endpoints are for browser/dashboard access:

- Authentication: `withApiAuth(req, 'ui')`
- Method: Cookie-based authentication
- Examples:
  - `/api/ui/storage` - Storage stats for dashboard
  - `/api/auth/google/*` - Google OAuth flows

### Public Endpoints (No Auth)

- `/api/health` - Health check
- `/api/submit` - Public form submission
- `/api/forms?refKey=xxx` - Get single form (public)

## Creating New Endpoints

### Need UI access to API data?

❌ **WRONG**: Modify API endpoint to accept UI keys

```typescript
// DON'T DO THIS
const auth = await withApiAuth(req, 'any') // NEVER!
```

✅ **CORRECT**: Create a UI-specific endpoint

```typescript
// /api/ui/new-feature/route.ts
const auth = await withApiAuth(req, 'ui')
```

### Why This Matters

1. **Security**: Each key type has specific privileges
2. **Audit Trail**: Clear separation of access patterns
3. **Maintenance**: Easy to understand who can access what
4. **Compliance**: Follows principle of least privilege

## Key Types

| Key Type | Purpose             | Access Method | Can Access            |
| -------- | ------------------- | ------------- | --------------------- |
| API Key  | Programmatic access | HTTP Header   | `/api/*` endpoints    |
| UI Key   | Browser access      | Cookie        | `/api/ui/*` endpoints |

## Examples of Correct Implementation

### API Endpoint

```typescript
// /api/storage-stats/route.ts
export async function GET(req: NextRequest) {
  const auth = await withApiAuth(req, 'api') // API key only
  // Full statistics for programmatic access
}
```

### UI Endpoint

```typescript
// /api/ui/storage/route.ts
export async function GET(req: NextRequest) {
  const auth = await withApiAuth(req, 'ui') // UI key only
  // Simplified data for dashboard display
}
```

## Remember

- **Never** use `withApiAuth(req, 'any')` for convenience
- **Always** create separate endpoints for different auth types
- **Document** which key type each endpoint requires
