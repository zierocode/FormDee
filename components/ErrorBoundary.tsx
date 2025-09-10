'use client'

import { Component, ErrorInfo, ReactNode } from 'react'
import { ERROR_MESSAGES } from '@/lib/constants'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (_error: Error, _errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error boundary caught error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="max-w-md space-y-4 p-6 text-center">
            <div className="text-5xl text-red-500">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900">Something went wrong</h2>
            <p className="text-gray-600">{this.state.error?.message || ERROR_MESSAGES.GENERIC}</p>
            <button onClick={this.handleReset} className="btn-secondary">
              Try again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
