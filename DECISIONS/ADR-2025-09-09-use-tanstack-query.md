# ADR-002: Adopt TanStack Query for Client-Side Data Fetching

**Date:** 2025-09-09  
**Status:** Accepted  
**Decision Makers:** Development Team

## Context

FormDee needs a sophisticated data fetching and caching solution to handle:

- Server state management and synchronization
- Optimistic updates for better UX
- Background data refresh and revalidation
- Error handling and retry logic
- Loading states and cache management
- SSR/SSG compatibility with Next.js

## Decision

We will adopt **TanStack Query (React Query)** as our standard data fetching and server state management solution, replacing all custom fetch hooks and manual caching.

### Key Benefits:

- **Intelligent Caching**: Automatic cache management with configurable stale times
- **Background Updates**: Automatic data synchronization without user intervention
- **Optimistic Updates**: Immediate UI feedback with automatic rollback on errors
- **DevTools**: Excellent debugging experience with React Query DevTools
- **TypeScript Support**: Full type safety with query and mutation hooks
- **SSR/SSG Ready**: Built-in support for Next.js hydration patterns

## Implementation Pattern

### Query Implementation

```typescript
// Query Key Factory
export const queryKeys = {
  forms: {
    all: ['forms'] as const,
    list: (filters?: FormFilters) => ['forms', 'list', filters] as const,
    detail: (id: string) => ['forms', 'detail', id] as const,
  },
  responses: {
    all: ['responses'] as const,
    list: (formId: string) => ['responses', 'list', formId] as const,
    count: (formId: string) => ['responses', 'count', formId] as const,
  },
}

// Query Hook
export function useForms(filters?: FormFilters) {
  return useQuery({
    queryKey: queryKeys.forms.list(filters),
    queryFn: () => formsApi.getAll(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  })
}

// Mutation Hook with Optimistic Updates
export function useCreateForm() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: formsApi.create,
    onMutate: async (newForm) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.forms.all,
      })

      // Snapshot previous value
      const previousForms = queryClient.getQueryData(queryKeys.forms.list())

      // Optimistically update
      queryClient.setQueryData(queryKeys.forms.list(), (old: Form[] = []) => [
        ...old,
        { ...newForm, id: 'temp-id', createdAt: new Date().toISOString() },
      ])

      return { previousForms }
    },
    onError: (err, newForm, context) => {
      // Rollback on error
      queryClient.setQueryData(queryKeys.forms.list(), context?.previousForms)
      toast.error(`Failed to create form: ${err.message}`)
    },
    onSuccess: () => {
      toast.success('Form created successfully!')
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({
        queryKey: queryKeys.forms.all,
      })
    },
  })
}
```

### Query Client Configuration

```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: (failureCount, error) => {
        // Don't retry 4xx errors
        if (error instanceof Error && error.message.includes('4')) {
          return false
        }
        return failureCount < 3
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
      onError: (error) => {
        console.error('Mutation error:', error)
      },
    },
  },
})
```

## Migration from Previous Solution

### Before (Custom Hooks)

```typescript
// ❌ Old pattern
function useForms() {
  const [data, setData] = useState<Form[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    formsApi
      .getAll()
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [])

  return { data, loading, error }
}
```

### After (TanStack Query)

```typescript
// ✅ New pattern
function useForms() {
  return useQuery({
    queryKey: queryKeys.forms.list(),
    queryFn: formsApi.getAll,
    staleTime: 1000 * 60 * 5,
  })
}
```

## Alternatives Considered

### 1. SWR

**Pros:**

- Smaller bundle size
- Simple API
- Good TypeScript support

**Cons:**

- Less feature-rich than TanStack Query
- Weaker optimistic update patterns
- Smaller ecosystem

### 2. Apollo Client

**Pros:**

- Excellent GraphQL integration
- Mature caching system
- Rich feature set

**Cons:**

- GraphQL-focused (we use REST)
- Larger bundle size
- More complex setup

### 3. Custom Fetch Hooks

**Pros:**

- Full control over implementation
- No additional dependencies
- Custom caching logic

**Cons:**

- Significant development time
- Need to implement caching, retries, etc.
- Maintenance burden
- No optimistic updates

### 4. Zustand + Custom API Layer

**Pros:**

- Lightweight global state
- Simple API
- TypeScript support

**Cons:**

- Manual cache invalidation
- No background refetching
- Need to implement retry logic

## Consequences

### Positive

- **Better UX**: Optimistic updates and background refresh
- **Performance**: Intelligent caching reduces API calls
- **Developer Experience**: Excellent DevTools and TypeScript integration
- **Reliability**: Built-in retry logic and error handling
- **Consistency**: Standardized data fetching patterns

### Negative

- **Bundle Size**: Additional ~40kb dependency
- **Learning Curve**: Team needs to learn Query concepts
- **Complexity**: More complex than simple fetch hooks

### Neutral

- **Vendor Lock-in**: Moderate - well-maintained library with stable API
- **Migration Effort**: Significant initial work to migrate existing hooks

## Implementation Plan

### Phase 1: Foundation

- [x] Install TanStack Query and dependencies
- [x] Set up QueryClient configuration
- [x] Create query key factory pattern
- [x] Set up React Query DevTools

### Phase 2: Core Migrations

- [x] Migrate forms-related queries and mutations
- [x] Migrate responses-related queries
- [x] Migrate authentication hooks
- [x] Replace all custom fetch hooks

### Phase 3: Advanced Features

- [ ] Implement optimistic updates for all mutations
- [ ] Add background refresh strategies
- [ ] Implement infinite queries for large datasets
- [ ] Add offline support

### Phase 4: Optimization

- [ ] Fine-tune cache strategies
- [ ] Implement prefetching for critical data
- [ ] Add performance monitoring
- [ ] Optimize bundle size

## SSR/SSG Integration

```typescript
// Next.js App Router with TanStack Query
export default async function FormsPage() {
  const queryClient = new QueryClient()

  // Prefetch data on server
  await queryClient.prefetchQuery({
    queryKey: queryKeys.forms.list(),
    queryFn: formsApi.getAll,
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FormsList />
    </HydrationBoundary>
  )
}
```

## Success Metrics

- **Performance**: 90% reduction in unnecessary API calls
- **User Experience**: 50% faster perceived loading times
- **Developer Experience**: 60% reduction in data fetching code
- **Cache Hit Rate**: >80% for frequently accessed data
- **Error Handling**: 95% reduction in uncaught API errors

## Monitoring and Observability

- **React Query DevTools**: Development debugging
- **Query Cache Analytics**: Monitor hit/miss rates
- **Error Tracking**: Automatic error reporting
- **Performance Metrics**: Query timing and success rates

## References

- [TanStack Query Documentation](https://tanstack.com/query)
- [React Query DevTools](https://tanstack.com/query/v4/docs/devtools)
- [Next.js Integration Guide](https://tanstack.com/query/v4/docs/guides/ssr)
- [TypeScript Guide](https://tanstack.com/query/v4/docs/guides/typescript)
- [Best Practices](https://tkdodo.eu/blog/practical-react-query)

---

**Next Review Date:** 2025-12-09  
**Reviewed By:** Development Team  
**Status:** ✅ Active Implementation
