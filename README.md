# FormDee - Dynamic Form Builder

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.0+-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.0+-blue.svg)](https://react.dev/)
[![TanStack Query](https://img.shields.io/badge/TanStack_Query-5.0+-red.svg)](https://tanstack.com/query)

A production-ready, type-safe dynamic form builder with real-time validation, intelligent caching, and comprehensive testing. Built with modern React patterns and enterprise-grade architecture.

## ✨ Features

- **AI-Powered Form Generation** - Natural language to form conversion
- **Type-Safe Validation** - Zod schemas with real-time feedback
- **Intelligent Caching** - TanStack Query for optimal performance
- **Drag & Drop Builder** - Intuitive form construction
- **Real-time Updates** - Optimistic UI with automatic sync
- **File Upload Integration** - Secure file handling with cloud storage
- **Comprehensive Testing** - Unit, integration, and E2E coverage
- **Accessibility First** - WCAG compliant with keyboard navigation
- **Production Ready** - Docker deployment with health checks

## 🚀 Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS + Ant Design (AntD)
- **Forms**: React Hook Form + Zod validation
- **Data Fetching**: TanStack Query (React Query)
- **Database**: Supabase (PostgreSQL)
- **Drag & Drop**: hello-pangea/dnd
- **Testing**: Vitest + React Testing Library + Playwright

## 🏗️ Architecture

This project follows **opinionated best practices**:

### Forms & Validation

- **Zod schemas** in `schemas/<feature>Form.ts`
- **React Hook Form** with `zodResolver` for all forms
- **Controller** components for complex AntD integrations
- Real-time validation with accessibility support

### Data Management

- **TanStack Query** for all server state
- Centralized query keys in `lib/queryKeys.ts`
- Optimistic updates with automatic error recovery
- SSR-friendly with hydration boundaries

### UI & Styling

- **Ant Design** as the primary component library
- **Tailwind CSS** for utilities and layout
- Consistent theming with AntD design tokens
- Dark mode support with system preferences

### State Management

- **Server state**: TanStack Query only
- **Local UI state**: React hooks (`useState`, `useReducer`)
- **Form state**: React Hook Form
- No global state library unless absolutely necessary

## 📁 Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── builder/           # Form builder pages
│   └── f/[refKey]/        # Public form pages
├── components/            # React components
│   ├── forms/            # Form-related components
│   ├── ui/               # Reusable UI components
│   └── layout/           # Layout components
├── hooks/                 # Custom React hooks
├── lib/                  # Utilities and configurations
│   ├── queryKeys.ts      # TanStack Query keys
│   ├── supabase.ts       # Database client
│   └── validation.ts     # Shared Zod schemas
├── schemas/              # Form validation schemas
├── types/                # TypeScript definitions
├── docs/                 # Documentation
├── DECISIONS/            # Architecture Decision Records
└── tests/                # Test suites
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm/yarn/pnpm
- Supabase account

### Installation

```bash
# Clone the repository
git clone https://github.com/zierocode/FormDee.git
cd FormDee

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase and Cloudflare R2 credentials

# Set up Supabase database
npm run setup:supabase

# Start development server
npm run dev
```

Visit `http://localhost:3000` to see the application.

### Environment Variables

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Cloudflare R2 Storage (optional, for file uploads)
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=your-bucket-name
R2_PUBLIC_URL=https://your-domain.com
NEXT_PUBLIC_R2_PUBLIC_URL=https://your-domain.com

# Admin Authentication
ADMIN_API_KEY=your-secure-admin-api-key-32-chars-min
ADMIN_UI_KEY=your-secure-ui-key-32-chars-min

# Application
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Quick Database Setup

FormDee includes an automated Supabase setup script:

```bash
# Automated setup (creates tables, policies, functions)
npm run setup:supabase

# Or run manually
node scripts/setup-supabase.js
```

This script will:

- ✅ Create all required database tables
- ✅ Set up Row Level Security policies
- ✅ Create database functions for validation
- ✅ Seed initial configuration data
- ✅ Create an example contact form

## 📋 Development Standards

### Forms Implementation

```typescript
// 1. Create Zod schema
// schemas/contactForm.ts
export const contactFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  message: z.string().min(10, 'Message too short'),
})

// 2. Use with React Hook Form
const form = useForm<ContactFormData>({
  resolver: zodResolver(contactFormSchema),
  defaultValues: { name: '', email: '', message: '' },
})

// 3. Handle submission with TanStack Query
const submitMutation = useMutation({
  mutationFn: (data: ContactFormData) => submitContact(data),
  onSuccess: () => toast.success('Form submitted!'),
  onError: (error) => toast.error(error.message),
})
```

### Data Fetching Pattern

```typescript
// hooks/useContacts.ts
export function useContacts() {
  return useQuery({
    queryKey: queryKeys.contacts.list(),
    queryFn: () => contactsApi.getAll(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useCreateContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: contactsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.contacts.list(),
      })
    },
  })
}
```

### Component Naming

Use canonical names without suffixes:

- ✅ `FormRenderer.tsx`
- ✅ `ContactForm.tsx`
- ❌ `FormRendererAntd.tsx`
- ❌ `ContactFormQuery.tsx`

## 📝 Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build            # Production build
npm run start            # Start production server
npm run typecheck        # TypeScript checking
npm run lint             # ESLint
npm run format           # Prettier

# Testing
npm run test             # Unit tests
npm run test:e2e         # E2E tests
npm run test:coverage    # Coverage report

# Database
npm run db:migrate       # Run migrations
npm run db:seed          # Seed database
npm run db:reset         # Reset database

# Deployment
npm run deploy:docker    # Docker deployment
npm run build:analyze    # Bundle analysis
```

## 🧪 Testing

We maintain comprehensive test coverage:

- **Unit Tests**: Component logic with Vitest
- **Integration Tests**: API endpoints and hooks
- **E2E Tests**: Complete user flows with Playwright
- **Accessibility Tests**: Automated a11y checking

Run tests: `npm run test:all`

## 📚 Documentation

### Core Documentation

- [📋 Architecture Overview](./ARCHITECTURE.md) - System design and patterns
- [🚀 Deployment Guide](./docs/DEPLOYMENT.md) - Complete deployment instructions
- [🤝 Contributing Guide](./CONTRIBUTING.md) - Development workflow
- [🔧 Claude Code Instructions](./.claude/instructions.md) - Development standards

### Developer Resources

- [🎨 Frontend Standards](./docs/standards/frontend.md)
- [📝 Form Patterns](./docs/patterns/forms.md)
- [🔄 Data Fetching](./docs/patterns/data-fetching.md)
- [🎯 UI Guidelines](./docs/patterns/ui.md)
- [🧪 Testing Guide](./docs/testing.md)
- [⚡ Performance & A11y](./docs/perf-accessibility.md)

## 🔧 Configuration Files

- **TypeScript**: `tsconfig.json`
- **ESLint**: `.eslintrc.json`
- **Prettier**: `.prettierrc`
- **Tailwind**: `tailwind.config.js`
- **Testing**: `vitest.config.ts`, `playwright.config.ts`

## 🚀 Deployment

### Automated Setup (Recommended)

```bash
# Interactive deployment setup
npm run setup:deployment

# Automated Docker deployment
npm run deploy:docker:auto
```

### Quick Deploy Options

```bash
# Vercel (recommended for small projects)
npm run deploy:vercel

# Docker (recommended for production)
npm run deploy:docker:compose

# Manual server deployment
npm run build:production && npm start
```

📖 **[Complete Deployment Guide](./docs/DEPLOYMENT.md)** - Detailed instructions for all deployment scenarios

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](./CONTRIBUTING.md) and check our [Architecture Decision Records](./DECISIONS/) to understand our technical choices.

### Quick Contribution Checklist

- [ ] Follow TypeScript-first development
- [ ] Use React Hook Form + Zod for forms
- [ ] Use TanStack Query for data fetching
- [ ] Include tests for new features
- [ ] Follow accessibility guidelines
- [ ] Update documentation as needed

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🆘 Support

- [GitHub Issues](https://github.com/zierocode/FormDee/issues)
- [Documentation](./docs/)
- [Architecture Decisions](./DECISIONS/)

---

**Built with ❤️ using modern React patterns and best practices.**
