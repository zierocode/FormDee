'use client'
import React from 'react'
import { LoadingOutlined } from '@ant-design/icons'
import {
  Button as AntButton,
  Input as AntInput,
  Select as AntSelect,
  Card as AntCard,
  Form as AntForm,
  Modal as AntModal,
  Spin,
  Alert,
  notification,
} from 'antd'
import type { ButtonProps, InputProps, SelectProps, CardProps } from 'antd'

// Button wrapper with consistent styling
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => (
  <AntButton ref={ref} {...props} />
))
Button.displayName = 'Button'

// Input wrapper with validation styling
export const Input = React.forwardRef<any, InputProps>((props, ref) => (
  <AntInput ref={ref} {...props} />
))
Input.displayName = 'Input'

// Select wrapper
export const Select = React.forwardRef<any, SelectProps>((props, ref) => (
  <AntSelect ref={ref} {...props} />
))
Select.displayName = 'Select'

// Card wrapper with consistent shadow
export const Card = React.forwardRef<HTMLDivElement, CardProps>((props, ref) => (
  <AntCard
    ref={ref}
    {...props}
    style={{
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
      borderRadius: 8,
      ...props.style,
    }}
  />
))
Card.displayName = 'Card'

// Form wrapper
export const Form = AntForm

// Modal wrapper
export const Modal = AntModal

// Loading spinner with consistent styling
export function LoadingSpinner({
  size = 'default',
  text,
}: {
  size?: 'small' | 'default' | 'large'
  text?: string
}) {
  const fontSize = size === 'small' ? 24 : size === 'large' ? 48 : 32

  return (
    <div className="flex flex-col items-center justify-center">
      <Spin
        size={size}
        indicator={<LoadingOutlined style={{ fontSize, color: '#1890ff' }} spin />}
      />
      {text && <div className="mt-4 text-gray-600">{text}</div>}
    </div>
  )
}

// Error boundary component
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <Alert
            message="Something went wrong"
            description={this.state.error?.message || 'An unexpected error occurred'}
            type="error"
            showIcon
          />
        )
      )
    }

    return this.props.children
  }
}

// Toast notifications (now using notifications for bottom-right positioning)
export const toast = {
  success: (msg: string) => notification.success({
    message: 'Success',
    description: msg,
    placement: 'bottomRight',
    duration: 3,
  }),
  error: (msg: string) => notification.error({
    message: 'Error',
    description: msg,
    placement: 'bottomRight',
    duration: 4,
  }),
  warning: (msg: string) => notification.warning({
    message: 'Warning',
    description: msg,
    placement: 'bottomRight',
    duration: 4,
  }),
  info: (msg: string) => notification.info({
    message: 'Info',
    description: msg,
    placement: 'bottomRight',
    duration: 3,
  }),
}

// Complex notifications
export const notify = {
  success: (title: string, description?: string) =>
    notification.success({
      message: title,
      description,
      placement: 'topRight',
    }),
  error: (title: string, description?: string) =>
    notification.error({
      message: title,
      description,
      placement: 'topRight',
    }),
  warning: (title: string, description?: string) =>
    notification.warning({
      message: title,
      description,
      placement: 'topRight',
    }),
  info: (title: string, description?: string) =>
    notification.info({
      message: title,
      description,
      placement: 'topRight',
    }),
}

// Export all Ant Design components for convenience
export * from 'antd'
