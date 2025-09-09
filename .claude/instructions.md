# FormDee Development Instructions

## Code Standards & Patterns

### TypeScript

- **Strict mode enabled** - No `any` types allowed
- Use proper type definitions from `lib/types.ts`
- Prefix unused parameters with `_` (e.g., `_req`, `_error`)
- All functions must have return types for all code paths

### React Patterns

- Use functional components with hooks
- **React Hook Form + Zod** for all form validation
- **TanStack Query** for all data fetching
- **Ant Design** for UI components
- Custom hooks in `hooks/` directory

### Form Implementation Standard

```typescript
// 1. Create Zod schema in schemas/
export const myFormSchema = z.object({
  field: z.string().min(1, 'Required'),
})

// 2. Use with React Hook Form
const form = useForm<MyFormData>({
  resolver: zodResolver(myFormSchema),
  defaultValues: { field: '' },
})

// 3. TanStack Query for submission
const mutation = useMutation({
  mutationFn: (data: MyFormData) => submitForm(data),
  onSuccess: () => toast.success('Success!'),
})
```

### File Organization

- **API routes**: `app/api/[endpoint]/route.ts`
- **Components**: `components/[Feature][Type].tsx`
- **Hooks**: `hooks/use-[feature].ts`
- **Schemas**: `schemas/[feature]Schema.ts`
- **Types**: `lib/types.ts`

### Testing Requirements

- All new features require tests
- Use `npm run test:api:standard` for API testing
- Use `npm run test:e2e:standard` for E2E testing
- Test data cleanup is automatic

## Architecture Decisions

### Data Flow

1. **Client** → React Hook Form → Zod validation
2. **API** → Server validation → Supabase
3. **State** → TanStack Query → Optimistic updates
4. **Files** → Cloudflare R2 → Public URLs in DB

### Authentication

- Admin-only form management
- Cookie-based sessions
- API key authentication for external access
- Multi-layer security validation

### Database Schema

- **Forms table**: Configuration and fields
- **Responses table**: All form submissions
- **Settings table**: Admin configuration
- File URLs stored as metadata

## Development Workflow

### Adding New Features

1. Create Zod schema in `schemas/`
2. Add types to `lib/types.ts`
3. Create API route in `app/api/`
4. Build React component with hooks
5. Add tests for both API and UI
6. Update documentation

### Bug Fixes

1. Run `npm run typecheck` first
2. Fix TypeScript errors before ESLint
3. Use `npm run test:all:standard` to verify
4. Test production build with `npm run build:production`

### Before Deployment

```bash
npm run build:production  # Must pass
npm run test:all          # All tests must pass
```

## Common Patterns

### Error Handling

```typescript
// API routes
return NextResponse.json(
  { ok: false, error: { code: "400", message: "Bad request" } },
  { status: 400 }
)

// Components
const { data, error, isLoading } = useQuery({...})
if (error) return <div>Error: {error.message}</div>
```

### Form Validation

```typescript
// Real-time validation with visual feedback
const form = useForm({
  resolver: zodResolver(schema),
  mode: 'onChange', // Enable real-time validation
})
```

### Data Fetching

```typescript
// Always use TanStack Query
const { data, isLoading, error } = useQuery({
  queryKey: ['feature', id],
  queryFn: () => api.getFeature(id),
  staleTime: 1000 * 60 * 5, // 5 minutes
})
```

## Security Guidelines

- Never commit API keys or secrets
- Validate all inputs on both client and server
- Use proper CORS headers
- Implement rate limiting for public endpoints
- Sanitize user input before database storage

## Performance Guidelines

- Use React.lazy for code splitting
- Implement proper loading states
- Optimize images and assets
- Use Suspense boundaries appropriately
- Cache API responses with TanStack Query
