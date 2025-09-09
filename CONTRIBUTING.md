# Contributing to FormDee

Thank you for your interest in contributing to FormDee! This guide outlines our development standards, processes, and best practices.

## 🚀 Development Philosophy

FormDee follows **opinionated best practices** with a TypeScript-first approach. We prioritize:

- **Type Safety**: Zero `any` types, comprehensive TypeScript coverage
- **Modern React Patterns**: Hooks, functional components, and declarative code
- **Performance**: Intelligent caching, optimizations, and minimal bundle size
- **Accessibility**: WCAG compliance and inclusive design
- **Testing**: Comprehensive coverage with unit, integration, and E2E tests

## 📋 Prerequisites

Before contributing, ensure you have:

- **Node.js 18+** installed
- **Basic TypeScript knowledge**
- **React experience** with hooks and modern patterns
- **Git workflow** understanding

## 🛠️ Development Setup

```bash
# 1. Fork and clone the repository
git clone https://github.com/your-username/FormDee.git
cd FormDee

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env with your Supabase credentials

# 4. Run development server
npm run dev

# 5. Verify setup
npm run typecheck
npm run lint
npm run test
```

## 🏗️ Tech Stack Requirements

### Required Libraries (Use Only These)

| Category          | Library                   | Usage                           |
| ----------------- | ------------------------- | ------------------------------- |
| **Forms**         | React Hook Form + Zod     | All form state and validation   |
| **Data Fetching** | TanStack Query            | All server state management     |
| **UI Components** | Ant Design                | Primary component library       |
| **Styling**       | Tailwind CSS              | Utilities and layout            |
| **Drag & Drop**   | hello-pangea/dnd          | All drag and drop functionality |
| **Testing**       | Vitest + RTL + Playwright | All testing needs               |

### Forbidden Patterns

❌ **Do not use:**

- Custom form state managers (useReducer for forms)
- Manual fetch wrappers (use TanStack Query)
- Other UI libraries alongside AntD
- HTML5 drag and drop API
- Global state libraries (Redux, Zustand) without justification

## 📝 Coding Standards

### TypeScript Standards

```typescript
// ✅ Good: Explicit types, no any
interface UserFormData {
  name: string
  email: string
  age?: number
}

const submitUser = (data: UserFormData): Promise<User> => {
  return api.post('/users', data)
}

// ❌ Bad: Any types, implicit types
const submitUser = (data: any) => {
  return api.post('/users', data)
}
```

### Forms Implementation

```typescript
// ✅ Required pattern: RHF + Zod
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const userSchema = z.object({
  name: z.string().min(1, "Name required"),
  email: z.string().email("Invalid email")
})

type UserFormData = z.infer<typeof userSchema>

export function UserForm() {
  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: { name: "", email: "" }
  })

  const submitMutation = useMutation({
    mutationFn: (data: UserFormData) => api.createUser(data),
    onSuccess: () => toast.success("User created!")
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submitMutation.mutate)}>
        {/* Form fields */}
      </form>
    </Form>
  )
}
```

### Data Fetching Pattern

```typescript
// ✅ Required pattern: TanStack Query
export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users.list(),
    queryFn: () => usersApi.getAll(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.list(),
      })
      toast.success('User created successfully!')
    },
    onError: (error) => {
      toast.error(`Failed to create user: ${error.message}`)
    },
  })
}
```

### Component Standards

```typescript
// ✅ Good: Proper typing, clear naming
interface UserCardProps {
  user: User
  onEdit: (user: User) => void
  className?: string
}

export function UserCard({ user, onEdit, className }: UserCardProps) {
  return (
    <Card className={cn("p-4", className)}>
      <h3>{user.name}</h3>
      <Button onClick={() => onEdit(user)}>Edit</Button>
    </Card>
  )
}

// ❌ Bad: Any types, unclear naming
export function Card1({ data, onClick }: any) {
  return <div onClick={onClick}>{data.name}</div>
}
```

## 📁 File Organization

### Directory Structure

```
components/
├── forms/              # Form-specific components
│   ├── UserForm.tsx
│   └── ContactForm.tsx
├── ui/                 # Reusable UI components
│   ├── Button.tsx
│   └── Card.tsx
└── layout/             # Layout components
    ├── Header.tsx
    └── Sidebar.tsx

hooks/                  # Custom React hooks
├── useUsers.ts         # TanStack Query hooks
└── useAuth.ts

schemas/               # Zod validation schemas
├── userForm.ts
└── contactForm.ts

lib/                   # Utilities and config
├── queryKeys.ts       # Query key definitions
├── supabase.ts        # Database client
└── utils.ts           # Utility functions
```

### File Naming Conventions

**✅ Use canonical names:**

- `FormRenderer.tsx` (not `FormRendererAntd.tsx`)
- `UserList.tsx` (not `UserListQuery.tsx`)
- `ContactForm.tsx` (not `ContactFormHookForm.tsx`)

**✅ Naming patterns:**

- Components: `PascalCase.tsx`
- Hooks: `camelCase.ts` (prefixed with `use`)
- Schemas: `camelCase.ts` (suffixed with schema type)
- Utilities: `camelCase.ts`

## 🧪 Testing Requirements

### Test Coverage Requirements

All contributions must include appropriate tests:

- **New features**: Unit + integration + E2E tests
- **Bug fixes**: Regression tests
- **Components**: React Testing Library tests
- **Hooks**: Unit tests with proper mocking
- **API routes**: Integration tests

### Testing Patterns

```typescript
// ✅ Component testing with RTL
import { render, screen, userEvent } from '@testing-library/react'
import { UserForm } from './UserForm'

describe('UserForm', () => {
  it('submits form with valid data', async () => {
    const onSubmit = vi.fn()
    render(<UserForm onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText(/name/i), 'John Doe')
    await userEvent.type(screen.getByLabelText(/email/i), 'john@example.com')
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'John Doe',
      email: 'john@example.com'
    })
  })
})

// ✅ Hook testing with TanStack Query
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
    })
  })
})
```

## 🚀 Development Workflow

### Branch Naming

- **Features**: `feature/user-authentication`
- **Bug fixes**: `fix/form-validation-error`
- **Documentation**: `docs/contributing-guide`
- **Refactoring**: `refactor/query-hooks`

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Feature
feat(auth): add user login functionality

# Bug fix
fix(forms): resolve validation error display

# Documentation
docs(contributing): update development setup

# Refactor
refactor(queries): migrate to TanStack Query

# Test
test(forms): add comprehensive form validation tests
```

### Pull Request Process

1. **Create feature branch**

   ```bash
   git checkout -b feature/my-new-feature
   ```

2. **Make changes following standards**
   - Use TypeScript strictly
   - Follow naming conventions
   - Include appropriate tests
   - Update documentation if needed

3. **Pre-submission checklist**

   ```bash
   npm run typecheck     # TypeScript validation
   npm run lint          # ESLint checks
   npm run test          # Run all tests
   npm run build         # Ensure build succeeds
   ```

4. **Create pull request**
   - Use descriptive title
   - Reference related issues
   - Include testing instructions
   - Add screenshots for UI changes

5. **Code review requirements**
   - At least one approval required
   - All CI checks must pass
   - No merge conflicts
   - Documentation updated if applicable

## 📋 Pull Request Template

When creating a PR, include:

```markdown
## Description

Brief description of changes and motivation.

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Checklist

- [ ] Code follows TypeScript strict mode
- [ ] Uses React Hook Form + Zod for forms
- [ ] Uses TanStack Query for data fetching
- [ ] Uses Ant Design for UI components
- [ ] Includes appropriate tests
- [ ] Documentation updated
- [ ] No console.log statements
- [ ] Accessibility considerations addressed
```

## 🎯 Code Review Guidelines

### What Reviewers Look For

1. **Architecture compliance**
   - Correct use of required libraries
   - No forbidden patterns
   - Proper file organization

2. **Code quality**
   - TypeScript strict compliance
   - Clear, readable code
   - Proper error handling
   - Performance considerations

3. **Testing coverage**
   - Appropriate test types
   - Good test coverage
   - Meaningful test cases

4. **Accessibility**
   - Proper ARIA labels
   - Keyboard navigation
   - Screen reader compatibility

### Review Process

- **Constructive feedback**: Focus on code improvement
- **Learning opportunities**: Explain reasoning behind suggestions
- **Consistency**: Ensure adherence to established patterns
- **Security**: Check for potential vulnerabilities

## 🐛 Bug Reports

When reporting bugs, include:

1. **Environment details**
   - Browser version
   - OS version
   - Node.js version

2. **Steps to reproduce**
   - Clear step-by-step instructions
   - Expected vs actual behavior
   - Screenshots/videos if applicable

3. **Additional context**
   - Error messages
   - Console logs
   - Network requests

## 💡 Feature Requests

For feature requests, provide:

1. **Problem statement**: What problem does this solve?
2. **Proposed solution**: How should it work?
3. **Alternatives considered**: Other approaches evaluated
4. **Implementation considerations**: Technical requirements

## 🔒 Security

- **Never commit sensitive data** (API keys, passwords)
- **Follow security best practices** for authentication
- **Report security vulnerabilities** privately
- **Validate all user inputs** on both client and server

## 📚 Learning Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Hook Form Documentation](https://react-hook-form.com/)
- [TanStack Query Documentation](https://tanstack.com/query)
- [Ant Design Documentation](https://ant.design/)
- [Zod Documentation](https://zod.dev/)

## 🤝 Community Guidelines

- **Be respectful** and inclusive
- **Help others learn** and grow
- **Share knowledge** and best practices
- **Collaborate constructively** on solutions
- **Follow the code of conduct**

## 📞 Getting Help

- **GitHub Issues**: Technical questions and bug reports
- **GitHub Discussions**: General questions and feature discussions
- **Documentation**: Check existing docs first
- **Code Review**: Ask questions during review process

---

**Thank you for contributing to FormDee! Your contributions help make this project better for everyone.** 🚀
