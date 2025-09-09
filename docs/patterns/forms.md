# Form Patterns

This document outlines the standard patterns for implementing forms in FormDee using React Hook Form + Zod.

## 🎯 Core Pattern

Every form must follow this exact pattern:

```typescript
// 1. Define Zod schema in schemas/
// schemas/contactForm.ts
import { z } from 'zod'

export const contactFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  message: z.string().min(10, "Message must be at least 10 characters"),
  priority: z.enum(['low', 'medium', 'high']).default('medium')
})

export type ContactFormData = z.infer<typeof contactFormSchema>

// 2. Implement form component
// components/forms/ContactForm.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { contactFormSchema, type ContactFormData } from '@/schemas/contactForm'

export function ContactForm() {
  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      message: "",
      priority: "medium"
    }
  })

  const submitMutation = useSubmitContact()

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submitMutation.mutate)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} type="email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message</FormLabel>
              <FormControl>
                <TextArea {...field} rows={4} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="primary"
          htmlType="submit"
          loading={submitMutation.isPending}
        >
          Submit
        </Button>
      </form>
    </Form>
  )
}
```

## 🔧 Advanced Patterns

### Conditional Fields

```typescript
const userSchema = z.object({
  role: z.enum(['user', 'admin']),
  email: z.string().email(),
  // Conditional field - only required for admin
  permissions: z.array(z.string()).optional()
}).refine(
  (data) => {
    if (data.role === 'admin' && (!data.permissions || data.permissions.length === 0)) {
      return false
    }
    return true
  },
  {
    message: "Admin users must have at least one permission",
    path: ["permissions"]
  }
)

// In component
const role = form.watch('role')

{role === 'admin' && (
  <FormField
    control={form.control}
    name="permissions"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Permissions</FormLabel>
        <FormControl>
          <Select {...field} mode="multiple">
            <Select.Option value="read">Read</Select.Option>
            <Select.Option value="write">Write</Select.Option>
            <Select.Option value="admin">Admin</Select.Option>
          </Select>
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
)}
```

### Dynamic Field Arrays

```typescript
const formSchema = z.object({
  tasks: z.array(z.object({
    title: z.string().min(1, "Title required"),
    completed: z.boolean().default(false)
  })).min(1, "At least one task required")
})

// In component
const { fields, append, remove } = useFieldArray({
  control: form.control,
  name: "tasks"
})

return (
  <div>
    {fields.map((field, index) => (
      <div key={field.id} className="flex gap-2">
        <FormField
          control={form.control}
          name={`tasks.${index}.title`}
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormControl>
                <Input {...field} placeholder="Task title" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`tasks.${index}.completed`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                >
                  Done
                </Checkbox>
              </FormControl>
            </FormItem>
          )}
        />

        <Button
          type="link"
          danger
          onClick={() => remove(index)}
        >
          Remove
        </Button>
      </div>
    ))}

    <Button
      type="dashed"
      onClick={() => append({ title: "", completed: false })}
    >
      Add Task
    </Button>
  </div>
)
```

### File Upload Pattern

```typescript
const uploadSchema = z.object({
  document: z.instanceof(File).optional(),
  description: z.string().min(1, "Description required")
})

// In component
<FormField
  control={form.control}
  name="document"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Document</FormLabel>
      <FormControl>
        <Upload
          beforeUpload={() => false}
          onChange={(info) => {
            const file = info.fileList[0]?.originFileObj
            field.onChange(file)
          }}
          fileList={field.value ? [{
            uid: '1',
            name: field.value.name,
            status: 'done'
          }] : []}
        >
          <Button icon={<UploadOutlined />}>
            Select File
          </Button>
        </Upload>
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

## ♿ Accessibility Patterns

### Required Patterns

```typescript
// Always include proper ARIA attributes
<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel htmlFor={field.name}>
        Email Address *
      </FormLabel>
      <FormControl>
        <Input
          {...field}
          id={field.name}
          type="email"
          aria-describedby={`${field.name}-error`}
          aria-invalid={!!form.formState.errors.email}
          aria-required="true"
        />
      </FormControl>
      <FormMessage
        id={`${field.name}-error`}
        role="alert"
        aria-live="polite"
      />
    </FormItem>
  )}
/>

// Form submission status
const [submitStatus, setSubmitStatus] = useState('')

<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
>
  {submitStatus}
</div>

// Update status on form actions
const handleSubmit = (data: FormData) => {
  setSubmitStatus("Submitting form...")
  submitMutation.mutate(data, {
    onSuccess: () => setSubmitStatus("Form submitted successfully"),
    onError: () => setSubmitStatus("Form submission failed")
  })
}
```

## 🚫 Anti-Patterns

### ❌ Don't Use Custom Form State

```typescript
// ❌ Bad: Manual form state
function BadForm() {
  const [formData, setFormData] = useState({})
  const [errors, setErrors] = useState({})

  const handleSubmit = (e) => {
    e.preventDefault()
    // Manual validation...
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
      />
    </form>
  )
}

// ✅ Good: React Hook Form
function GoodForm() {
  const form = useForm({
    resolver: zodResolver(schema)
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField control={form.control} name="name" />
      </form>
    </Form>
  )
}
```

### ❌ Don't Use Inline Validation

```typescript
// ❌ Bad: Inline validation
const validateEmail = (email: string) => {
  if (!email) return 'Email required'
  if (!/\S+@\S+\.\S+/.test(email)) return 'Invalid email'
  return null
}

// ✅ Good: Zod schema
const schema = z.object({
  email: z.string().email('Invalid email'),
})
```

## 🧪 Testing Patterns

### Component Testing

```typescript
import { render, screen, userEvent } from '@testing-library/react'
import { ContactForm } from './ContactForm'

describe('ContactForm', () => {
  it('submits form with valid data', async () => {
    const onSubmit = vi.fn()
    render(<ContactForm onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText(/name/i), 'John Doe')
    await userEvent.type(screen.getByLabelText(/email/i), 'john@example.com')
    await userEvent.type(screen.getByLabelText(/message/i), 'Hello world')

    await userEvent.click(screen.getByRole('button', { name: /submit/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'John Doe',
      email: 'john@example.com',
      message: 'Hello world',
      priority: 'medium'
    })
  })

  it('shows validation errors', async () => {
    render(<ContactForm />)

    await userEvent.click(screen.getByRole('button', { name: /submit/i }))

    expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
  })
})
```

### Schema Testing

```typescript
import { contactFormSchema } from '@/schemas/contactForm'

describe('contactFormSchema', () => {
  it('validates correct data', () => {
    const validData = {
      name: 'John Doe',
      email: 'john@example.com',
      message: 'Hello world',
      priority: 'medium' as const,
    }

    expect(() => contactFormSchema.parse(validData)).not.toThrow()
  })

  it('rejects invalid email', () => {
    const invalidData = {
      name: 'John Doe',
      email: 'invalid-email',
      message: 'Hello world',
    }

    expect(() => contactFormSchema.parse(invalidData)).toThrow()
  })
})
```

## 📋 Form Checklist

Before submitting any form implementation:

### Required Elements

- [ ] Zod schema defined in `schemas/` directory
- [ ] TypeScript types inferred from schema
- [ ] React Hook Form with zodResolver
- [ ] Proper defaultValues
- [ ] TanStack Query mutation for submission
- [ ] Error handling with toast notifications
- [ ] Loading states on submit button

### Accessibility

- [ ] All inputs have labels
- [ ] Required fields marked with `*`
- [ ] ARIA attributes on form controls
- [ ] Error messages with `role="alert"`
- [ ] Form submission status announced

### Testing

- [ ] Component tests with RTL
- [ ] Schema validation tests
- [ ] Form submission tests
- [ ] Error state tests

### Performance

- [ ] No unnecessary re-renders
- [ ] Memoized expensive operations
- [ ] Optimistic updates where appropriate

This pattern is mandatory for all forms in FormDee. No exceptions.
