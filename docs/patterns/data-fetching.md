# Data Fetching Patterns

This document outlines the standard patterns for data fetching in FormDee using TanStack Query.

## 🎯 Core Pattern

All data fetching must use TanStack Query. No exceptions.

```typescript
// 1. Define query keys
// lib/queryKeys.ts
export const queryKeys = {
  users: {
    all: ['users'] as const,
    list: (filters?: UserFilters) => ['users', 'list', filters] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
  },
  forms: {
    all: ['forms'] as const,
    list: (filters?: FormFilters) => ['forms', 'list', filters] as const,
    detail: (refKey: string) => ['forms', 'detail', refKey] as const,
  }
}

// 2. Create API functions
// lib/api/users.ts
export const usersApi = {
  async getAll(filters?: UserFilters): Promise<User[]> {
    const params = new URLSearchParams()
    if (filters?.search) params.set('search', filters.search)

    const response = await fetch(`/api/users?${params}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.statusText}`)
    }
    return response.json()
  },

  async getById(id: string): Promise<User> {
    const response = await fetch(`/api/users/${id}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch user: ${response.statusText}`)
    }
    return response.json()
  },

  async create(data: CreateUserData): Promise<User> {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) {
      throw new Error(`Failed to create user: ${response.statusText}`)
    }
    return response.json()
  },

  async update(id: string, data: UpdateUserData): Promise<User> {
    const response = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) {
      throw new Error(`Failed to update user: ${response.statusText}`)
    }
    return response.json()
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`/api/users/${id}`, {
      method: 'DELETE'
    })
    if (!response.ok) {
      throw new Error(`Failed to delete user: ${response.statusText}`)
    }
  }
}

// 3. Create query hooks
// hooks/useUsers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '@/lib/api/users'
import { queryKeys } from '@/lib/queryKeys'

export function useUsers(filters?: UserFilters) {
  return useQuery({
    queryKey: queryKeys.users.list(filters),
    queryFn: () => usersApi.getAll(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useUser(id: string) {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => usersApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.all
      })
      toast.success('User created successfully!')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create user: ${error.message}`)
    }
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserData }) =>
      usersApi.update(id, data),
    onSuccess: (updatedUser) => {
      // Update specific user in cache
      queryClient.setQueryData(
        queryKeys.users.detail(updatedUser.id),
        updatedUser
      )
      // Invalidate list to refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.all
      })
      toast.success('User updated successfully!')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update user: ${error.message}`)
    }
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: usersApi.delete,
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({
        queryKey: queryKeys.users.detail(deletedId)
      })
      // Update list cache
      queryClient.setQueryData(
        queryKeys.users.list(),
        (old: User[] = []) => old.filter(user => user.id !== deletedId)
      )
      toast.success('User deleted successfully!')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete user: ${error.message}`)
    }
  })
}

// 4. Use in components
// components/UsersList.tsx
export function UsersList() {
  const [filters, setFilters] = useState<UserFilters>({})
  const { data: users, isLoading, error } = useUsers(filters)
  const deleteUser = useDeleteUser()

  if (isLoading) {
    return <Spin size="large" />
  }

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

  return (
    <div>
      <List
        dataSource={users}
        renderItem={(user) => (
          <List.Item
            actions={[
              <Button
                key="delete"
                danger
                loading={deleteUser.isPending}
                onClick={() => deleteUser.mutate(user.id)}
              >
                Delete
              </Button>
            ]}
          >
            <List.Item.Meta
              title={user.name}
              description={user.email}
            />
          </List.Item>
        )}
      />
    </div>
  )
}
```

## 🚀 Advanced Patterns

### Optimistic Updates

```typescript
export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserData }) => usersApi.update(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.users.detail(id),
      })

      // Snapshot previous value
      const previousUser = queryClient.getQueryData(queryKeys.users.detail(id))

      // Optimistically update
      queryClient.setQueryData(queryKeys.users.detail(id), (old: User) => ({ ...old, ...data }))

      // Return context for onError
      return { previousUser, id }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousUser) {
        queryClient.setQueryData(queryKeys.users.detail(context.id), context.previousUser)
      }
      toast.error(`Failed to update user: ${err.message}`)
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.detail(variables.id),
      })
    },
  })
}
```

### Infinite Queries

```typescript
export function useInfiniteUsers(filters?: UserFilters) {
  return useInfiniteQuery({
    queryKey: queryKeys.users.list(filters),
    queryFn: ({ pageParam = 0 }) =>
      usersApi.getAll({ ...filters, page: pageParam }),
    getNextPageParam: (lastPage, pages) => {
      return lastPage.hasMore ? pages.length : undefined
    },
    initialPageParam: 0,
  })
}

// In component
export function InfiniteUsersList() {
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
  } = useInfiniteUsers()

  const users = data?.pages.flatMap(page => page.users) ?? []

  return (
    <div>
      <List
        dataSource={users}
        renderItem={(user) => (
          <List.Item key={user.id}>
            <List.Item.Meta title={user.name} />
          </List.Item>
        )}
      />

      {hasNextPage && (
        <Button
          onClick={() => fetchNextPage()}
          loading={isFetchingNextPage}
          disabled={!hasNextPage || isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </Button>
      )}
    </div>
  )
}
```

### Dependent Queries

```typescript
export function useUserProfile(userId: string) {
  // First query: Get user
  const userQuery = useUser(userId)

  // Second query: Get user's posts (depends on user)
  const postsQuery = useQuery({
    queryKey: ['posts', 'user', userId],
    queryFn: () => postsApi.getByUserId(userId),
    enabled: !!userQuery.data?.id, // Only run if user exists
  })

  return {
    user: userQuery.data,
    posts: postsQuery.data,
    isLoading: userQuery.isLoading || postsQuery.isLoading,
    error: userQuery.error || postsQuery.error,
  }
}
```

### Parallel Queries

```typescript
export function useDashboardData() {
  const usersQuery = useUsers()
  const formsQuery = useForms()
  const statsQuery = useQuery({
    queryKey: ['stats'],
    queryFn: () => statsApi.getOverview(),
  })

  return {
    users: usersQuery.data,
    forms: formsQuery.data,
    stats: statsQuery.data,
    isLoading: usersQuery.isLoading || formsQuery.isLoading || statsQuery.isLoading,
    error: usersQuery.error || formsQuery.error || statsQuery.error,
  }
}
```

## 📱 Prefetching Patterns

### Link Hover Prefetch

```typescript
export function UserCard({ user }: { user: User }) {
  const queryClient = useQueryClient()

  const prefetchUserDetails = () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.users.detail(user.id),
      queryFn: () => usersApi.getById(user.id),
      staleTime: 1000 * 60 * 10, // 10 minutes
    })
  }

  return (
    <Card
      onMouseEnter={prefetchUserDetails}
      onClick={() => router.push(`/users/${user.id}`)}
    >
      <Card.Meta title={user.name} description={user.email} />
    </Card>
  )
}
```

### Route Prefetch

```typescript
// In Next.js page or layout
export default async function UsersPage() {
  const queryClient = new QueryClient()

  // Prefetch users on server
  await queryClient.prefetchQuery({
    queryKey: queryKeys.users.list(),
    queryFn: () => usersApi.getAll(),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <UsersList />
    </HydrationBoundary>
  )
}
```

## 🛡️ Error Handling

### Global Error Handler

```typescript
// lib/queryClient.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry 4xx errors
        if (error instanceof Error && error.message.includes('4')) {
          return false
        }
        return failureCount < 3
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
    mutations: {
      onError: (error) => {
        console.error('Mutation error:', error)
        // Global error handling
        if (error.message.includes('401')) {
          // Handle unauthorized
          router.push('/login')
        }
      },
    },
  },
})
```

### Component Error Boundaries

```typescript
export function QueryErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <Alert
          type="error"
          message="Something went wrong"
          description="Please try refreshing the page"
          showIcon
        />
      }
    >
      {children}
    </ErrorBoundary>
  )
}
```

## 🚫 Anti-Patterns

### ❌ Don't Use Manual Fetch

```typescript
// ❌ Bad: Manual fetch with useState
function BadUsersList() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch('/api/users')
      .then(res => res.json())
      .then(setUsers)
      .finally(() => setLoading(false))
  }, [])

  return <div>{/* Component */}</div>
}

// ✅ Good: TanStack Query
function GoodUsersList() {
  const { data: users, isLoading } = useUsers()
  return <div>{/* Component */}</div>
}
```

### ❌ Don't Duplicate Cache Keys

```typescript
// ❌ Bad: Hardcoded keys
const { data } = useQuery({
  queryKey: ['users'], // Inconsistent
  queryFn: fetchUsers,
})

const { data } = useQuery({
  queryKey: ['user-list'], // Different key for same data
  queryFn: fetchUsers,
})

// ✅ Good: Centralized keys
const { data } = useQuery({
  queryKey: queryKeys.users.list(),
  queryFn: fetchUsers,
})
```

## 🧪 Testing Patterns

### Query Hook Testing

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useUsers } from './useUsers'

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

describe('useUsers', () => {
  it('fetches users successfully', async () => {
    const { result } = renderHook(() => useUsers(), {
      wrapper: createWrapper()
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toHaveLength(3)
  })
})
```

### Mutation Testing

```typescript
describe('useCreateUser', () => {
  it('creates user and invalidates cache', async () => {
    const { result } = renderHook(() => useCreateUser(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.mutate({
        name: 'John Doe',
        email: 'john@example.com',
      })
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
  })
})
```

## 📋 Data Fetching Checklist

Before implementing any data fetching:

### Required Elements

- [ ] Query keys defined in centralized factory
- [ ] API functions with proper error handling
- [ ] Type-safe query and mutation hooks
- [ ] Loading and error states handled
- [ ] Toast notifications for mutations
- [ ] Proper cache invalidation

### Performance

- [ ] Appropriate staleTime configuration
- [ ] Prefetching for critical data
- [ ] Optimistic updates where suitable
- [ ] Infinite queries for large datasets

### Testing

- [ ] Hook tests with proper wrapper
- [ ] Mutation tests with cache verification
- [ ] Error scenario tests

This pattern is mandatory for all data fetching in FormDee. No manual fetch calls allowed.
