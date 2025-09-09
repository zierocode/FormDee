import React, { useRef, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { FormField } from '@/lib/types'
import { FieldItem } from './FieldItem'

interface Props {
  fields: FormField[]
  onEdit: (_index: number) => void
  onRemove: (_index: number) => void
  onReorder: (_dragIndex: number, _dropIndex: number) => void
  onRequiredChange: (_index: number, _required: boolean) => void
  editingIndex: number | null
  editingFieldComponent?: React.ReactNode
  isAnimatingUndo?: boolean
}

export function FieldList({
  fields,
  onEdit,
  onRemove,
  onReorder,
  onRequiredChange,
  editingIndex,
  editingFieldComponent,
  isAnimatingUndo = false,
}: Props) {
  const fieldRefs = useRef<(HTMLElement | null)[]>([])

  // Add animation when undo/redo affects field order
  useEffect(() => {
    if (isAnimatingUndo) {
      fieldRefs.current.forEach((ref, index) => {
        if (ref) {
          // Add a staggered animation effect
          ref.style.animation = `fieldSlide 0.5s ease-out ${index * 0.05}s`
        }
      })

      // Clean up animations after they complete
      const timeout = setTimeout(() => {
        fieldRefs.current.forEach((ref) => {
          if (ref) {
            ref.style.animation = ''
          }
        })
      }, 600)

      return () => clearTimeout(timeout)
    }
    // Required return for all code paths
    return undefined
  }, [isAnimatingUndo, fields])

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return
    }

    if (result.source.index === result.destination.index) {
      return
    }

    onReorder(result.source.index, result.destination.index)
  }

  if (fields.length === 0) {
    // Don't show "No fields" message when Add Field editor is open
    if (editingIndex === -1) {
      return null
    }

    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
        <p className="text-gray-500">No fields added yet</p>
        <p className="mt-1 text-sm text-gray-400">Click "Add Field" to get started</p>
      </div>
    )
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="fields-list">
        {(provided, _snapshot) => (
          <ul
            className="space-y-2"
            data-field-list
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {fields.map((field, index) => (
              <Draggable key={field.key} draggableId={field.key} index={index}>
                {(provided, snapshot) => (
                  <li
                    ref={(el) => {
                      provided.innerRef(el)
                      fieldRefs.current[index] = el
                    }}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={provided.draggableProps.style}
                  >
                    <FieldItem
                      field={field}
                      index={index}
                      isDragging={snapshot.isDragging}
                      isDragOver={false}
                      isEditing={editingIndex === index}
                      isAnimating={isAnimatingUndo}
                      onEdit={() => onEdit(index)}
                      onRemove={() => onRemove(index)}
                      onRequiredChange={(required) => onRequiredChange(index, required)}
                      editingComponent={editingIndex === index ? editingFieldComponent : undefined}
                    />
                  </li>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </ul>
        )}
      </Droppable>
    </DragDropContext>
  )
}
