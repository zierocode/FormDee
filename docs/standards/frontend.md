# Frontend Development Standards

This document outlines the mandatory frontend development standards for FormDee.

## 🎯 Core Principles

1. **TypeScript First**: Zero `any` types, comprehensive type coverage
2. **Modern React**: Functional components, hooks, and declarative patterns
3. **Performance Focused**: Minimal re-renders and optimized bundles
4. **Accessibility**: WCAG 2.1 AA compliance by default
5. **Consistency**: Standardized patterns across all features

## 📚 Required Libraries

### ✅ Approved Stack

| Category          | Library                   | Purpose                 | Alternative             | Status    |
| ----------------- | ------------------------- | ----------------------- | ----------------------- | --------- |
| **Forms**         | React Hook Form + Zod     | Form state & validation | ❌ Formik, custom hooks | Mandatory |
| **Data Fetching** | TanStack Query            | Server state management | ❌ SWR, custom fetch    | Mandatory |
| **UI Components** | Ant Design                | Component library       | ❌ Material-UI, Chakra  | Mandatory |
| **Styling**       | Tailwind CSS              | Utility-first CSS       | ❌ Styled-components    | Mandatory |
| **Drag & Drop**   | hello-pangea/dnd          | Drag and drop           | ❌ HTML5 DnD, react-dnd | Mandatory |
| **Testing**       | Vitest + RTL + Playwright | Unit & E2E testing      | ❌ Jest alone           | Mandatory |

### ❌ Forbidden Libraries

- **Custom form state managers** (useReducer for forms)
- **Manual fetch wrappers** (custom hooks for API calls)
- **Other UI libraries** alongside Ant Design
- **HTML5 Drag and Drop API** for complex interactions
- **Global state libraries** without justification

## 🏗️ Code Standards

### TypeScript Configuration

```typescript
// tsconfig.json - Strict mode required
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  }
}

// ✅ Good: Explicit types
interface UserFormData {
  name: string
  email: string
  role: 'admin' | 'user'
}

const createUser = (data: UserFormData): Promise<User> => {
  return api.post('/users', data)
}

// ❌ Bad: Any types or implicit any
const createUser = (data: any) => {
  return api.post('/users', data)
}
```

### Component Standards

```typescript
// ✅ Required pattern
interface ComponentProps {
  // Props must be explicitly typed
  title: string
  onSubmit: (data: FormData) => void
  className?: string // Optional props marked with ?
  children?: React.ReactNode
}

export function Component({
  title,
  onSubmit,
  className,
  children
}: ComponentProps) {
  // Implementation
  return (
    <div className={cn("default-styles", className)}>
      <h2>{title}</h2>
      {children}
    </div>
  )
}

// ❌ Forbidden patterns
export function Component(props: any) {} // No any types
export function Component({...props}) {} // No spread without typing
```

### Form Implementation

```typescript
// ✅ Required: React Hook Form + Zod
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const userSchema = z.object({
  name: z.string().min(1, "Name required"),
  email: z.string().email("Invalid email"),
  age: z.number().min(18, "Must be 18+").optional()
})

type UserFormData = z.infer<typeof userSchema>

export function UserForm() {
  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: { name: "", email: "" }
  })

  const submitMutation = useMutation({
    mutationFn: (data: UserFormData) => api.createUser(data)
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submitMutation.mutate)}>
        {/* Form fields using FormField pattern */}
      </form>
    </Form>
  )
}

// ❌ Forbidden: Custom form state
export function UserForm() {
  const [formData, setFormData] = useState({}) // Don't do this
  const [errors, setErrors] = useState({})     // Don't do this
  // Manual validation logic                  // Don't do this
}
```

### Data Fetching

```typescript
// ✅ Required: TanStack Query
export function useUsers(filters?: UserFilters) {
  return useQuery({
    queryKey: queryKeys.users.list(filters),
    queryFn: () => usersApi.getAll(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.all,
      })
    },
  })
}

// ❌ Forbidden: Custom fetch hooks
export function useUsers() {
  const [data, setData] = useState([]) // Don't do this
  const [loading, setLoading] = useState() // Don't do this

  useEffect(() => {
    // Manual fetch logic                   // Don't do this
  }, [])
}
```

## 🎨 Styling Standards

### Tailwind + Ant Design Pattern

```typescript
import { cn } from '@/lib/utils'

// ✅ Good: Tailwind for layout, AntD for components
export function UserCard({ user, className }: UserCardProps) {
  return (
    <Card className={cn("p-4 shadow-sm", className)}>
      <div className="flex items-center gap-4">
        <Avatar src={user.avatar} />
        <div className="flex-1">
          <Typography.Title level={4} className="!mb-1">
            {user.name}
          </Typography.Title>
          <Typography.Text type="secondary">
            {user.email}
          </Typography.Text>
        </div>
      </div>
    </Card>
  )
}

// ❌ Bad: Mixing styling approaches
export function UserCard({ user }: UserCardProps) {
  return (
    <div style={{ padding: '16px' }}> {/* Don't use inline styles */}
      <div className="custom-user-card"> {/* Don't create custom CSS */}
        {/* Content */}
      </div>
    </div>
  )
}
```

### Class Name Utilities

```typescript
// utils/cn.ts - Required utility
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Usage in components
<div className={cn(
  "base-styles",
  isActive && "active-styles",
  className
)} />
```

## 🔍 File Organization

### Directory Structure

```
src/
├── components/           # React components
│   ├── forms/           # Form-specific components
│   ├── ui/              # Reusable UI components
│   └── layout/          # Layout components
├── hooks/               # Custom React hooks (TanStack Query)
├── lib/                 # Utilities and configurations
│   ├── queryKeys.ts     # Query key factory
│   ├── supabase.ts      # Database client
│   └── utils.ts         # Utility functions
├── schemas/             # Zod validation schemas
├── types/               # TypeScript type definitions
└── styles/              # Global CSS files
```

### File Naming Conventions

**Components:**

- Use PascalCase: `UserProfile.tsx`
- Avoid library suffixes: `FormRenderer.tsx` (not `FormRendererAntd.tsx`)
- Be descriptive: `ContactForm.tsx` (not `Form1.tsx`)

**Hooks:**

- Use camelCase with `use` prefix: `useUsers.ts`
- Group by feature: `useAuth.ts`, `useForms.ts`

**Types:**

- Use PascalCase: `User.ts`, `FormConfig.ts`
- Export interfaces: `export interface User {}`

**Utilities:**

- Use camelCase: `formatDate.ts`, `validation.ts`

## 🧪 Testing Standards

### Component Testing

```typescript
// ✅ Required: React Testing Library
import { render, screen, userEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UserForm } from './UserForm'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('UserForm', () => {
  it('submits form with valid data', async () => {
    const onSubmit = vi.fn()
    render(<UserForm onSubmit={onSubmit} />, { wrapper: createWrapper() })

    await userEvent.type(screen.getByLabelText(/name/i), 'John Doe')
    await userEvent.type(screen.getByLabelText(/email/i), 'john@example.com')
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'John Doe',
      email: 'john@example.com'
    })
  })

  it('shows validation errors for invalid data', async () => {
    render(<UserForm />, { wrapper: createWrapper() })

    await userEvent.click(screen.getByRole('button', { name: /submit/i }))

    expect(screen.getByText(/name required/i)).toBeInTheDocument()
  })
})
```

### Hook Testing

```typescript
// ✅ Required: renderHook for custom hooks
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useUsers } from './useUsers'

describe('useUsers', () => {
  it('fetches users successfully', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })

    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )

    const { result } = renderHook(() => useUsers(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
      expect(result.current.data).toHaveLength(3)
    })
  })
})
```

## ♿ Accessibility Standards

### Required Patterns

```typescript
// ✅ Form accessibility
<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel htmlFor={field.name}>Email Address</FormLabel>
      <FormControl>
        <Input
          {...field}
          id={field.name}
          type="email"
          aria-describedby={`${field.name}-error`}
          aria-invalid={!!form.formState.errors.email}
        />
      </FormControl>
      <FormMessage id={`${field.name}-error`} />
    </FormItem>
  )}
/>

// ✅ Interactive elements
<Button
  aria-label="Delete user"
  onClick={handleDelete}
  disabled={isLoading}
  aria-busy={isLoading}
>
  {isLoading ? 'Deleting...' : 'Delete'}
</Button>

// ✅ Dynamic content
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
>
  {isLoading ? 'Loading...' : `${users.length} users found`}
</div>
```

### Accessibility Checklist

- [ ] All form inputs have labels
- [ ] Interactive elements have appropriate ARIA attributes
- [ ] Focus management for modals and dynamic content
- [ ] Keyboard navigation for all interactive elements
- [ ] Screen reader announcements for state changes
- [ ] Sufficient color contrast (minimum 4.5:1)

## 🚀 Performance Standards

### React Performance

```typescript
// ✅ Memoization for expensive computations
const expensiveValue = useMemo(() => {
  return heavyComputation(data)
}, [data])

// ✅ Callback memoization
const handleSubmit = useCallback((data: FormData) => {
  submitMutation.mutate(data)
}, [submitMutation])

// ✅ Component memoization
const MemoizedUserCard = memo(({ user }: { user: User }) => (
  <UserCard user={user} />
))

// ❌ Avoid inline object/array creation in render
function Component() {
  return (
    <OtherComponent
      data={{ key: 'value' }}  // Creates new object every render
      items={[1, 2, 3]}        // Creates new array every render
    />
  )
}

// ✅ Move static data outside component
const STATIC_ITEMS = [1, 2, 3]
const STATIC_CONFIG = { key: 'value' }

function Component() {
  return (
    <OtherComponent
      data={STATIC_CONFIG}
      items={STATIC_ITEMS}
    />
  )
}
```

### Bundle Optimization

```typescript
// ✅ Dynamic imports for large components
const HeavyComponent = lazy(() => import('./HeavyComponent'))

function App() {
  return (
    <Suspense fallback={<Spin size="large" />}>
      <HeavyComponent />
    </Suspense>
  )
}

// ✅ Tree-shakable imports
import { Button } from 'antd'           // Good
import Button from 'antd/lib/button'    // Better
import { debounce } from 'lodash'       // Bad - imports entire lodash
import debounce from 'lodash/debounce'  // Good - tree-shakable
```

## 🛡️ Error Handling

### Standard Error Boundaries

```typescript
// ✅ Error boundary for components
export function ComponentErrorBoundary({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <ErrorBoundary
      fallback={
        <Alert
          type="error"
          message="Something went wrong"
          description="Please refresh the page and try again."
          showIcon
        />
      }
    >
      {children}
    </ErrorBoundary>
  )
}

// ✅ Query error handling
export function UsersList() {
  const { data: users, error, isLoading } = useUsers()

  if (error) {
    return (
      <Alert
        type="error"
        message="Failed to load users"
        description={error.message}
        showIcon
      />
    )
  }

  // Component implementation
}
```

## 📏 Code Quality

### ESLint Configuration

```json
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended",
    "@typescript-eslint/recommended-requiring-type-checking"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "react-hooks/exhaustive-deps": "error",
    "prefer-const": "error"
  }
}
```

### Pre-commit Hooks

```bash
# Required pre-commit checks
npm run typecheck  # TypeScript validation
npm run lint       # ESLint checks
npm run test       # Unit tests
npm run build      # Build verification
```

## ✅ Development Checklist

Before submitting any code:

### TypeScript

- [ ] Zero `any` types
- [ ] All props and return types explicitly defined
- [ ] Strict mode enabled and passing

### React

- [ ] Functional components only
- [ ] Proper hook usage (no hooks in conditions/loops)
- [ ] Memoization where appropriate

### Forms

- [ ] React Hook Form + Zod implementation
- [ ] Proper validation and error handling
- [ ] Accessibility attributes

### Data Fetching

- [ ] TanStack Query for all API calls
- [ ] Proper error and loading states
- [ ] Query key factory usage

### Styling

- [ ] Ant Design components used
- [ ] Tailwind for utilities and layout
- [ ] No custom CSS unless absolutely necessary

### Testing

- [ ] Component tests with RTL
- [ ] Hook tests where applicable
- [ ] Accessibility testing

### Performance

- [ ] No unnecessary re-renders
- [ ] Proper memoization
- [ ] Bundle size consideration

This document is enforced through automated tools and code review. All standards are mandatory and non-negotiable.
