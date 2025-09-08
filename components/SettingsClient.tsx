'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './AuthProvider'

interface Settings {
  aiModel: string
  aiApiKey: string
}

export function SettingsClient() {
  const router = useRouter()
  const { adminKey } = useAuth()
  const [settings, setSettings] = useState<Settings>({
    aiModel: 'gpt-5-mini',
    aiApiKey: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const aiModels = [
    { value: 'gpt-5-mini', label: 'GPT-5-mini' }
  ]

  useEffect(() => {
    if (adminKey) {
      fetchSettings()
    } else {
      // If no adminKey yet, just set loading to false
      setLoading(false)
    }
  }, [adminKey])

  const fetchSettings = async () => {
    if (!adminKey) {
      setLoading(false)
      return
    }
    
    try {
      const response = await fetch('/api/settings', {
        headers: {
          'x-admin-key': adminKey
        }
      })

      if (response.ok) {
        const data = await response.json()
        setSettings({
          aiModel: data.aiModel || 'gpt-5-mini',
          aiApiKey: data.aiApiKey || ''
        })
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!settings.aiApiKey) {
      setMessage('Error: Please enter an API key first')
      return
    }

    setSaving(true)
    setMessage('Testing AI configuration...')

    try {
      // First, test the AI configuration
      const testResponse = await fetch('/api/settings/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify({
          aiModel: settings.aiModel,
          aiApiKey: settings.aiApiKey
        })
      })

      const testResult = await testResponse.json()

      if (!testResponse.ok) {
        setMessage(`❌ Test failed: ${testResult.error || 'Invalid configuration'}`)
        setSaving(false)
        return
      }

      // If test passes, save the settings
      setMessage('Test passed! Saving settings...')
      
      const saveResponse = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify(settings)
      })

      if (saveResponse.ok) {
        setMessage('✅ Settings saved successfully!')
        setTimeout(() => setMessage(''), 3000)
      } else {
        const error = await saveResponse.json()
        setMessage(`Error: ${error.error || 'Failed to save settings'}`)
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage('Error: Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (!settings.aiApiKey) {
      setMessage('Error: Please enter an API key first')
      return
    }

    setTesting(true)
    setMessage('')

    try {
      const response = await fetch('/api/settings/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify({
          aiModel: settings.aiModel,
          aiApiKey: settings.aiApiKey
        })
      })

      const result = await response.json()

      if (response.ok) {
        setMessage('✅ Success! AI model and API key are working correctly.')
        setTimeout(() => setMessage(''), 5000)
      } else {
        setMessage(`❌ Test failed: ${result.error || 'Invalid configuration'}`)
      }
    } catch (error) {
      console.error('Error testing settings:', error)
      setMessage('❌ Error: Failed to test AI configuration')
    } finally {
      setTesting(false)
    }
  }

  const selectedModel = aiModels.find(m => m.value === settings.aiModel)

  return (
    <div className="space-y-6">
      {/* Header with back button and title - matching form creator */}
      <div className="flex items-center gap-3">
        <a href="/builder" className="btn-secondary">← Back</a>
        <h1 className="text-2xl font-semibold">Settings</h1>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading settings...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* AI Model Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI Model *
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
              >
                <span>{selectedModel?.label || 'Select AI Model'}</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={dropdownOpen ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                </svg>
              </button>
              
              {dropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                  {aiModels.map((model) => (
                    <button
                      key={model.value}
                      type="button"
                      onClick={() => {
                        setSettings({ ...settings, aiModel: model.value })
                        setDropdownOpen(false)
                      }}
                      className={`w-full px-3 py-2 text-left hover:bg-gray-50 ${
                        settings.aiModel === model.value ? 'bg-blue-50 text-blue-600' : ''
                      }`}
                    >
                      {model.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Select the AI model to use for form generation
            </p>
          </div>

          {/* API Key Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI API Key *
            </label>
            <textarea
              value={settings.aiApiKey}
              onChange={(e) => setSettings({ ...settings, aiApiKey: e.target.value })}
              placeholder="Enter your API key..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
            <p className="mt-1 text-sm text-gray-500">
              Your API key for AI-powered form generation
            </p>
          </div>

          {/* Message Display */}
          {message && (
            <div className={`p-3 rounded-md ${
              message.includes('Error') 
                ? 'bg-red-100 text-red-700' 
                : 'bg-green-100 text-green-700'
            }`}>
              {message}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || testing || !settings.aiApiKey}
              className="btn btn-primary"
            >
              {saving ? (message.includes('Testing') ? 'Testing...' : 'Saving...') : 'Save Settings'}
            </button>
            <button
              onClick={handleTest}
              disabled={saving || testing || !settings.aiApiKey}
              className="btn"
            >
              {testing ? 'Testing...' : 'Test Configuration'}
            </button>
          </div>

          {/* Quick Guide Panel */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
              <span className="mr-2">💡</span> Quick Guide
            </h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>
                <strong>AI Model:</strong> Select the AI model for intelligent form generation. The system supports various AI providers.
              </li>
              <li>
                <strong>API Key:</strong> Enter your API key from your AI provider. Keep it secure and never share it publicly.
              </li>
              <li>
                <strong>Test Configuration:</strong> Use the "Test Configuration" button to verify your AI model and API key are working correctly before saving.
              </li>
              <li>
                <strong>Form Generation:</strong> After configuration, use "Create by AI" button in Form Builder to generate forms with natural language prompts.
              </li>
              <li>
                <strong>Usage:</strong> Monitor your AI provider's usage dashboard to track API calls and manage costs effectively.
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}