# ADR-003: Adopt hello-pangea/dnd for Drag and Drop

**Date:** 2025-09-09  
**Status:** Accepted  
**Decision Makers:** Development Team

## Context

FormDee's form builder requires sophisticated drag and drop functionality for:

- Reordering form fields in the builder interface
- Moving fields between different sections/groups
- Intuitive visual feedback during drag operations
- Keyboard accessibility for drag and drop
- Touch device support for mobile form building
- Smooth animations and transitions

## Decision

We will adopt **hello-pangea/dnd** (maintained fork of react-beautiful-dnd) as our standard drag and drop solution, replacing any HTML5 Drag and Drop API usage.

### Key Benefits:

- **Accessibility First**: Built-in keyboard navigation and screen reader support
- **Beautiful Animations**: Smooth, natural feeling drag animations
- **Touch Support**: Works seamlessly on mobile devices
- **TypeScript Support**: Excellent TypeScript integration
- **Performance**: Optimized for smooth 60fps animations
- **Maintenance**: Actively maintained fork of the proven react-beautiful-dnd

## Implementation Pattern

### Basic Drag and Drop Setup

```typescript
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'

interface FormField {
  id: string
  type: string
  label: string
  required: boolean
}

export function FormFieldsList() {
  const [fields, setFields] = useState<FormField[]>(initialFields)

  const handleDragEnd = (result: DropResult) => {
    const { destination, source } = result

    // Dropped outside the list
    if (!destination) return

    // No movement
    if (destination.index === source.index) return

    const reorderedFields = Array.from(fields)
    const [removed] = reorderedFields.splice(source.index, 1)
    reorderedFields.splice(destination.index, 0, removed)

    setFields(reorderedFields)

    // Persist order change
    saveFieldOrder(reorderedFields.map(f => f.id))
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="form-fields">
        {(provided, snapshot) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={cn(
              "space-y-2 p-4 rounded-lg transition-colors",
              snapshot.isDraggingOver ? "bg-blue-50" : "bg-gray-50"
            )}
          >
            {fields.map((field, index) => (
              <Draggable
                key={field.id}
                draggableId={field.id}
                index={index}
              >
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={cn(
                      "p-3 bg-white rounded border transition-shadow",
                      snapshot.isDragging
                        ? "shadow-lg ring-2 ring-blue-500"
                        : "shadow-sm hover:shadow-md"
                    )}
                  >
                    <FieldEditor field={field} />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  )
}
```

### Multi-List Drag and Drop

```typescript
interface Board {
  sections: {
    [key: string]: {
      id: string
      title: string
      fieldIds: string[]
    }
  }
  fields: {
    [key: string]: FormField
  }
}

export function FormBuilderBoard() {
  const [board, setBoard] = useState<Board>(initialBoard)

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result

    if (!destination) return

    const sourceSection = board.sections[source.droppableId]
    const destinationSection = board.sections[destination.droppableId]

    // Moving within the same section
    if (source.droppableId === destination.droppableId) {
      const newFieldIds = Array.from(sourceSection.fieldIds)
      newFieldIds.splice(source.index, 1)
      newFieldIds.splice(destination.index, 0, draggableId)

      setBoard(prev => ({
        ...prev,
        sections: {
          ...prev.sections,
          [sourceSection.id]: {
            ...sourceSection,
            fieldIds: newFieldIds
          }
        }
      }))
      return
    }

    // Moving between sections
    const sourceFieldIds = Array.from(sourceSection.fieldIds)
    const destinationFieldIds = Array.from(destinationSection.fieldIds)

    sourceFieldIds.splice(source.index, 1)
    destinationFieldIds.splice(destination.index, 0, draggableId)

    setBoard(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sourceSection.id]: {
          ...sourceSection,
          fieldIds: sourceFieldIds
        },
        [destinationSection.id]: {
          ...destinationSection,
          fieldIds: destinationFieldIds
        }
      }
    }))
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4">
        {Object.values(board.sections).map(section => (
          <div key={section.id} className="flex-1">
            <h3 className="font-semibold mb-2">{section.title}</h3>
            <Droppable droppableId={section.id}>
              {(provided, snapshot) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={cn(
                    "min-h-32 p-3 rounded-lg border-2 border-dashed",
                    snapshot.isDraggingOver
                      ? "border-blue-400 bg-blue-50"
                      : "border-gray-300"
                  )}
                >
                  {section.fieldIds.map((fieldId, index) => {
                    const field = board.fields[fieldId]
                    return (
                      <Draggable
                        key={fieldId}
                        draggableId={fieldId}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={cn(
                              "mb-2 p-2 bg-white rounded border",
                              snapshot.isDragging ? "shadow-lg" : "shadow-sm"
                            )}
                          >
                            {field.label}
                          </div>
                        )}
                      </Draggable>
                    )
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  )
}
```

## Alternatives Considered

### 1. HTML5 Drag and Drop API

**Pros:**

- Native browser support
- No additional dependencies
- Good browser compatibility

**Cons:**

- Poor mobile/touch support
- Complex API that's hard to use correctly
- Limited styling options during drag
- Poor accessibility support
- Inconsistent behavior across browsers

### 2. react-dnd

**Pros:**

- Very flexible and powerful
- Good for complex drag scenarios
- Large ecosystem

**Cons:**

- Steeper learning curve
- More complex API
- Requires more boilerplate
- Less opinionated (more setup required)

### 3. dnd-kit

**Pros:**

- Modern, well-maintained
- Good accessibility support
- Modular architecture
- Good TypeScript support

**Cons:**

- Newer library (less proven)
- Different API patterns
- More complex setup for simple cases

### 4. Custom Implementation

**Pros:**

- Full control over behavior
- No additional dependencies
- Custom animations

**Cons:**

- Significant development time
- Need to handle touch events, accessibility, etc.
- Cross-browser compatibility issues
- Maintenance burden

## Consequences

### Positive

- **Better UX**: Smooth, intuitive drag and drop experience
- **Accessibility**: Built-in keyboard navigation and screen reader support
- **Mobile Support**: Touch-friendly interactions on mobile devices
- **Developer Experience**: Simple, well-documented API
- **Visual Polish**: Beautiful animations and transitions
- **Proven Solution**: Battle-tested in many production applications

### Negative

- **Bundle Size**: Additional ~30kb dependency
- **Learning Curve**: Team needs to learn DnD concepts and patterns
- **Layout Dependencies**: Requires specific DOM structure

### Neutral

- **Vendor Lock-in**: Low - well-established patterns, easy to migrate
- **Performance**: Excellent for typical use cases, may need optimization for very large lists

## Implementation Plan

### Phase 1: Basic Implementation

- [x] Install hello-pangea/dnd dependency
- [x] Implement basic field reordering in form builder
- [x] Add visual feedback during drag operations
- [x] Test accessibility with keyboard navigation

### Phase 2: Advanced Features

- [ ] Multi-list drag and drop for sections
- [ ] Drag and drop for field grouping
- [ ] Custom drag handles and styling
- [ ] Drag and drop for large lists (virtualization)

### Phase 3: Polish and Optimization

- [ ] Custom animations and transitions
- [ ] Improved mobile experience
- [ ] Performance optimization for large forms
- [ ] Advanced accessibility features

## Accessibility Considerations

```typescript
// Accessibility enhancements
const handleDragStart = (start: DragStart) => {
  // Announce drag start to screen readers
  announceToScreenReader(`Started dragging ${start.draggableId}`)
}

const handleDragUpdate = (update: DragUpdate) => {
  if (update.destination) {
    announceToScreenReader(
      `Moving ${update.draggableId} to position ${update.destination.index + 1}`
    )
  }
}

const handleDragEnd = (result: DropResult) => {
  if (result.destination) {
    announceToScreenReader(
      `Moved ${result.draggableId} to position ${result.destination.index + 1}`
    )
  } else {
    announceToScreenReader(`Cancelled dragging ${result.draggableId}`)
  }
}

// Keyboard shortcuts
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      // Cancel any active drag
      cancelDrag()
    }
  }

  document.addEventListener('keydown', handleKeyDown)
  return () => document.removeEventListener('keydown', handleKeyDown)
}, [])
```

## Performance Optimization

```typescript
// Memoize drag components to prevent unnecessary re-renders
const MemoizedDraggable = memo(({ field, index }: DraggableProps) => (
  <Draggable draggableId={field.id} index={index}>
    {(provided, snapshot) => (
      <FieldComponent
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        field={field}
        isDragging={snapshot.isDragging}
      />
    )}
  </Draggable>
))

// Virtualization for large lists
const VirtualizedDragList = ({ fields }: { fields: FormField[] }) => {
  return (
    <FixedSizeList
      height={600}
      itemCount={fields.length}
      itemSize={80}
      itemData={fields}
    >
      {({ index, style, data }) => (
        <div style={style}>
          <MemoizedDraggable field={data[index]} index={index} />
        </div>
      )}
    </FixedSizeList>
  )
}
```

## Success Metrics

- **User Experience**: 95% positive feedback on drag and drop UX
- **Accessibility**: 100% keyboard navigation support
- **Performance**: <16ms average drag response time
- **Mobile Usage**: 80% successful mobile drag operations
- **Developer Productivity**: 70% faster implementation of new DnD features

## References

- [hello-pangea/dnd Documentation](https://github.com/hello-pangea/dnd)
- [Accessibility Guide](https://github.com/hello-pangea/dnd/blob/main/docs/guides/accessibility.md)
- [Performance Guide](https://github.com/hello-pangea/dnd/blob/main/docs/guides/performance.md)
- [Migration from react-beautiful-dnd](https://github.com/hello-pangea/dnd/blob/main/docs/guides/migration.md)

---

**Next Review Date:** 2025-12-09  
**Reviewed By:** Development Team  
**Status:** ✅ Active Implementation
