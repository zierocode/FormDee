'use client'

import { useState, useEffect } from 'react'

interface HelpModalProps {
  title: string
  children: React.ReactNode
}

export function HelpModal({ title, children }: HelpModalProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-8rem)]">
          {children}
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <button
            onClick={() => setIsOpen(false)}
            className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  )
}

interface HelpButtonProps {
  title: string
  children: React.ReactNode
}

export function HelpButton({ title, children }: HelpButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  const openModal = () => {
    setIsOpen(true)
    setIsAnimating(true)
  }

  const closeModal = () => {
    setIsAnimating(false)
    setTimeout(() => setIsOpen(false), 150) // Wait for animation to complete
  }

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeModal()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden' // Prevent background scroll
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 transition-colors font-medium"
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>
        <span className="whitespace-nowrap">How to set this up?</span>
      </button>
      
      {isOpen && (
        <div 
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-150 ease-out ${
            isAnimating 
              ? 'bg-black bg-opacity-50 opacity-100' 
              : 'bg-black bg-opacity-0 opacity-0'
          }`}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal()
          }}
        >
          <div 
            className={`bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden transform transition-all duration-150 ease-out ${
              isAnimating 
                ? 'scale-100 opacity-100 translate-y-0' 
                : 'scale-95 opacity-0 translate-y-2'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 pr-8">{title}</h2>
              <button
                onClick={closeModal}
                className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-8rem)]">
              {children}
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end pr-2">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Got it!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}