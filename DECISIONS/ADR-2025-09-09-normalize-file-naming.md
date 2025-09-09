# ADR-004: Normalize Component File Naming

**Date:** 2025-09-09  
**Status:** Accepted  
**Decision Makers:** Development Team

## Context

FormDee has inconsistent component file naming, with many files having redundant suffixes like:

- `FormRendererAntd.tsx` (indicating UI library)
- `UserListQuery.tsx` (indicating data fetching pattern)
- `ContactFormHookForm.tsx` (indicating form library)

This creates confusion and makes the codebase harder to navigate. We need a consistent, canonical naming convention.

## Decision

We will adopt **canonical component naming** without library-specific suffixes, using clear, descriptive names that focus on functionality rather than implementation details.

### Naming Rules

1. **Use descriptive, functional names**: Focus on what the component does, not how
2. **Remove library suffixes**: No `Antd`, `Query`, `HookForm`, etc.
3. **Use PascalCase**: Standard React component naming
4. **Be specific but concise**: Clear purpose without unnecessary verbosity
5. **Avoid technical implementation details**: Hide internal choices

## Implementation Examples

### ✅ Correct Naming

```
FormRenderer.tsx           # Renders forms (not FormRendererAntd.tsx)
UserList.tsx              # Lists users (not UserListQuery.tsx)
ContactForm.tsx            # Contact form (not ContactFormHookForm.tsx)
FieldEditor.tsx            # Edits fields (not FieldEditorModal.tsx)
DataTable.tsx              # Shows tabular data (not DataTableAntd.tsx)
FileUpload.tsx             # Handles file uploads (not FileUploadDrive.tsx)
```

### ❌ Incorrect Naming

```
FormRendererAntd.tsx       # Implementation detail exposed
UserListQuery.tsx          # Data fetching pattern exposed
ContactFormHookForm.tsx    # Library choice exposed
FieldEditorModal.tsx       # UI pattern exposed
DataTableTanstack.tsx      # Library dependency exposed
FileUploadGoogle.tsx       # Service provider exposed
```

## Migration Plan

### Phase 1: Identify Files to Rename

Current files with problematic naming:

- `components/FormRendererAntd.tsx` → `FormRenderer.tsx`
- `components/FormsListAntd.tsx` → `FormsList.tsx`
- `components/FormRendererAntd.backup.tsx` → Remove (backup file)

### Phase 2: Rename Files and Update Imports

```typescript
// Before
import { FormRendererAntd } from './FormRendererAntd'

// After
import { FormRenderer } from './FormRenderer'
```

### Phase 3: Update Documentation

- Update README examples
- Update component documentation
- Update import statements in guides

## Consequences

### Positive

- **Cleaner codebase**: Easier to navigate and understand
- **Future-proof**: Names don't change when implementation changes
- **Better IDE experience**: Clearer autocomplete and search results
- **Consistency**: Uniform naming across the entire codebase
- **Professional appearance**: Clean, standard React conventions

### Negative

- **Migration effort**: Need to rename files and update imports
- **Temporary confusion**: Team needs to remember new names
- **Git history**: May complicate blame/history tracking

### Neutral

- **No functional impact**: Pure refactoring with no behavior changes

## Guidelines for New Components

### Naming Components

```typescript
// ✅ Good: Focuses on functionality
export function UserProfile({ user }: UserProfileProps) {}
export function CommentList({ comments }: CommentListProps) {}
export function PaymentForm({ onSubmit }: PaymentFormProps) {}

// ❌ Bad: Exposes implementation details
export function UserProfileAntd({ user }: UserProfileProps) {}
export function CommentListQuery({ comments }: CommentListProps) {}
export function PaymentFormRHF({ onSubmit }: PaymentFormProps) {}
```

### Organizing Components by Purpose

```
components/
├── forms/                 # Form-related components
│   ├── ContactForm.tsx    # Not ContactFormHookForm.tsx
│   ├── FieldEditor.tsx    # Not FieldEditorAntd.tsx
│   └── FormRenderer.tsx   # Not FormRendererAntd.tsx
├── ui/                    # Reusable UI components
│   ├── Button.tsx         # Not ButtonAntd.tsx
│   ├── Modal.tsx          # Not ModalAntd.tsx
│   └── DataTable.tsx      # Not DataTableTanstack.tsx
└── layout/                # Layout components
    ├── Header.tsx         # Not HeaderNav.tsx
    ├── Sidebar.tsx        # Not SidebarMenu.tsx
    └── Footer.tsx         # Not FooterInfo.tsx
```

### Handling Multiple Implementations

When multiple implementations are truly needed:

```typescript
// ✅ Good: Use directory structure
components/
├── charts/
│   ├── BarChart.tsx       # Default implementation
│   ├── LineChart.tsx      # Default implementation
│   └── advanced/          # Advanced variants
│       ├── AdvancedBarChart.tsx
│       └── InteractiveLineChart.tsx

// ✅ Good: Use descriptive suffixes for variants
components/
├── UserCard.tsx           # Default card
├── UserCardCompact.tsx    # Compact variant
└── UserCardDetailed.tsx   # Detailed variant

// ❌ Bad: Library-specific suffixes
components/
├── UserCardAntd.tsx
├── UserCardChakra.tsx
└── UserCardMui.tsx
```

## Special Cases

### Legacy Components

When migrating legacy components, add temporary aliases:

```typescript
// FormRenderer.tsx (new canonical name)
export function FormRenderer(props: FormRendererProps) {
  // Component implementation
}

// Legacy export for backward compatibility (temporary)
export { FormRenderer as FormRendererAntd }
```

### Third-party Wrappers

When wrapping third-party components, focus on purpose:

```typescript
// ✅ Good: Focus on purpose
export function RichTextEditor() {
  return <ReactQuill {...props} />
}

// ❌ Bad: Expose library
export function ReactQuillEditor() {
  return <ReactQuill {...props} />
}
```

## Implementation Checklist

### File Renaming

- [ ] Rename `FormRendererAntd.tsx` to `FormRenderer.tsx`
- [ ] Rename `FormsListAntd.tsx` to `FormsList.tsx`
- [ ] Remove `FormRendererAntd.backup.tsx`
- [ ] Update all import statements
- [ ] Update test files

### Documentation Updates

- [ ] Update README component examples
- [ ] Update CONTRIBUTING guide examples
- [ ] Update component documentation
- [ ] Update architectural diagrams

### Code Quality

- [ ] Run TypeScript check after renames
- [ ] Update ESLint configurations if needed
- [ ] Verify all imports resolve correctly
- [ ] Update jest/vitest test configurations

## Success Metrics

- **Consistency**: 100% of components follow canonical naming
- **Discoverability**: 90% faster component location in IDE
- **Maintainability**: Zero library-specific suffixes in component names
- **Developer Experience**: Positive feedback on naming clarity

## Examples from Migration

### Before Migration

```typescript
// components/FormRendererAntd.tsx
export function FormRendererAntd({ refKey }: Props) {
  // Implementation
}

// Usage
import { FormRendererAntd } from '@/components/FormRendererAntd'
<FormRendererAntd refKey="contact-form" />
```

### After Migration

```typescript
// components/FormRenderer.tsx
export function FormRenderer({ refKey }: Props) {
  // Same implementation, better name
}

// Usage
import { FormRenderer } from '@/components/FormRenderer'
<FormRenderer refKey="contact-form" />
```

## References

- [React Component Naming Best Practices](https://react.dev/learn/your-first-component#naming-a-component)
- [TypeScript Module Resolution](https://www.typescriptlang.org/docs/handbook/module-resolution.html)
- [Clean Code: Meaningful Names](https://blog.cleancoder.com/uncle-bob/2017/05/03/TestDefinitions.html)

---

**Next Review Date:** 2025-12-09  
**Reviewed By:** Development Team  
**Status:** ✅ Active Implementation
