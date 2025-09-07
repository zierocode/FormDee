import { HTMLAttributes } from 'react'

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | 'none'
}

export function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'pulse',
  ...props
}: SkeletonProps) {
  const baseClasses = 'bg-gray-200'
  
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  }

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  }

  const defaultDimensions = {
    text: { height: '1rem', width: '100%' },
    circular: { height: '40px', width: '40px' },
    rectangular: { height: '100px', width: '100%' },
  }

  const dimensions = defaultDimensions[variant]
  const finalWidth = width || dimensions.width
  const finalHeight = height || dimensions.height

  return (
    <div
      className={`${baseClasses} ${animationClasses[animation]} ${variantClasses[variant]} ${className}`}
      style={{
        width: typeof finalWidth === 'number' ? `${finalWidth}px` : finalWidth,
        height: typeof finalHeight === 'number' ? `${finalHeight}px` : finalHeight,
      }}
      {...props}
    />
  )
}

export function FormSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton variant="text" height={32} width="40%" />
      <Skeleton variant="text" height={20} width="60%" />
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton variant="text" height={16} width="30%" />
            <Skeleton variant="rectangular" height={40} />
          </div>
        ))}
      </div>
      <Skeleton variant="rectangular" height={40} width={120} />
    </div>
  )
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="divide-y rounded-md border">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex items-center justify-between p-3">
          <div className="space-y-1 w-2/3">
            <Skeleton variant="text" height={16} width="40%" />
            <Skeleton variant="text" height={12} width="28%" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton variant="rectangular" height={32} width={64} />
            <Skeleton variant="rectangular" height={32} width={64} />
          </div>
        </div>
      ))}
    </div>
  )
}