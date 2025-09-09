# FormDee Forms Guide

## Overview

This guide covers the standardized approach to building forms in FormDee using React Hook Form (RHF), Zod validation, and Ant Design components.

## Core Libraries

- **react-hook-form**: Form state management
- **zod**: Schema validation
- **@hookform/resolvers**: Zod integration with RHF
- **antd**: UI components

## Basic Form Pattern

### 1. Define the Schema

```typescript
import { z } from 'zod'

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  subscribe: z.boolean().optional(),
})

type ContactFormData = z.infer<typeof contactSchema>
```

### 2. Create the Form Component

```typescript
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input, Button, Checkbox, Form } from 'antd'
import { ValidatedField } from '@/components/form/ValidatedInput'

export function ContactForm() {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    mode: 'onBlur', // Validate on blur for better UX
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      message: '',
      subscribe: false,
    },
  })

  const onSubmit = async (data: ContactFormData) => {
    try {
      await submitContact(data)
      toast.success('Contact form submitted!')
      reset()
    } catch (error) {
      toast.error('Failed to submit form')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Controller
        name="name"
        control={control}
        render={({ field }) => (
          <Form.Item
            label="Name"
            validateStatus={errors.name ? 'error' : ''}
            help={errors.name?.message}
          >
            <Input {...field} placeholder="Enter your name" />
          </Form.Item>
        )}
      />

      {/* More fields... */}

      <Button type="primary" htmlType="submit" loading={isSubmitting}>
        Submit
      </Button>
    </form>
  )
}
```

## Real-time Validation UX

### Visual Feedback Pattern

Our forms provide immediate visual feedback with icons and colors:

```typescript
import { ValidatedField } from '@/components/form/ValidatedInput'

export function FormWithValidation() {
  const form = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange', // Real-time validation
  })

  return (
    <form>
      <ValidatedField
        field={{
          key: 'email',
          label: 'Email',
          type: 'email',
          required: true,
          placeholder: 'user@example.com',
        }}
        control={form.control}
        error={form.formState.errors.email}
        name="email"
      />
    </form>
  )
}
```

### Validation States

1. **Untouched**: Default state, no visual indicators
2. **Valid**: Green border + ✓ icon
3. **Invalid**: Red border + ✗ icon + error message
4. **Loading**: Disabled state during submission

## Advanced Patterns

### Dynamic Form Fields

```typescript
import { useFieldArray } from 'react-hook-form'

const schema = z.object({
  items: z.array(
    z.object({
      name: z.string().min(1),
      quantity: z.number().min(1),
    })
  ).min(1, 'At least one item is required'),
})

export function DynamicForm() {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      items: [{ name: '', quantity: 1 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  return (
    <form>
      {fields.map((field, index) => (
        <div key={field.id}>
          <Controller
            name={`items.${index}.name`}
            control={form.control}
            render={({ field }) => (
              <Input {...field} placeholder="Item name" />
            )}
          />
          <Button onClick={() => remove(index)}>Remove</Button>
        </div>
      ))}
      <Button onClick={() => append({ name: '', quantity: 1 })}>
        Add Item
      </Button>
    </form>
  )
}
```

### Conditional Fields

```typescript
const schema = z.object({
  hasAccount: z.boolean(),
  accountNumber: z.string().optional(),
}).refine(
  (data) => !data.hasAccount || (data.hasAccount && data.accountNumber),
  {
    message: 'Account number is required when you have an account',
    path: ['accountNumber'],
  }
)

export function ConditionalForm() {
  const form = useForm({
    resolver: zodResolver(schema),
  })

  const hasAccount = form.watch('hasAccount')

  return (
    <form>
      <Controller
        name="hasAccount"
        control={form.control}
        render={({ field }) => (
          <Checkbox {...field} checked={field.value}>
            I have an account
          </Checkbox>
        )}
      />

      {hasAccount && (
        <Controller
          name="accountNumber"
          control={form.control}
          render={({ field }) => (
            <Input {...field} placeholder="Account number" />
          )}
        />
      )}
    </form>
  )
}
```

### File Upload Fields

```typescript
import { Upload } from 'antd'
import { InboxOutlined } from '@ant-design/icons'

const { Dragger } = Upload

const schema = z.object({
  files: z.array(z.instanceof(File)).min(1, 'At least one file is required'),
})

export function FileUploadForm() {
  const form = useForm({
    resolver: zodResolver(schema),
  })

  return (
    <Controller
      name="files"
      control={form.control}
      render={({ field }) => (
        <Dragger
          {...field}
          multiple
          beforeUpload={() => false}
          onChange={(info) => {
            const files = info.fileList.map(file => file.originFileObj).filter(Boolean)
            field.onChange(files)
          }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Click or drag files here</p>
        </Dragger>
      )}
    />
  )
}
```

## Form Submission with TanStack Query

```typescript
import { useMutation } from '@tanstack/react-query'

export function useSubmitForm() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch('/api/submit', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      })
      if (!response.ok) throw new Error('Submit failed')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] })
      toast.success('Form submitted successfully!')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}

export function FormWithMutation() {
  const form = useForm()
  const submitMutation = useSubmitForm()

  const onSubmit = (data: FormData) => {
    submitMutation.mutate(data)
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
      <Button
        type="primary"
        htmlType="submit"
        loading={submitMutation.isPending}
      >
        Submit
      </Button>
    </form>
  )
}
```

## Validation Patterns

### Common Validation Rules

```typescript
// Email validation
const emailSchema = z.string().email('Invalid email format')

// Phone validation
const phoneSchema = z.string().regex(/^(\+\d{1,3}[- ]?)?\d{10}$/, 'Invalid phone number')

// URL validation
const urlSchema = z.string().url('Invalid URL')

// Date validation
const dateSchema = z.string().refine((val) => {
  const date = new Date(val)
  return !isNaN(date.getTime()) && date > new Date()
}, 'Date must be in the future')

// Password validation
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain uppercase letter')
  .regex(/[a-z]/, 'Password must contain lowercase letter')
  .regex(/[0-9]/, 'Password must contain number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain special character')

// Confirm password
const confirmPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })
```

### Custom Validation

```typescript
const customSchema = z
  .object({
    startDate: z.string(),
    endDate: z.string(),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: 'End date must be after start date',
    path: ['endDate'],
  })
```

## Error Handling

### Display Errors

```typescript
export function FormWithErrors() {
  const form = useForm()
  const { errors } = form.formState

  return (
    <form>
      <Controller
        name="email"
        control={form.control}
        render={({ field }) => (
          <Form.Item
            validateStatus={errors.email ? 'error' : ''}
            help={errors.email?.message}
            hasFeedback
          >
            <Input {...field} status={errors.email ? 'error' : ''} />
          </Form.Item>
        )}
      />

      {/* Global error display */}
      {errors.root && (
        <Alert
          message="Form Error"
          description={errors.root.message}
          type="error"
          showIcon
        />
      )}
    </form>
  )
}
```

## Best Practices

### 1. Always Define Default Values

```typescript
const form = useForm({
  defaultValues: {
    name: '',
    email: '',
    subscribe: false,
  },
})
```

### 2. Use Proper Validation Modes

- `onChange`: Real-time validation (best for critical fields)
- `onBlur`: Validate when field loses focus (balanced UX)
- `onSubmit`: Validate only on submit (minimal interruption)

### 3. Handle Loading States

```typescript
<Button
  type="primary"
  htmlType="submit"
  loading={form.formState.isSubmitting}
  disabled={!form.formState.isValid}
>
  Submit
</Button>
```

### 4. Reset Forms After Success

```typescript
const onSubmit = async (data) => {
  await submitData(data)
  form.reset()
}
```

### 5. Provide Clear Error Messages

```typescript
z.string().min(1, 'This field is required')
// vs
z.string().min(1, 'Please enter your name')
```

## Testing Forms

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

describe('ContactForm', () => {
  it('should validate required fields', async () => {
    render(<ContactForm />)

    const submitButton = screen.getByRole('button', { name: /submit/i })
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument()
    })
  })

  it('should submit valid form', async () => {
    const onSubmit = vi.fn()
    render(<ContactForm onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText(/name/i), 'John Doe')
    await userEvent.type(screen.getByLabelText(/email/i), 'john@example.com')

    await userEvent.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
      })
    })
  })
})
```

## Migration from Old Patterns

### From useState to React Hook Form

```typescript
// ❌ Old pattern
const [formData, setFormData] = useState({ name: '', email: '' })
const [errors, setErrors] = useState({})

const handleSubmit = (e) => {
  e.preventDefault()
  // Manual validation
  if (!formData.name) {
    setErrors({ name: 'Required' })
    return
  }
  // Submit
}

// ✅ New pattern
const form = useForm({
  resolver: zodResolver(schema),
  defaultValues: { name: '', email: '' },
})

const onSubmit = form.handleSubmit(async (data) => {
  // Automatic validation via Zod
  await submitData(data)
})
```

## Troubleshooting

### Common Issues

1. **Form not validating**: Check resolver is properly configured
2. **Values not updating**: Ensure Controller is properly connected
3. **Validation not showing**: Check error field path matches schema
4. **Submit not working**: Verify handleSubmit wraps your function

### Debug Mode

```typescript
// Enable DevTools in development
if (process.env.NODE_ENV === 'development') {
  console.log('Form State:', form.formState)
  console.log('Form Errors:', form.formState.errors)
  console.log('Form Values:', form.watch())
}
```
