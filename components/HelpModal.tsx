'use client'

import { useState, useEffect } from 'react'
import { CloseOutlined, QuestionCircleOutlined, CheckOutlined } from '@ant-design/icons'
import { Button } from 'antd'

interface HelpModalProps {
  title: string
  children: React.ReactNode
}

export function HelpModal({ title, children }: HelpModalProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-6">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600"
          />
        </div>

        {/* Content */}
        <div className="max-h-[calc(80vh-8rem)] overflow-y-auto p-6">{children}</div>

        {/* Footer */}
        <div className="border-t bg-gray-50 p-6">
          <Button
            type="primary"
            icon={<CheckOutlined />}
            onClick={() => setIsOpen(false)}
            className="w-full sm:w-auto"
          >
            Got it!
          </Button>
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
      <Button
        type="link"
        icon={<QuestionCircleOutlined />}
        onClick={openModal}
        className="inline-flex items-center gap-1.5 px-0 text-sm font-medium text-blue-600 hover:text-blue-700"
        size="small"
      >
        <span className="whitespace-nowrap">How to set this up?</span>
      </Button>

      {isOpen && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-150 ease-out ${
            isAnimating ? 'bg-black bg-opacity-50 opacity-100' : 'bg-black bg-opacity-0 opacity-0'
          }`}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal()
          }}
        >
          <div
            className={`max-h-[80vh] w-full max-w-2xl transform overflow-hidden rounded-lg bg-white shadow-xl transition-all duration-150 ease-out ${
              isAnimating
                ? 'translate-y-0 scale-100 opacity-100'
                : 'translate-y-2 scale-95 opacity-0'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 p-6">
              <h2 className="pr-8 text-xl font-semibold text-gray-900">{title}</h2>
              <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={closeModal}
                className="flex-shrink-0 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                size="small"
                aria-label="Close modal"
              />
            </div>

            {/* Content */}
            <div className="max-h-[calc(80vh-8rem)] overflow-y-auto p-6">{children}</div>

            {/* Footer */}
            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
              <div className="flex justify-end pr-2">
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={closeModal}
                  className="px-4 py-2"
                >
                  Got it!
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
