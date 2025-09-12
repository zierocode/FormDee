'use client'
import { useEffect, useState } from 'react'
import {
  SaveOutlined,
  PlusOutlined,
  BarChartOutlined,
  CopyOutlined,
  ExportOutlined,
  CloseOutlined,
  DeleteOutlined,
  LinkOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import { zodResolver } from '@hookform/resolvers/zod'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Form from 'antd/es/form'
import Input from 'antd/es/input'
import notification from 'antd/es/notification'
import Popconfirm from 'antd/es/popconfirm'
import Space from 'antd/es/space'
import Spin from 'antd/es/spin'
import Switch from 'antd/es/switch'
import Typography from 'antd/es/typography'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { useForm, Controller } from 'react-hook-form'
import { useForms, useUpsertForm } from '@/hooks/use-forms'
import { useResponseStats } from '@/hooks/use-responses'
import { FormConfig, FormField } from '@/lib/types'
import { formConfigSchema, type FormConfigData } from '@/lib/validation'
import { FieldEditor } from './FieldEditor'
import { FieldList } from './FieldList'

const { Title, Text: _Text } = Typography
const { TextArea } = Input

type Props = {
  initial?: FormConfig
  mode: 'create' | 'edit'
  refKeyHint?: string
  duplicateFrom?: string
  aiGeneratedForm?: any
  saveButtonContainer?: string
}

export function BuilderForm({
  initial,
  mode,
  refKeyHint,
  duplicateFrom,
  aiGeneratedForm,
  saveButtonContainer,
}: Props) {
  const [notificationApi, contextHolder] = notification.useNotification({
    placement: 'bottomRight',
    duration: 3,
  })
  const [fields, setFields] = useState<FormField[]>(initial?.fields ?? [])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [slackEnabled, setSlackEnabled] = useState(initial?.slackEnabled ?? false)
  const [googleSheetEnabled, setGoogleSheetEnabled] = useState(!!initial?.googleSheetEnabled)
  const [googleAuthStatus, setGoogleAuthStatus] = useState<{
    authenticated: boolean
    user: any
    loading: boolean
  }>({ authenticated: false, user: null, loading: true })
  const [copySuccess, setCopySuccess] = useState(false)
  const [loadingInitial, setLoadingInitial] = useState(mode === 'edit')
  const [hasInitialized, setHasInitialized] = useState(false)
  const [initialFieldsSnapshot, setInitialFieldsSnapshot] = useState<string>('')
  const [initialGoogleSheetUrl, setInitialGoogleSheetUrl] = useState<string>('')
  const [syncingResponses, setSyncingResponses] = useState(false)
  const [testingGoogleSheet, setTestingGoogleSheet] = useState(false)
  const [testingSlack, setTestingSlack] = useState(false)
  const [, setGoogleSheetValidated] = useState(false)
  const [googleSheetValidationError, setGoogleSheetValidationError] = useState<string>('')
  const [saveButtonPortalContainer, setSaveButtonPortalContainer] = useState<HTMLElement | null>(
    null
  )

  // TanStack Query hooks
  // Only fetch all forms when in create mode (for duplicate and refKey validation)
  const { data: formsData } = useForms({ enabled: mode === 'create' })
  const { data: responseStats } = useResponseStats(refKeyHint || initial?.refKey || '')
  const upsertFormMutation = useUpsertForm({ showNotifications: false })

  // Track if we're currently saving to prevent state reset during save
  const [isSaving, setIsSaving] = useState(false)

  // React Hook Form setup
  const form = useForm<FormConfigData>({
    resolver: zodResolver(formConfigSchema),
    defaultValues: {
      title: initial?.title ?? '',
      description: initial?.description ?? '',
      refKey: initial?.refKey ?? refKeyHint ?? '',
      slackWebhookUrl: initial?.slackWebhookUrl ?? '',
      fields: initial?.fields ?? [],
    },
    mode: 'onChange',
  })

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid: _isValid, isDirty },
  } = form

  // Watch form values
  const watchedValues = watch()

  // Find the save button container element
  useEffect(() => {
    if (saveButtonContainer) {
      const container = document.querySelector(saveButtonContainer) as HTMLElement
      setSaveButtonPortalContainer(container)
    } else {
      setSaveButtonPortalContainer(null)
    }
  }, [saveButtonContainer])

  // Check Google authentication status
  // Memoize the refKey to avoid unnecessary re-checks
  const effectiveRefKey = mode === 'edit' ? initial?.refKey : watchedValues.refKey

  useEffect(() => {
    // Skip if no refKey, but still set loading to false for duplicate mode
    if (!effectiveRefKey) {
      // For duplicate mode or new form, we still need to set loading to false
      setGoogleAuthStatus({
        authenticated: false,
        user: null,
        loading: false,
      })
      return
    }

    const checkGoogleAuth = async () => {
      try {
        const response = await fetch(`/api/auth/google/status?refKey=${effectiveRefKey}`, {
          credentials: 'include',
        })
        const data = await response.json()

        if (data.ok && data.data) {
          setGoogleAuthStatus({
            authenticated: data.data.authenticated,
            user: data.data.user,
            loading: false,
          })
        } else {
          setGoogleAuthStatus({
            authenticated: false,
            user: null,
            loading: false,
          })
        }
      } catch (error) {
        console.error('Failed to check Google auth status:', error)
        setGoogleAuthStatus({
          authenticated: false,
          user: null,
          loading: false,
        })
      }
    }

    checkGoogleAuth()

    // Handle OAuth callback parameters
    const urlParams = new URLSearchParams(window.location.search)
    const googleAuth = urlParams.get('google_auth')

    if (googleAuth === 'success') {
      notificationApi.success({
        message: 'Success',
        description: 'Google authentication successful!',
      })
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
      // Refresh auth status
      checkGoogleAuth()
    } else if (googleAuth === 'error') {
      notificationApi.error({
        message: 'Authentication Failed',
        description: 'Google authentication failed. Please try again.',
      })
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [notificationApi, effectiveRefKey])

  // Capture initial field structure and Google Sheet URL for change detection
  useEffect(() => {
    if (mode === 'edit' && initial?.fields) {
      const fieldsSnapshot = JSON.stringify(
        initial.fields.map((f) => ({ key: f.key, label: f.label, type: f.type }))
      )
      setInitialFieldsSnapshot(fieldsSnapshot)
      setInitialGoogleSheetUrl(initial.googleSheetUrl || '')
    }
  }, [initial, mode])

  // Reset Google Sheet validation when URL changes
  useEffect(() => {
    setGoogleSheetValidated(false)
    setGoogleSheetValidationError('')
  }, [watchedValues.googleSheetUrl])

  // Header buttons component (Save and Discard)
  const HeaderButtons = () => {
    return (
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button
          danger
          icon={<CloseOutlined />}
          disabled={!isDirty}
          onClick={() => {
            // Reset form to initial values
            if (initial) {
              form.reset({
                title: initial.title,
                description: initial.description || '',
                refKey: initial.refKey,
                slackWebhookUrl: initial.slackWebhookUrl || '',
                fields: initial.fields,
              })
              setFields(initial.fields)
              setSlackEnabled(initial.slackEnabled ?? false)
            } else {
              form.reset({
                title: '',
                description: '',
                refKey: refKeyHint || '',
                slackWebhookUrl: '',
                fields: [],
              })
              setFields([])
              setSlackEnabled(false)
            }
          }}
        >
          Discard Changes
        </Button>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          loading={upsertFormMutation.isPending || testingGoogleSheet}
          onClick={async () => {
            // If Google Sheet is enabled, validate it first (check existence and writability only)
            if (
              googleSheetEnabled &&
              watchedValues.googleSheetUrl?.trim() &&
              googleAuthStatus.authenticated
            ) {
              setTestingGoogleSheet(true)
              try {
                // Call the validation endpoint directly
                const response = await fetch('/api/forms/validate-google-sheet', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    credentials: 'include',
                  },
                  body: JSON.stringify({
                    googleSheetUrl: watchedValues.googleSheetUrl,
                    refKey: watchedValues.refKey,
                    fields: fields,
                  }),
                })

                const data = await response.json()
                if (!data.ok) {
                  // Validation failed, show error and stop
                  notificationApi.error({
                    key: 'google-sheet-validation',
                    message: 'Google Sheet Validation Failed',
                    description: data.error || 'Please fix the Google Sheet URL and try again.',
                  })
                  setTestingGoogleSheet(false)
                  return
                }

                // Check if a new spreadsheet was created
                if (data.newSpreadsheetUrl) {
                  // Update the form with the new URL
                  form.setValue('googleSheetUrl', data.newSpreadsheetUrl)
                  notificationApi.success({
                    key: 'google-sheet-validation',
                    message: 'New Google Sheet Created!',
                    description:
                      data.message || 'A new spreadsheet has been created and linked to your form.',
                    duration: 5,
                  })
                } else {
                  // Validation successful for existing sheet
                  notificationApi.success({
                    key: 'google-sheet-validation',
                    message: 'Google Sheet Validated',
                    description: 'Sheet exists and is writable!',
                  })
                }
              } catch (error: any) {
                // Validation error occurred
                notificationApi.error({
                  key: 'google-sheet-validation',
                  message: 'Google Sheet Validation Error',
                  description: error.message || 'Could not validate Google Sheet connection.',
                })
                setTestingGoogleSheet(false)
                return
              } finally {
                setTestingGoogleSheet(false)
              }
            }

            // Proceed with form submission
            form.handleSubmit(onSubmit)()
          }}
        >
          Save Form
        </Button>
      </div>
    )
  }

  // Initialize form data based on mode and props
  useEffect(() => {
    // Don't update form state if we're currently saving to prevent overwrites
    if (isSaving) {
      return
    }

    // Only initialize once to prevent resetting after save
    if (hasInitialized && mode === 'edit') {
      return
    }

    if (aiGeneratedForm) {
      form.reset({
        title: aiGeneratedForm.title || '',
        description: aiGeneratedForm.description || '',
        refKey: '',
        slackWebhookUrl: '',
        googleSheetUrl: '',
        fields: aiGeneratedForm.fields || [],
      })
      setFields(aiGeneratedForm.fields || [])
      setLoadingInitial(false)
      setHasInitialized(true) // Mark as initialized
      return
    }

    if (duplicateFrom && formsData) {
      const sourceForm = formsData.find((f) => f.refKey === duplicateFrom)
      if (sourceForm) {
        form.reset({
          title: `${sourceForm.title} (Copy)`,
          description: sourceForm.description || '',
          refKey: '',
          slackWebhookUrl: sourceForm.slackWebhookUrl || '',
          googleSheetUrl: '', // Don't duplicate Google Sheet URL
          fields: sourceForm.fields || [],
        })
        setFields(sourceForm.fields || [])
        setSlackEnabled(sourceForm.slackEnabled ?? false)
        setGoogleSheetEnabled(false) // Don't duplicate Google Sheet settings
      }
      setLoadingInitial(false)
      setHasInitialized(true) // Mark as initialized
      return
    }

    if (initial) {
      form.reset({
        title: initial.title,
        description: initial.description || '',
        refKey: initial.refKey,
        slackWebhookUrl: initial.slackWebhookUrl || '',
        googleSheetUrl: initial.googleSheetUrl || '',
        fields: initial.fields,
      })
      setFields(initial.fields)
      setSlackEnabled(initial.slackEnabled ?? false)
      setGoogleSheetEnabled(!!initial.googleSheetEnabled)
      setLoadingInitial(false) // Set loading to false after processing initial data
      setHasInitialized(true) // Mark as initialized
    } else if (mode === 'create') {
      setLoadingInitial(false)
      setHasInitialized(true) // Mark as initialized
    }
  }, [initial, aiGeneratedForm, duplicateFrom, formsData, form, mode, hasInitialized, isSaving])

  // Update form fields when fields array changes
  useEffect(() => {
    setValue('fields', fields, { shouldValidate: true, shouldDirty: true })
  }, [fields, setValue])

  // Handle Slack toggle
  const handleSlackToggle = (enabled: boolean) => {
    setSlackEnabled(enabled)
    if (!enabled) {
      setValue('slackWebhookUrl', '', { shouldValidate: true })
    }
  }

  // Handle Google Sheet toggle
  const handleGoogleSheetToggle = (enabled: boolean) => {
    setGoogleSheetEnabled(enabled)
    // Don't clear the URL when disabling - preserve it for when they enable again
  }

  // Field management functions - currently unused but may be needed for future features
  // const addField = (field: FormField) => {
  //   setFields((prev) => [...prev, field])
  //   setEditingIndex(null) // Close the editor after adding
  // }

  const addNewField = () => {
    const newField: FormField = {
      key: `field_${Date.now()}`,
      label: 'New Field',
      type: 'text',
      required: false,
    }
    setFields((prev) => [...prev, newField])
    setEditingIndex(fields.length) // Edit the newly added field
  }

  const updateField = (index: number, field: FormField) => {
    setFields((prev) => {
      const newFields = prev.map((f, i) => (i === index ? field : f))
      // Immediately update the form's fields value to keep it in sync
      setValue('fields', newFields, { shouldValidate: true, shouldDirty: true })
      return newFields
    })
  }

  const removeField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index))
    if (editingIndex === index) {
      setEditingIndex(null)
    }
  }

  const reorderFields = (dragIndex: number, dropIndex: number) => {
    setFields((prev) => {
      const newFields = [...prev]
      const [draggedItem] = newFields.splice(dragIndex, 1)
      newFields.splice(dropIndex, 0, draggedItem)
      return newFields
    })
  }

  // Form submission
  const onSubmit = async (data: FormConfigData) => {
    // Check for duplicate refKey
    const refChanged = mode === 'edit' && initial?.refKey && data.refKey !== initial.refKey
    if ((mode === 'create' || refChanged) && data.refKey.trim()) {
      const exists = formsData?.some((f) => f.refKey === data.refKey)
      if (exists) {
        notificationApi.error({
          message: 'Duplicate URL',
          description: 'URL already exists. Choose another.',
        })
        return
      }
    }

    // Auto-disable Slack if webhook URL is empty or invalid
    let finalSlackEnabled = slackEnabled
    if (
      slackEnabled &&
      (!data.slackWebhookUrl?.trim() ||
        !data.slackWebhookUrl.startsWith('https://hooks.slack.com/'))
    ) {
      finalSlackEnabled = false
      setSlackEnabled(false)

      if (!data.slackWebhookUrl?.trim()) {
        notificationApi.warning({
          message: 'Slack Disabled',
          description: 'Slack notifications disabled due to empty webhook URL',
        })
      } else if (!data.slackWebhookUrl.startsWith('https://hooks.slack.com/')) {
        notificationApi.warning({
          message: 'Slack Disabled',
          description: 'Slack notifications disabled due to invalid webhook URL format',
        })
      }
    }

    // Auto-disable Google Sheets if URL is empty or invalid
    let finalGoogleSheetEnabled = googleSheetEnabled
    if (
      googleSheetEnabled &&
      (!data.googleSheetUrl?.trim() ||
        !data.googleSheetUrl.includes('docs.google.com/spreadsheets'))
    ) {
      finalGoogleSheetEnabled = false
      setGoogleSheetEnabled(false)

      if (!data.googleSheetUrl?.trim()) {
        notificationApi.warning({
          message: 'Google Sheets Disabled',
          description: 'Google Sheets integration disabled due to empty URL',
        })
      } else if (!data.googleSheetUrl.includes('docs.google.com/spreadsheets')) {
        notificationApi.warning({
          message: 'Google Sheets Disabled',
          description: 'Google Sheets integration disabled due to invalid URL format',
        })
      }
    }

    // Check if form structure or Google Sheet URL has changed (for automatic resync)
    const currentFieldsSnapshot = JSON.stringify(
      fields.map((f) => ({ key: f.key, label: f.label, type: f.type }))
    )
    const hasStructureChanged =
      mode === 'edit' && initialFieldsSnapshot && initialFieldsSnapshot !== currentFieldsSnapshot
    const hasGoogleSheetUrlChanged =
      mode === 'edit' && initialGoogleSheetUrl !== (data.googleSheetUrl || '')
    const hasGoogleSheetsIntegration =
      finalGoogleSheetEnabled && data.googleSheetUrl && googleAuthStatus.authenticated
    const needsAutomaticResync =
      hasGoogleSheetsIntegration && (hasStructureChanged || hasGoogleSheetUrlChanged)

    try {
      // Make sure to use the current fields state, not the form data fields
      const savedForm = await upsertFormMutation.mutateAsync({
        ...data,
        fields: fields, // Use current fields state instead of form data
        slackEnabled: finalSlackEnabled, // Use the final slack enabled state
        googleSheetEnabled: finalGoogleSheetEnabled, // Use the final google sheet enabled state
        prevRefKey: initial?.refKey,
      })

      // Update local state to match the saved form data
      setFields(savedForm.fields || fields)

      // Also update the form values to keep everything in sync
      form.setValue('fields', savedForm.fields || fields, {
        shouldValidate: false,
        shouldDirty: false,
      })

      // Update the initial snapshots after successful save
      if (mode === 'edit') {
        setInitialFieldsSnapshot(currentFieldsSnapshot)
        setInitialGoogleSheetUrl(data.googleSheetUrl || '')
      }

      // Auto-resync to Google Sheets if structure or URL changed
      if (needsAutomaticResync) {
        let resyncReason = ''
        if (hasStructureChanged && hasGoogleSheetUrlChanged) {
          resyncReason = 'form structure and Google Sheet URL changes'
        } else if (hasStructureChanged) {
          resyncReason = 'form structure changes'
        } else if (hasGoogleSheetUrlChanged) {
          resyncReason = 'Google Sheet URL change'
        }

        notificationApi.success({
          key: 'form-save',
          message: 'Form Saved & Auto-Resync',
          description: `Form saved successfully! Automatically resyncing existing responses to Google Sheets due to ${resyncReason}...`,
          duration: 4,
        })

        // Automatically resync responses
        setTimeout(() => {
          handleSyncResponses()
        }, 1000)
      } else {
        notificationApi.success({
          key: 'form-save',
          message: 'Form Saved',
          description: 'Form saved successfully!',
        })
      }

      if (mode === 'create') {
        window.location.href = `/builder/${encodeURIComponent(data.refKey)}`
      }
    } catch (error: any) {
      notificationApi.error({
        message: 'Save Failed',
        description: error?.message || 'Failed to save form',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Test Slack webhook
  const handleTestSlack = async () => {
    setTestingSlack(true)
    try {
      const response = await fetch('/api/forms/test-slack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          credentials: 'include',
        },
        body: JSON.stringify({
          refKey: watchedValues.refKey,
          slackWebhookUrl: watchedValues.slackWebhookUrl,
        }),
      })

      const data = await response.json()
      if (data.ok) {
        notificationApi.success({
          key: 'slack-test',
          message: 'Test Successful',
          description: 'Slack test message sent successfully!',
        })
      } else {
        notificationApi.error({
          key: 'slack-test',
          message: 'Test Failed',
          description: data.error || 'Slack test failed',
        })
      }
    } catch (error: any) {
      notificationApi.error({
        key: 'slack-test',
        message: 'Test Failed',
        description: error.message || 'Slack test failed',
      })
    } finally {
      setTestingSlack(false)
    }
  }

  // Test Google Sheet connection
  const handleTestGoogleSheet = async () => {
    setTestingGoogleSheet(true)
    try {
      const response = await fetch('/api/forms/test-google-sheet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          credentials: 'include',
        },
        body: JSON.stringify({
          refKey: watchedValues.refKey,
          googleSheetUrl: watchedValues.googleSheetUrl,
          fields: fields,
        }),
      })

      const data = await response.json()
      if (data.ok) {
        setGoogleSheetValidated(true)
        setGoogleSheetValidationError('')

        // If a new spreadsheet was created, update the form field
        if (data.newSpreadsheetUrl) {
          form.setValue('googleSheetUrl', data.newSpreadsheetUrl, {
            shouldValidate: false,
            shouldDirty: false,
          })
          setInitialGoogleSheetUrl(data.newSpreadsheetUrl)

          notificationApi.success({
            key: 'google-sheet-test',
            message: 'New Google Sheet Created',
            description: `Created new spreadsheet "${data.details?.spreadsheetTitle}" and exported ${data.details?.responsesExported || 0} responses`,
            duration: 6,
          })

          // Save the form with the new Google Sheet URL
          setTimeout(async () => {
            try {
              const formData = form.getValues()
              await upsertFormMutation.mutateAsync({
                ...formData,
                fields: fields,
                googleSheetEnabled,
                googleSheetUrl: data.newSpreadsheetUrl,
                prevRefKey: initial?.refKey,
              })
            } catch (error) {
              console.error('Failed to update form with new Google Sheet URL:', error)
            }
          }, 500)
        } else if (data.details?.responsesExported !== undefined) {
          // Sheet was validated and responses were exported
          notificationApi.success({
            key: 'google-sheet-test',
            message: 'Sheet Validated & Synced',
            description: `${data.details.status}. Exported ${data.details.responsesExported} responses.`,
            duration: 5,
          })
        } else {
          // Simple validation success
          notificationApi.success({
            key: 'google-sheet-test',
            message: 'Test Successful',
            description: data.message || 'Google Sheet connection test successful!',
          })
        }
      } else {
        setGoogleSheetValidated(false)
        setGoogleSheetValidationError(data.error || 'Google Sheet test failed')
        notificationApi.error({
          key: 'google-sheet-test',
          message: 'Test Failed',
          description: data.error || 'Google Sheet test failed',
        })
      }
    } catch (error: any) {
      setGoogleSheetValidated(false)
      setGoogleSheetValidationError(error.message || 'Google Sheet test failed')
      notificationApi.error({
        key: 'google-sheet-test',
        message: 'Test Failed',
        description: error.message || 'Google Sheet test failed',
      })
    } finally {
      setTestingGoogleSheet(false)
    }
  }

  // Handle Google authentication with popup
  const handleGoogleAuth = async () => {
    try {
      if (!effectiveRefKey) {
        notificationApi.error({
          message: 'Error',
          description: 'Please save the form first before setting up Google authentication',
        })
        return
      }

      const response = await fetch(`/api/auth/google?popup=true&refKey=${effectiveRefKey}`, {
        credentials: 'include',
      })
      const data = await response.json()

      if (data.ok && data.data.authUrl) {
        // Open popup for OAuth
        const popup = window.open(
          data.data.authUrl,
          'google-auth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        )

        // Check if popup was blocked
        if (!popup || popup.closed || typeof popup.closed === 'undefined') {
          notificationApi.error({
            message: 'Popup Blocked',
            description:
              'Please allow popups for this site and try again. You can authenticate by temporarily disabling your popup blocker.',
          })
          return
        }

        // Function to refresh auth status
        const refreshAuthStatus = async () => {
          try {
            const response = await fetch(`/api/auth/google/status?refKey=${effectiveRefKey}`, {
              credentials: 'include',
            })
            const data = await response.json()

            if (data.ok && data.data) {
              setGoogleAuthStatus({
                authenticated: data.data.authenticated,
                user: data.data.user,
                loading: false,
              })
            }
          } catch (error) {
            console.error('Failed to refresh auth status:', error)
          }
        }

        // Setup timeout ref for cleanup
        // eslint-disable-next-line prefer-const
        let cleanupTimeout: NodeJS.Timeout

        // Listen for messages from popup
        const handleMessage = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return

          if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
            // Don't try to close popup - it will close itself or user will close it
            // This avoids COOP errors
            window.removeEventListener('message', handleMessage)
            clearTimeout(cleanupTimeout)

            notificationApi.success({
              message: 'Success',
              description: 'Google authentication successful!',
            })

            // Refresh auth status from server
            refreshAuthStatus()
          } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
            // Don't try to close popup - it will close itself or user will close it
            // This avoids COOP errors
            window.removeEventListener('message', handleMessage)
            clearTimeout(cleanupTimeout)

            notificationApi.error({
              message: 'Authentication Failed',
              description: 'Google authentication failed. Please try again.',
            })
          } else if (event.data.type === 'GOOGLE_AUTH_CLOSED') {
            // User closed the popup window
            window.removeEventListener('message', handleMessage)
            clearTimeout(cleanupTimeout)

            // Refresh auth status in case something changed
            setTimeout(() => {
              refreshAuthStatus()
            }, 500)
          }
        }

        window.addEventListener('message', handleMessage)

        // Clean up after 5 minutes if nothing happens
        cleanupTimeout = setTimeout(
          () => {
            window.removeEventListener('message', handleMessage)
            // Refresh auth status one more time
            refreshAuthStatus()
          },
          5 * 60 * 1000
        )

        // Don't try to check popup.closed due to COOP restrictions
        // The popup will communicate via postMessage when done
      } else {
        notificationApi.error({
          message: 'Authentication Error',
          description: data.error || 'Failed to initiate Google authentication',
        })
      }
    } catch (error: any) {
      notificationApi.error({
        message: 'Authentication Error',
        description: error.message || 'Failed to initiate Google authentication',
      })
    }
  }

  // Handle Google logout
  const handleGoogleLogout = async () => {
    try {
      const currentRefKey = mode === 'edit' ? initial?.refKey : watchedValues.refKey
      if (!currentRefKey) {
        notificationApi.error({
          message: 'Error',
          description: 'Cannot logout without form refKey',
        })
        return
      }

      const response = await fetch('/api/auth/google/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ refKey: currentRefKey }),
      })
      const data = await response.json()

      if (data.ok) {
        setGoogleAuthStatus({
          authenticated: false,
          user: null,
          loading: false,
        })

        notificationApi.success({
          message: 'Success',
          description: 'Successfully logged out from Google',
        })
      } else {
        notificationApi.error({
          message: 'Logout Failed',
          description: data.error || 'Failed to logout',
        })
      }
    } catch (error: any) {
      notificationApi.error({
        message: 'Logout Failed',
        description: error.message || 'Failed to logout',
      })
    }
  }

  // Sync existing responses to Google Sheets
  const handleSyncResponses = async () => {
    if (!watchedValues.googleSheetUrl || !googleAuthStatus.authenticated) {
      notificationApi.error({
        message: 'Resync Failed',
        description: 'Google Sheets URL and authentication required',
      })
      return
    }

    setSyncingResponses(true)

    // Directly proceed with resync - the export endpoint will handle sheet creation if needed
    try {
      const response = await fetch('/api/forms/export-responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          refKey: watchedValues.refKey,
          googleSheetUrl: watchedValues.googleSheetUrl,
          fields: fields,
        }),
      })

      const data = await response.json()
      if (data.ok) {
        // If a new spreadsheet was created, update the form with the new URL
        if (data.newSpreadsheetUrl) {
          form.setValue('googleSheetUrl', data.newSpreadsheetUrl, {
            shouldValidate: false,
            shouldDirty: false,
          })
          setInitialGoogleSheetUrl(data.newSpreadsheetUrl) // Update initial URL to prevent unnecessary resync prompts

          notificationApi.success({
            key: 'resync-success',
            message: 'New Google Sheet Created',
            description: `Created new spreadsheet and exported ${data.details?.responsesExported || 0} responses. The form has been updated with the new URL.`,
            duration: 6,
          })

          // Save the form with the new Google Sheet URL
          setTimeout(async () => {
            try {
              const formData = form.getValues()
              await upsertFormMutation.mutateAsync({
                ...formData,
                fields: fields,
                googleSheetEnabled,
                googleSheetUrl: data.newSpreadsheetUrl,
                prevRefKey: initial?.refKey,
              })
            } catch (error) {
              console.error('Failed to update form with new Google Sheet URL:', error)
            }
          }, 500)
        } else {
          notificationApi.success({
            key: 'resync-success',
            message: 'Resync Successful',
            description:
              data.message || 'Successfully resynced existing responses to Google Sheets',
          })
        }
      } else {
        notificationApi.error({
          key: 'resync-error',
          message: 'Resync Failed',
          description: data.error || 'Failed to resync responses',
        })
      }
    } catch (error: any) {
      notificationApi.error({
        key: 'resync-error',
        message: 'Resync Failed',
        description: error.message || 'Failed to resync responses',
      })
    } finally {
      setSyncingResponses(false)
    }
  }

  // Open Google Sheet in new tab
  const handleOpenSheet = () => {
    const sheetUrl = watchedValues.googleSheetUrl
    if (sheetUrl?.trim()) {
      window.open(sheetUrl, '_blank')
    }
  }

  // Copy form URL
  const copyFormUrl = async () => {
    const url = `${window.location.origin}/f/${encodeURIComponent(watchedValues.refKey || 'example')}`
    try {
      await navigator.clipboard.writeText(url)
      setCopySuccess(true)
      notificationApi.success({
        message: 'Success',
        description: 'Form URL copied to clipboard!',
      })
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      notificationApi.error({
        message: 'Copy Failed',
        description: 'Failed to copy URL',
      })
    }
  }

  // Delete form handler matching FormsList logic
  const [loadingDelete, setLoadingDelete] = useState(false)
  const router = useRouter()

  const handleDeleteClick = async () => {
    if (!initial?.refKey) return

    setLoadingDelete(true)
    try {
      const response = await fetch(`/api/forms?refKey=${encodeURIComponent(initial.refKey)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      const result = await response.json()

      if (result.ok) {
        notificationApi.success({
          message: 'Form Deleted',
          description: `Form "${initial.refKey}" deleted successfully`,
          placement: 'bottomRight',
        })
        // Navigate back to forms list
        router.push('/builder')
      } else {
        throw new Error(result.error?.message || 'Failed to delete form')
      }
    } catch (error: any) {
      notificationApi.error({
        message: 'Delete Failed',
        description: `Failed to delete form: ${error.message}`,
        placement: 'bottomRight',
      })
    } finally {
      setLoadingDelete(false)
    }
  }

  const formUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/f/${encodeURIComponent(watchedValues.refKey || 'example')}`

  if (loadingInitial && mode === 'edit') {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>Loading form...</div>
        </div>
      </Card>
    )
  }

  return (
    <>
      {contextHolder}
      {/* Render header buttons (Discard + Save) via portal */}
      {saveButtonPortalContainer && createPortal(<HeaderButtons />, saveButtonPortalContainer)}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
        {/* Main Form Area */}
        <div style={{ minWidth: 0 }}>
          <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
            <Card
              title="Form Details"
              style={{ marginBottom: 16 }}
              styles={{
                header: {
                  background: 'linear-gradient(135deg, #42a5f5 0%, #478ed1 100%)',
                  color: '#fff',
                },
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Controller
                  name="title"
                  control={control}
                  render={({ field }) => (
                    <Form.Item
                      label="Title"
                      required
                      validateStatus={errors.title ? 'error' : ''}
                      help={errors.title?.message}
                    >
                      <Input {...field} placeholder="Enter form title" />
                    </Form.Item>
                  )}
                />

                <Controller
                  name="refKey"
                  control={control}
                  render={({ field }) => (
                    <Form.Item
                      label="URL"
                      required
                      validateStatus={errors.refKey ? 'error' : ''}
                      help={errors.refKey?.message}
                    >
                      <Input {...field} placeholder="e.g., contact-form, feedback" />
                    </Form.Item>
                  )}
                />
              </div>

              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <Form.Item label="Description">
                    <TextArea {...field} rows={3} placeholder="Optional form description" />
                  </Form.Item>
                )}
              />
            </Card>
          </Form>

          {/* Fields Section */}
          <Card
            styles={{
              header: {
                background: 'linear-gradient(135deg, #42a5f5 0%, #478ed1 100%)',
                color: '#fff',
              },
            }}
            title={
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Title level={4} style={{ margin: 0, color: '#fff' }}>
                  Form Fields
                </Title>
                <Button
                  icon={<PlusOutlined />}
                  onClick={addNewField}
                  style={{
                    backgroundColor: '#fff',
                    borderColor: '#d9d9d9',
                    color: '#000',
                  }}
                >
                  Add Field
                </Button>
              </div>
            }
          >
            <div style={{ minHeight: fields.length === 0 && editingIndex !== -1 ? '120px' : '0' }}>
              <FieldList
                fields={fields}
                onEdit={(i) => setEditingIndex(editingIndex === i ? null : i)}
                onRemove={removeField}
                onReorder={reorderFields}
                onRequiredChange={(idx, required) => {
                  const updatedField = { ...fields[idx], required }
                  updateField(idx, updatedField)
                }}
                editingIndex={editingIndex}
                isAnimatingUndo={false}
                editingFieldComponent={
                  editingIndex !== null && editingIndex >= 0 ? (
                    <FieldEditor
                      value={fields[editingIndex]}
                      onSave={(field) => updateField(editingIndex, field)}
                      onCancel={() => setEditingIndex(null)}
                      existingFields={fields}
                      editingIndex={editingIndex}
                    />
                  ) : null
                }
              />
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div>
          {/* Slack Notifications Card */}
          <Card
            title={<span style={{ color: '#fff' }}>Slack Notifications</span>}
            size="small"
            styles={{
              header: {
                background: 'linear-gradient(135deg, #42a5f5 0%, #478ed1 100%)',
                color: '#fff',
              },
              body: {
                display: slackEnabled ? 'block' : 'none',
                padding: slackEnabled ? '12px' : 0,
              },
            }}
            extra={
              <Switch
                checked={slackEnabled}
                onChange={handleSlackToggle}
                checkedChildren="ON"
                unCheckedChildren="OFF"
                size="small"
                style={{
                  backgroundColor: slackEnabled ? '#52c41a' : undefined,
                }}
              />
            }
          >
            {slackEnabled && (
              <Controller
                name="slackWebhookUrl"
                control={control}
                render={({ field }) => (
                  <Form.Item
                    required
                    validateStatus={field.value?.trim() && errors.slackWebhookUrl ? 'error' : ''}
                    help={field.value?.trim() && errors.slackWebhookUrl?.message}
                    style={{ marginBottom: 0 }}
                  >
                    <Space.Compact style={{ display: 'flex', width: '100%' }}>
                      <Input
                        {...field}
                        placeholder="https://hooks.slack.com/services/..."
                        style={{ flex: 1 }}
                      />
                      <Button
                        onClick={handleTestSlack}
                        disabled={!field.value?.trim()}
                        loading={testingSlack}
                      >
                        Test
                      </Button>
                    </Space.Compact>
                  </Form.Item>
                )}
              />
            )}
          </Card>

          {/* Google Sheet Integration Card */}
          <Card
            title={<span style={{ color: '#fff' }}>Link to Google Sheet</span>}
            size="small"
            style={{ marginTop: 16 }}
            styles={{
              header: {
                background: 'linear-gradient(135deg, #42a5f5 0%, #478ed1 100%)',
                color: '#fff',
              },
              body: {
                display: googleSheetEnabled ? 'block' : 'none',
                padding: googleSheetEnabled ? '12px' : 0,
              },
            }}
            extra={
              <Switch
                checked={googleSheetEnabled}
                onChange={handleGoogleSheetToggle}
                checkedChildren="ON"
                unCheckedChildren="OFF"
                size="small"
                style={{
                  backgroundColor: googleSheetEnabled ? '#52c41a' : undefined,
                }}
              />
            }
          >
            {googleSheetEnabled && (
              <>
                {/* Google Authentication Status */}
                <div
                  style={{
                    marginBottom: 12,
                    padding: '8px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '4px',
                  }}
                >
                  {googleAuthStatus.loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Spin size="small" />
                      <span style={{ fontSize: '12px' }}>Checking Google authentication...</span>
                    </div>
                  ) : googleAuthStatus.authenticated ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ color: '#52c41a', fontSize: '12px' }}>
                        ✓ Authenticated as {googleAuthStatus.user?.email}
                      </span>
                      <Button size="small" danger onClick={handleGoogleLogout}>
                        Logout
                      </Button>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ color: '#ff4d4f', fontSize: '12px' }}>
                        ⚠ Google authentication required
                      </span>
                      <Button size="small" type="primary" onClick={handleGoogleAuth}>
                        Authenticate
                      </Button>
                    </div>
                  )}
                </div>

                <Controller
                  name="googleSheetUrl"
                  control={control}
                  render={({ field }) => (
                    <Form.Item
                      required={googleSheetEnabled}
                      validateStatus={
                        errors.googleSheetUrl || googleSheetValidationError ? 'error' : ''
                      }
                      help={errors.googleSheetUrl?.message || googleSheetValidationError}
                      style={{ marginBottom: 12 }}
                    >
                      <Space.Compact style={{ display: 'flex', width: '100%' }}>
                        <Input
                          {...field}
                          placeholder="https://docs.google.com/spreadsheets/d/..."
                          style={{ flex: 1 }}
                          disabled={!googleAuthStatus.authenticated}
                        />
                        <Button
                          onClick={handleTestGoogleSheet}
                          disabled={!field.value?.trim() || !googleAuthStatus.authenticated}
                          loading={testingGoogleSheet}
                          title={
                            !googleAuthStatus.authenticated
                              ? 'Please authenticate with Google first'
                              : undefined
                          }
                        >
                          Test
                        </Button>
                      </Space.Compact>
                    </Form.Item>
                  )}
                />
                {watchedValues.googleSheetUrl?.trim() && (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Button icon={<LinkOutlined />} onClick={handleOpenSheet} block>
                      Open Sheet
                    </Button>
                    {mode === 'edit' && googleAuthStatus.authenticated && (
                      <Button
                        icon={<SyncOutlined />}
                        onClick={handleSyncResponses}
                        loading={syncingResponses}
                        disabled={!googleAuthStatus.authenticated}
                        block
                      >
                        {syncingResponses ? 'Resyncing...' : 'Resync Responses'}
                      </Button>
                    )}
                  </Space>
                )}
              </>
            )}
          </Card>

          {/* Form URL Card */}
          {watchedValues.refKey && (
            <Card
              title={<span style={{ color: '#fff' }}>Form URL and Tools</span>}
              size="small"
              style={{ marginTop: 16 }}
              styles={{
                header: {
                  background: 'linear-gradient(135deg, #42a5f5 0%, #478ed1 100%)',
                  color: '#fff',
                },
              }}
            >
              <Input.TextArea
                value={formUrl}
                readOnly
                autoSize
                style={{ fontSize: '12px', fontFamily: 'monospace', marginBottom: 12 }}
              />
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button
                  block
                  icon={<CopyOutlined />}
                  onClick={copyFormUrl}
                  type={copySuccess ? 'dashed' : 'default'}
                >
                  {copySuccess ? 'Copied!' : 'Copy URL'}
                </Button>
                {mode === 'edit' && initial && (
                  <>
                    <Button
                      block
                      icon={<ExportOutlined />}
                      onClick={() => window.open(formUrl, '_blank')}
                    >
                      Open Form
                    </Button>
                    <Button
                      block
                      icon={<BarChartOutlined />}
                      onClick={() =>
                        (window.location.href = `/responses/${encodeURIComponent(watchedValues.refKey)}`)
                      }
                    >
                      View Response ({responseStats?.count || 0})
                    </Button>
                    <Popconfirm
                      title="Delete this form?"
                      description={
                        <div>
                          <p>This action will permanently delete:</p>
                          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                            <li>The form configuration</li>
                            <li>All form responses</li>
                            <li>All uploaded files from storage</li>
                          </ul>
                          <p style={{ color: '#ff4d4f', fontWeight: 'bold', margin: 0 }}>
                            This cannot be undone!
                          </p>
                        </div>
                      }
                      placement="topRight"
                      okText="Delete"
                      okType="danger"
                      cancelText="Cancel"
                      onConfirm={handleDeleteClick}
                    >
                      <Button block danger icon={<DeleteOutlined />} loading={loadingDelete}>
                        Delete
                      </Button>
                    </Popconfirm>
                  </>
                )}
              </Space>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
