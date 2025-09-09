import React, { forwardRef, useState, useEffect, useRef } from 'react'
import { MenuOutlined, DeleteOutlined, DownOutlined, UpOutlined } from '@ant-design/icons'
import { Card, Switch, Button, Tag, Space, Typography } from 'antd'
import { FormField } from '@/lib/types'

const { Text } = Typography

interface FieldItemProps {
  field: FormField
  index: number
  isDragging: boolean
  isDragOver: boolean
  isEditing: boolean
  isAnimating?: boolean
  onEdit: () => void
  onRemove: () => void
  onRequiredChange: (_required: boolean) => void
  editingComponent?: React.ReactNode
}

export const FieldItem = forwardRef<HTMLDivElement, FieldItemProps>(
  (
    {
      field,
      index: _index,
      isDragging,
      isDragOver: _isDragOver,
      isEditing,
      isAnimating = false,
      onEdit,
      onRemove,
      onRequiredChange,
      editingComponent,
    },
    ref
  ) => {
    const [isHovered, setIsHovered] = useState(false)
    const prevFieldRef = useRef<FormField>(field)

    // Update previous field reference
    useEffect(() => {
      prevFieldRef.current = field
    }, [field])

    const getFieldTypeLabel = (type: string) => {
      const labels: Record<string, string> = {
        text: 'text',
        email: 'email',
        number: 'number',
        date: 'date',
        textarea: 'textarea',
        select: 'dropdown',
        radio: 'radio',
        checkbox: 'checkbox',
        file: 'file upload',
      }
      return labels[type] || type
    }

    // Add pulse animation when field is animating
    useEffect(() => {
      if (isAnimating) {
        const timer = setTimeout(() => {
          // Animation cleanup handled by parent
        }, 500)
        return () => clearTimeout(timer)
      }
      // Required return for all code paths
      return undefined
    }, [isAnimating])

    return (
      <Card
        ref={ref}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        size="small"
        hoverable={!isDragging && !isEditing}
        style={{
          marginBottom: 8,
          borderColor: isEditing ? '#1890ff' : undefined,
          boxShadow: isEditing ? '0 0 0 2px rgba(24, 144, 255, 0.2)' : undefined,
          animation: isAnimating ? 'pulse 0.5s' : undefined,
          zIndex: isEditing ? 10 : 'auto',
        }}
        styles={{ body: { padding: 0 } }}
      >
        <div
          style={{
            padding: '12px',
            cursor: 'pointer',
            backgroundColor: isHovered && !isDragging && !isEditing ? '#fafafa' : undefined,
            transition: 'background-color 0.3s',
          }}
          onClick={onEdit}
        >
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space>
              {/* Drag handle */}
              <MenuOutlined
                style={{
                  color: '#999',
                  cursor: 'move',
                  fontSize: '16px',
                }}
                onClick={(e) => e.stopPropagation()}
              />

              {/* Field info */}
              <Space>
                <Text strong>{field.label}</Text>
                <Tag color="default">{getFieldTypeLabel(field.type)}</Tag>
              </Space>
            </Space>

            {/* Action buttons */}
            <Space onClick={(e) => e.stopPropagation()}>
              {/* Required toggle */}
              <Space size="small">
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Required
                </Text>
                <Switch
                  size="small"
                  checked={field.required}
                  onChange={onRequiredChange}
                  disabled={isDragging}
                />
              </Space>

              {/* Expand/Collapse indicator */}
              {isEditing ? <UpOutlined /> : <DownOutlined />}

              {/* Remove button */}
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove()
                }}
                disabled={isDragging || isEditing}
              />
            </Space>
          </Space>
        </div>

        {/* Editing form */}
        {isEditing && (
          <div
            style={{
              borderTop: '1px solid #f0f0f0',
              background: 'linear-gradient(to bottom, #fafafa, #ffffff)',
              position: 'relative',
              zIndex: 10,
            }}
          >
            {editingComponent}
          </div>
        )}
      </Card>
    )
  }
)

FieldItem.displayName = 'FieldItem'
