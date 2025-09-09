# FormDee Coding Standards

## TypeScript

### Strict Mode

All TypeScript code must pass strict mode checks:

```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "strictFunctionTypes": true
}
```

### Type Definitions

- Prefer interfaces over types for object shapes
- Use type for unions, intersections, and utility types
- Always export types that are used across files
- Use `z.infer` for Zod schema types

```typescript
// ✅ Good
interface UserData {
  id: string
  name: string
  email: string
}

type UserRole = 'admin' | 'user' | 'guest'
type UserWithRole = UserData & { role: UserRole }

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
})
type User = z.infer<typeof userSchema>

// ❌ Bad
type UserData = {
  id: any
  name: string
  email: string
}
```

## React Components

### Component Structure

```typescript
// 1. Imports (ordered by ESLint rules)
import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from 'antd'
import type { ComponentProps } from '@/types'

// 2. Type definitions
interface MyComponentProps {
  title: string
  onAction: () => void
}

// 3. Component definition
export function MyComponent({ title, onAction }: MyComponentProps) {
  // 4. Hooks
  const { data, isLoading } = useQuery(...)

  // 5. Event handlers
  const handleClick = () => {
    onAction()
  }

  // 6. Render
  return (
    <div>
      <h1>{title}</h1>
      <Button onClick={handleClick}>Action</Button>
    </div>
  )
}
```

### Naming Conventions

- Components: PascalCase (`FormBuilder.tsx`)
- Hooks: camelCase with `use` prefix (`useFormData.ts`)
- Utils: camelCase (`formatDate.ts`)
- Types: PascalCase (`FormField.ts`)
- Constants: SCREAMING_SNAKE_CASE (`MAX_FILE_SIZE`)

## Forms

### Always Use React Hook Form + Zod

```typescript
// ✅ Good
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export function LoginForm() {
  const form = useForm({
    resolver: zodResolver(schema),
  })

  return <form onSubmit={form.handleSubmit(onSubmit)}>...</form>
}

// ❌ Bad - manual state management
export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
}
```

## Data Fetching

### Always Use TanStack Query

```typescript
// ✅ Good
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  })
}

// ❌ Bad - manual fetching
export function useUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetchUsers()
      .then(setUsers)
      .finally(() => setLoading(false))
  }, [])
}
```

## File Organization

### Directory Structure

```
components/
  ComponentName/
    ComponentName.tsx       # Main component
    ComponentName.test.tsx  # Tests
    index.ts               # Export

hooks/
  useHookName.ts           # Hook implementation
  useHookName.test.ts      # Tests

lib/
  utils/                   # Utility functions
  api/                     # API client functions
  constants/               # Constants
```

## Import Order

Enforced by ESLint:

1. React
2. External packages
3. Internal aliases (@/\*)
4. Relative imports
5. CSS imports

## Error Handling

### API Errors

```typescript
try {
  const data = await api.fetchData()
  return data
} catch (error) {
  // Log for debugging
  console.error('API Error:', error)

  // User-friendly message
  toast.error('Failed to load data. Please try again.')

  // Re-throw for React Query
  throw error
}
```

## Performance

### Memoization

Use sparingly, only when measurable improvement:

```typescript
// ✅ Good - expensive computation
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data)
}, [data])

// ❌ Bad - premature optimization
const simpleValue = useMemo(() => {
  return data.name
}, [data.name])
```

## Testing

### Test Structure

```typescript
describe('ComponentName', () => {
  it('should render correctly', () => {
    render(<ComponentName />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })

  it('should handle user interaction', async () => {
    const onAction = vi.fn()
    render(<ComponentName onAction={onAction} />)

    await userEvent.click(screen.getByRole('button'))
    expect(onAction).toHaveBeenCalledOnce()
  })
})
```

## Comments

### When to Comment

- Complex business logic
- Non-obvious workarounds
- External API quirks
- Performance optimizations

### When NOT to Comment

- Obvious code
- Type definitions (TypeScript is self-documenting)
- Simple getters/setters

## Git Commits

### Conventional Commits

```
feat: add user authentication
fix: resolve form validation issue
docs: update API documentation
style: format code with prettier
refactor: extract form logic to hook
test: add unit tests for auth
chore: update dependencies
```

## Accessibility

### ARIA Labels

```typescript
// ✅ Good
<button aria-label="Close modal" onClick={onClose}>
  <CloseIcon />
</button>

<input aria-describedby="email-error" />
<span id="email-error">Invalid email format</span>
```

### Keyboard Navigation

- All interactive elements must be keyboard accessible
- Use proper focus management in modals
- Implement skip links for navigation

## Security

### Never Expose Secrets

```typescript
// ❌ Bad
const API_KEY = 'sk_live_abc123'

// ✅ Good
const API_KEY = process.env.NEXT_PUBLIC_API_KEY
```

### Input Validation

- Always validate on the server
- Use Zod for consistent validation
- Sanitize user input before display

## Performance Checklist

- [ ] Use React.memo only when necessary
- [ ] Implement virtual scrolling for long lists
- [ ] Lazy load heavy components
- [ ] Optimize images with Next.js Image
- [ ] Use proper cache headers
- [ ] Minimize bundle size

## Code Review Checklist

- [ ] TypeScript strict mode passes
- [ ] No console.log in production code
- [ ] Proper error handling
- [ ] Accessible markup
- [ ] Tests included
- [ ] Documentation updated
- [ ] No commented-out code
- [ ] Follows naming conventions
