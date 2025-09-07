'use client'
import { useEffect, useState } from 'react'

interface SuccessModalProps {
  isOpen: boolean
  onClose: () => void
  message: string
}

export function SuccessModal({ isOpen, onClose, message }: SuccessModalProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      // Trigger animation after a brief delay to ensure proper transition
      setTimeout(() => setIsAnimating(true), 10)
      
      const timer = setTimeout(() => {
        // Start fade out animation
        setIsAnimating(false)
        // Remove from DOM after animation completes
        setTimeout(() => {
          setIsVisible(false)
          onClose()
        }, 300)
      }, 3000) // Auto-close after 3 seconds
      
      return () => clearTimeout(timer)
    }
    return undefined
  }, [isOpen, onClose])

  if (!isVisible) return null

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-start justify-center transition-all duration-300 ${
        isAnimating ? 'bg-black/50' : 'bg-black/0'
      }`}
    >
      <div 
        className={`mx-4 mt-8 max-w-sm rounded-lg bg-white p-6 shadow-lg transform transition-all duration-300 ${
          isAnimating 
            ? 'translate-y-0 opacity-100 scale-100' 
            : '-translate-y-4 opacity-0 scale-95'
        }`}
      >
        <div className="flex items-center space-x-3">
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-100 transition-transform duration-500 ${
            isAnimating ? 'scale-100' : 'scale-0'
          }`}>
            <svg 
              className="h-6 w-6 text-green-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2.5} 
                d="M5 13l4 4L19 7" 
              />
            </svg>
          </div>
          <p className="text-sm text-gray-800">{message}</p>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => {
              setIsAnimating(false)
              setTimeout(() => {
                setIsVisible(false)
                onClose()
              }, 300)
            }}
            className="rounded-md bg-green-600 px-3 py-1 text-sm text-white transition-colors hover:bg-green-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}