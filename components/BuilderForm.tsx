"use client"
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { FormConfig, FormField } from '@/lib/types'
import { FieldEditor } from './FieldEditor'
import { FieldList } from './FieldList'
import { adminFetch, fetchFormPublic } from '@/lib/api'
import { formConfigSchema } from '@/lib/validation'
import { SheetUrlModal } from './SheetUrlModal'
import { DataMigrationModal } from './DataMigrationModal'
import { HelpButton } from './HelpModal'

type Props = {
  initial?: FormConfig
  mode: 'create' | 'edit'
  refKeyHint?: string // for edit page to show ref while loading
  duplicateFrom?: string // for duplicate mode to load template
}

export function BuilderForm({ initial, mode, refKeyHint, duplicateFrom }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [refKey, setRefKey] = useState(initial?.refKey ?? refKeyHint ?? '')
  const [responseSheetUrl, setResponseSheetUrl] = useState(initial?.responseSheetUrl ?? '')
  const [slackWebhookUrl, setSlackWebhookUrl] = useState(initial?.slackWebhookUrl ?? '')
  const [uploadFolderUrl, setUploadFolderUrl] = useState(initial?.uploadFolderUrl ?? '')
  const [fields, setFields] = useState<FormField[]>(initial?.fields ?? [])
  // Sheets metadata for Response Sheet URL selection
  const [sheetsMeta, setSheetsMeta] = useState<{ spreadsheetId: string; url: string; sheets: { name: string; index: number; rows: number; cols: number; headers: string[] }[] } | null>(null)
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null)
  const [sheetError, setSheetError] = useState<string | null>(null)
  const [loadingInitial, setLoadingInitial] = useState(mode === 'edit')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [showSheetModal, setShowSheetModal] = useState(false)
  const [formSaved, setFormSaved] = useState(mode === 'edit' && !!initial)
  const refKeyInputRef = useRef<HTMLInputElement>(null)
  
  // Data migration modal state
  const [migrationModal, setMigrationModal] = useState<{
    show: boolean
    closing: boolean
    changes: {
      added: FormField[]
      removed: FormField[]
      moved: { from: string, to: string, field: FormField }[]
      renamed: { from: string, to: string, field: FormField }[]
    }
    existingDataCount: number
    pendingSave: any
  }>({
    show: false,
    closing: false,
    changes: { added: [], removed: [], moved: [], renamed: [] },
    existingDataCount: 0,
    pendingSave: null
  })

  // State for sheet modal
  const [sheetModal, setSheetModal] = useState<{
    show: boolean;
    closing: boolean;
    sheetUrl: string;
    sheetName: string;
  }>({ show: false, closing: false, sheetUrl: '', sheetName: '' })

  // Helper function to detect field changes
  const detectFieldChanges = useCallback((oldFields: FormField[], newFields: FormField[]) => {
    const added: FormField[] = []
    const removed: FormField[] = []
    const moved: { from: string, to: string, field: FormField }[] = []
    const renamed: { from: string, to: string, field: FormField }[] = []

    // Create maps for easier lookup
    const oldFieldMap = new Map(oldFields.map((f, i) => [f.key, { field: f, index: i }]))
    const newFieldMap = new Map(newFields.map((f, i) => [f.key, { field: f, index: i }]))

    // Find added fields
    newFields.forEach(field => {
      if (!oldFieldMap.has(field.key)) {
        added.push(field)
      }
    })

    // Find removed fields
    oldFields.forEach(field => {
      if (!newFieldMap.has(field.key)) {
        removed.push(field)
      }
    })

    // Find moved fields and structural changes
    newFields.forEach((field, newIndex) => {
      const oldEntry = oldFieldMap.get(field.key)
      if (oldEntry) {
        const oldField = oldEntry.field
        const oldIndex = oldEntry.index
        
        // Check if field was moved (position changed)
        if (oldIndex !== newIndex) {
          moved.push({
            from: (oldIndex + 5).toString(), // +4 for system columns (timestamp, refKey, ip, userAgent) + 1 for 1-based indexing
            to: (newIndex + 5).toString(),
            field
          })
        }
        
        // Check for structural changes that affect data storage format
        // Only flag changes that actually require data migration
        const needsDataMigration = (
          oldField.type !== field.type || // Type change affects column format and data interpretation
          (
            // Options changes for choice fields affect data validation and stored values
            (oldField.type === 'select' || oldField.type === 'radio' || oldField.type === 'checkbox') &&
            JSON.stringify(oldField.options || []) !== JSON.stringify(field.options || [])
          )
        )
        
        // Track label changes separately (affects headers but not data migration)
        const hasLabelChange = oldField.label !== field.label
        
        if (needsDataMigration || hasLabelChange) {
          // Track field modifications for migration analysis
          renamed.push({
            from: oldField.label,
            to: field.label,
            field: { ...field, _migrationFlag: needsDataMigration ? 'data' : 'header' }
          })
        }
      }
    })

    return { added, removed, moved, renamed }
  }, [])

  // Function to check if sheet has existing data
  const checkSheetData = useCallback(async (sheetUrl: string) => {
    if (!sheetUrl) return 0
    
    try {
      // This would need to be implemented in the backend to check sheet data
      // For now, we'll simulate checking by looking at sheet metadata
      if (sheetsMeta && selectedSheet) {
        const sheet = sheetsMeta.sheets.find(s => s.name === selectedSheet)
        return sheet ? Math.max(0, sheet.rows - 1) : 0 // -1 for header row
      }
      return 0
    } catch (error) {
      console.error('Error checking sheet data:', error)
      return 0
    }
  }, [sheetsMeta, selectedSheet])

  useEffect(() => {
    // Don't reset form data in duplicate mode - let doDuplicateLoad handle it
    if (duplicateFrom) return
    
    setTitle(initial?.title ?? '')
    setDescription(initial?.description ?? '')
    setRefKey(initial?.refKey ?? refKeyHint ?? '')
    setResponseSheetUrl(initial?.responseSheetUrl ?? '')
    setSlackWebhookUrl(initial?.slackWebhookUrl ?? '')
    setUploadFolderUrl(initial?.uploadFolderUrl ?? '')
    setFields(initial?.fields ?? [])
    // Reset sheets meta when initial changes
    setSheetsMeta(null)
    setSelectedSheet(null)
    setSheetError(null)
    
    // For create mode, we never need to load initial data, so set loading to false immediately
    if (mode === 'create') {
      setLoadingInitial(false)
    }
    // For edit mode, we'll set loadingInitial to false when sheets metadata is ready
    // This is handled in the sheets metadata useEffect
  }, [initial, refKeyHint, duplicateFrom, mode])

  // Auto-load sheet metadata on page load and whenever the URL/id changes
  useEffect(() => {
    if (responseSheetUrl) {
      loadSheetsMeta()
    } else {
      setSheetsMeta(null)
      setSelectedSheet(null)
      // If no responseSheetUrl in edit mode, we're still done loading (user needs to configure it)
      if (mode === 'edit') {
        setLoadingInitial(false)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responseSheetUrl])

  // Client-side fallback fetch if the server-side load failed or returned nothing
  const didFallbackFetch = useRef(false)
  const doFallbackLoad = async () => {
    if (!refKeyHint) return
    setLoadingInitial(true)
    setLoadError(null)
    try {
      const res = await fetchFormPublic(refKeyHint)
      if (res.ok) {
        const f = res.data
        setTitle(f.title ?? '')
        setDescription(f.description ?? '')
        setRefKey(f.refKey ?? refKeyHint)
        setResponseSheetUrl(f.responseSheetUrl ?? '')
        setSlackWebhookUrl(f.slackWebhookUrl ?? '')
        setUploadFolderUrl(f.uploadFolderUrl ?? '')
        setFields(f.fields ?? [])
      } else {
        setLoadError(res.error.message)
      }
    } catch (e: any) {
      setLoadError(e?.message || 'Failed to load form')
    } finally {
      setLoadingInitial(false)
    }
  }

  useEffect(() => {
    if (mode !== 'edit' || initial || !refKeyHint || didFallbackFetch.current) return
    didFallbackFetch.current = true
    doFallbackLoad()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, initial, refKeyHint])

  // Handle duplicate functionality
  const didDuplicateLoad = useRef(false)
  const doDuplicateLoad = useCallback(async () => {
    if (!duplicateFrom) return
    
    try {
      // First try to get preloaded data from sessionStorage
      const preloadedData = sessionStorage.getItem(`duplicate_${duplicateFrom}`)
      let formData = null
      
      if (preloadedData) {
        // Use preloaded data and clear it
        formData = JSON.parse(preloadedData)
        sessionStorage.removeItem(`duplicate_${duplicateFrom}`)
      } else {
        // Fallback: load data if not preloaded
        setLoadingInitial(true)
        setLoadError(null)
        const res = await fetchFormPublic(duplicateFrom)
        if (res.ok) {
          formData = res.data
        } else {
          setLoadError(`Failed to load form to duplicate: ${res.error.message}`)
          setLoadingInitial(false)
          return
        }
      }
      
      if (formData) {
        // Load all form data but clear refKey and responseSheetUrl so user must set new ones
        setTitle(formData.title ? `${formData.title} (Copy)` : '')
        setDescription(formData.description ?? '')
        setRefKey('') // Force user to enter new refKey
        setResponseSheetUrl('') // Force user to configure new response sheet
        setSlackWebhookUrl(formData.slackWebhookUrl ?? '')
        setUploadFolderUrl('') // Force user to configure new upload folder
        setFields(formData.fields ?? [])
        
        // Focus on refKey input after loading
        setTimeout(() => {
          if (refKeyInputRef.current) {
            refKeyInputRef.current.focus()
          }
        }, 100)
      }
    } catch (e: any) {
      setLoadError(e?.message || 'Failed to load form to duplicate')
    } finally {
      setLoadingInitial(false)
    }
  }, [duplicateFrom])

  useEffect(() => {
    if (mode !== 'create' || !duplicateFrom || didDuplicateLoad.current) return
    didDuplicateLoad.current = true
    doDuplicateLoad()
  }, [mode, duplicateFrom, doDuplicateLoad])


  function addField(f: FormField) {
    setFields((prev) => [...prev, f])
    setEditingIndex(null)
  }

  function updateField(idx: number, f: FormField) {
    setFields((prev) => prev.map((x, i) => (i === idx ? f : x)))
    setEditingIndex(null)
  }

  function removeField(idx: number) {
    setFields((prev) => prev.filter((_, i) => i !== idx))
  }

  function moveUp(idx: number) {
    if (idx <= 0) return
    setFields((prev) => {
      const copy = [...prev]
      ;[copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]]
      return copy
    })
  }

  function moveDown(idx: number) {
    if (idx >= fields.length - 1) return
    setFields((prev) => {
      const copy = [...prev]
      ;[copy[idx + 1], copy[idx]] = [copy[idx], copy[idx + 1]]
      return copy
    })
  }

  const payload = useMemo(
    () => ({ refKey, title, description, responseSheetUrl, slackWebhookUrl: slackWebhookUrl || undefined, uploadFolderUrl: uploadFolderUrl || undefined, fields, prevRefKey: initial?.refKey }),
    [refKey, title, description, responseSheetUrl, slackWebhookUrl, uploadFolderUrl, fields, initial?.refKey]
  )

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    
    // Prevent saving while form is still loading
    if (loadingInitial) {
      setMessage('Please wait for the form to finish loading.')
      return
    }
    
    const parse = formConfigSchema.safeParse(payload)
    if (!parse.success) {
      setMessage('Please fix validation errors before saving.')
      return
    }
    if (sheetError) {
      setMessage(sheetError)
      return
    }
    // For existing forms, allow saving if responseSheetUrl is already set, even if sheets metadata isn't loaded
    if (!responseSheetUrl?.trim()) {
      setMessage('Please select a target sheet.')
      return
    }
    
    // For new forms or forms where sheets metadata is loaded, require proper sheet selection
    if (responseSheetUrl && responseSheetUrl.includes('#sheet=') && !selectedSheet) {
      setMessage('Please select a target sheet.')
      return
    }
    
    // Validate Google Drive Upload Folder URL if form has file upload fields
    const hasFileUploadFields = fields.some(field => field.type === 'file')
    if (hasFileUploadFields) {
      if (!uploadFolderUrl?.trim()) {
        setMessage('Google Drive Upload Folder URL is required when the form contains file upload fields.')
        return
      }
      
      // Validate Google Drive URL format
      const driveUrlPattern = /^https:\/\/drive\.google\.com\/drive\/folders\/([a-zA-Z0-9-_]+)/
      if (!driveUrlPattern.test(uploadFolderUrl.trim())) {
        setMessage('Please enter a valid Google Drive folder URL. It should look like: https://drive.google.com/drive/folders/...')
        return
      }
    }
    
    // Prevent duplicate refKey on create or when refKey changed in edit
    const refChanged = mode === 'edit' && initial?.refKey && refKey.trim() && refKey !== initial.refKey
    if ((mode === 'create' || refChanged) && refKey.trim()) {
      try {
        const exists = await fetchFormPublic(refKey)
        if (exists.ok) {
          setMessage('Reference key already exists. Choose another.')
          // Automatically select all text in the refKey input field
          if (refKeyInputRef.current) {
            refKeyInputRef.current.focus()
            refKeyInputRef.current.select()
          }
          return
        }
      } catch {}
    }
    try {
      // Compute effective response sheet reference with optional tab
      let effectiveResponseUrl = responseSheetUrl
      if (sheetsMeta && selectedSheet) {
        const id = sheetsMeta.spreadsheetId
        const enc = encodeURIComponent(selectedSheet)
        effectiveResponseUrl = `${id}#sheet=${enc}`
      }
      // Update preview to reflect effective value to avoid confusion
      setResponseSheetUrl(effectiveResponseUrl)
      // Check for data migration requirements
      if (mode === 'edit' && initial?.fields && sheetsMeta && selectedSheet) {
        const sheet = sheetsMeta.sheets.find(s => s.name === selectedSheet)
        if (sheet && sheet.rows > 1) { // Has data beyond header row
          const changes = detectFieldChanges(initial.fields, fields)
          
          // Check if we only have field reordering (no structural changes)
          const hasOnlyFieldReordering = (
            changes.moved.length > 0 &&      // Has field movements
            changes.added.length === 0 &&    // No new fields
            changes.removed.length === 0 &&  // No removed fields
            (changes.renamed.length === 0 || // No renamed fields, OR
             !changes.renamed.some(change => (change.field as any)._migrationFlag === 'data')) // Only header changes, no data changes
          )
          
          // Only trigger migration for changes that actually affect the data structure
          const requiresMigration = (
            changes.added.length > 0 ||     // New fields need new columns
            changes.removed.length > 0 ||   // Removed fields need column cleanup
            // Note: Field reordering (moved) does NOT require data migration in Google Sheets
            // The column positions in sheets remain the same, only the form UI order changes
            (changes.renamed.length > 0 &&  // Only data-affecting changes need migration
              changes.renamed.some(change => (change.field as any)._migrationFlag === 'data')
            )
          )
          
          if (requiresMigration) {
            const dataCount = await checkSheetData(effectiveResponseUrl)
            if (dataCount > 0) {
              // Clean up internal migration flags before showing modal
              const cleanChanges = {
                ...changes,
                renamed: changes.renamed.map(change => ({
                  ...change,
                  field: { ...change.field }
                })).map(change => {
                  const { _migrationFlag, ...cleanField } = change.field as any
                  return { ...change, field: cleanField }
                })
              }
              
              // Show migration modal only for meaningful structural changes
              setMigrationModal({
                show: true,
                closing: false,
                changes: cleanChanges,
                existingDataCount: dataCount,
                pendingSave: { parse, effectiveResponseUrl }
              })
              return // Exit early, will continue after user confirms
            }
          } else if (hasOnlyFieldReordering) {
            // For field reordering only, try to update headers without migration
            // This ensures Google Sheets column order matches the form field order
            setSaving(true)
            const res = await adminFetch<FormConfig>('/api/forms', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                ...parse.data, 
                responseSheetUrl: effectiveResponseUrl, 
                _overwrite: true,
                _updateHeadersOnly: true, // Flag to indicate only header update needed
                prevRefKey: initial?.refKey 
              }),
            })
            
            // If the backend doesn't support header-only updates, fall back to regular save
            if (!res.ok && res.error.message?.includes('Unknown operation')) {
              console.log('Backend does not support header-only updates, falling back to regular save')
              const fallbackRes = await adminFetch<FormConfig>('/api/forms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  ...parse.data, 
                  responseSheetUrl: effectiveResponseUrl, 
                  _overwrite: true,
                  prevRefKey: initial?.refKey 
                }),
              })
              if (fallbackRes.ok) {
                setMessage('Saved successfully. (Note: Field reordering may not update spreadsheet column order)')
                setFormSaved(true)
                buildCacheForRenderer(parse.data.refKey)
              } else {
                setMessage(fallbackRes.error.message)
              }
            } else if (res.ok) {
              setMessage('Saved successfully with updated column order.')
              setFormSaved(true)
              buildCacheForRenderer(parse.data.refKey)
            } else {
              setMessage(res.error.message)
            }
            setSaving(false)
            return // Exit early since we handled the save
          }
        }
      }
      setSaving(true)
      const res = await adminFetch<FormConfig>('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...parse.data, responseSheetUrl: effectiveResponseUrl, _overwrite: true, prevRefKey: initial?.refKey }),
      })
      if (res.ok) {
        setMessage('Saved successfully.')
        setFormSaved(true)
        // Automatically build cache for form renderer
        buildCacheForRenderer(parse.data.refKey)
        if (mode === 'create') {
          window.location.href = `/builder/${encodeURIComponent(parse.data.refKey)}`
        }
      } else {
        setMessage(res.error.message)
      }
    } catch (e: any) {
      setMessage(e?.message || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  // Handle migration modal confirmation
  const handleMigrationConfirm = useCallback(async () => {
    const { pendingSave } = migrationModal
    if (!pendingSave) return

    // Close modal with animation
    setMigrationModal(prev => ({ ...prev, closing: true }))
    
    setTimeout(async () => {
      setMigrationModal(prev => ({ 
        ...prev, 
        show: false, 
        closing: false,
        pendingSave: null
      }))

      try {
        setSaving(true)
        // Continue with the save including migration flag
        const res = await adminFetch<FormConfig>('/api/forms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            ...pendingSave.parse.data, 
            responseSheetUrl: pendingSave.effectiveResponseUrl, 
            _overwrite: true, 
            _migrate: true, // Flag to indicate migration should be performed
            _migrationChanges: migrationModal.changes,
            prevRefKey: initial?.refKey 
          }),
        })

        if (res.ok) {
          setMessage('Form saved successfully with data migration completed.')
          setFormSaved(true)
          // Automatically build cache for form renderer
          buildCacheForRenderer(pendingSave.parse.data.refKey)
          if (mode === 'create') {
            window.location.href = `/builder/${encodeURIComponent(pendingSave.parse.data.refKey)}`
          }
        } else {
          setMessage(res.error.message)
        }
      } catch (e: any) {
        setMessage(e?.message || 'Failed to save.')
      } finally {
        setSaving(false)
      }
    }, 300) // Wait for modal close animation
  }, [migrationModal, initial?.refKey, mode])

  // Handle migration modal cancel
  const handleMigrationCancel = useCallback(() => {
    setMigrationModal(prev => ({ ...prev, closing: true }))
    setTimeout(() => {
      setMigrationModal(prev => ({ 
        ...prev, 
        show: false, 
        closing: false,
        pendingSave: null
      }))
    }, 300)
  }, [])

  // Utilities for sheet selection
  function extractSheetId(input: string): string | null {
    if (!input) return null
    try {
      // Accept plain ID or ID with a #fragment (e.g., id#sheet=Name)
      if (/^[a-zA-Z0-9-_]+(#.*)?$/.test(input)) return String(input).split('#')[0]
      const m = String(input).match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
      return m ? m[1] : null
    } catch { return null }
  }

  async function loadSheetsMeta() {
    const id = extractSheetId(responseSheetUrl)
    setSheetError(null)
    if (!id) { setSheetsMeta(null); setSelectedSheet(null); setSheetError('Please enter a valid Google Sheets URL or ID.'); return }
    // Try dedicated route first; fall back to op=sheets_meta
    let meta: any | null = null
    const res1 = await adminFetch<any>(`/api/forms/sheets?id=${encodeURIComponent(id)}`)
    if (res1.ok && res1.data && (res1 as any).data.sheets) meta = (res1 as any).data
    if (!meta) {
      const res2 = await adminFetch<any>(`/api/forms?op=sheets_meta&id=${encodeURIComponent(id)}`)
      if (res2.ok && res2.data && (res2 as any).data.sheets) meta = (res2 as any).data
      else if (!res2.ok) setSheetError(res2.error?.message || 'Failed to load spreadsheet metadata.')
    }
    if (!meta) { 
      setSheetsMeta(null); 
      setSelectedSheet(null); 
      setSheetError('Failed to load spreadsheet metadata. Make sure the URL/ID is correct and the Web App has access.'); 
      if (mode === 'edit') setLoadingInitial(false);
      return 
    }
    if (!meta.sheets || meta.sheets.length === 0) {
      setSheetsMeta(meta)
      setSelectedSheet(null)
      setSheetError('No sheet tabs found. Ensure the spreadsheet exists and the Apps Script project has edit access.')
      if (mode === 'edit') setLoadingInitial(false);
      return
    }
    setSheetsMeta(meta)
    setSheetError(null)
    const m = String(responseSheetUrl || '').match(/#sheet=([^#&]+)/)
    const pre = m ? decodeURIComponent(m[1]) : null
    setSelectedSheet(pre || (meta.sheets && meta.sheets[0] ? meta.sheets[0].name : null))
    
    // For edit mode, we're done loading when sheets metadata is ready
    if (mode === 'edit') {
      setLoadingInitial(false)
    }
  }

  async function handleTestSlack() {
    const res = await adminFetch<{ ok: boolean }>('/api/forms/test-slack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Include current Slack URL so testing works even before saving
      body: JSON.stringify({ refKey, slackWebhookUrl }),
    })
    setMessage(res.ok ? 'Slack test sent.' : res.error.message)
  }

  async function buildCacheForRenderer(formRefKey: string) {
    try {
      // Call the public form endpoint to cache the form for the renderer
      await fetchFormPublic(formRefKey)
    } catch (error: any) {
      console.warn('Failed to build cache for renderer:', error.message)
    }
  }

  function handlePreviewClick() {
    if (refKey) {
      // Build cache when preview is clicked
      buildCacheForRenderer(refKey)
    }
  }

  function handleSheetModalConfirm(url: string, sheetName: string) {
    setResponseSheetUrl(url)
    setSelectedSheet(sheetName)
    // Don't clear sheetsMeta since we need it for form validation
    // The metadata is already loaded and valid for this sheet selection
    setSheetError(null)
  }

  // Open response sheet modal first, then sheet
  function openSheet(responseSheetUrl: string) {
    if (!responseSheetUrl) {
      alert('No response sheet configured for this form')
      return
    }
    
    // Handle different URL formats
    let sheetUrl = responseSheetUrl
    let sheetName = ''
    
    if (sheetUrl.startsWith('http')) {
      // Already a full URL, use as-is
      sheetUrl = responseSheetUrl
    } else {
      // Handle format: sheet-id#sheet=sheet-name or just sheet-id
      let sheetId = sheetUrl
      
      if (sheetUrl.includes('#sheet=')) {
        const parts = sheetUrl.split('#sheet=')
        sheetId = parts[0]
        sheetName = decodeURIComponent(parts[1])
      }
      
      // Always open the main spreadsheet (most reliable approach)
      sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`
    }
    
    // Show modal first
    setSheetModal({
      show: true,
      closing: false,
      sheetUrl,
      sheetName
    })
  }

  // Handle modal close and open sheet
  function handleSheetModalClose() {
    const { sheetUrl } = sheetModal
    // Start closing animation
    setSheetModal(prev => ({ ...prev, closing: true }))
    
    // Wait for animation to complete, then open sheet and hide modal
    setTimeout(() => {
      setSheetModal({ show: false, closing: false, sheetUrl: '', sheetName: '' })
      window.open(sheetUrl, '_blank', 'noopener,noreferrer')
    }, 300) // Match animation duration
  }

  // Handle modal close without opening sheet (for X button)
  function handleSheetModalCancel() {
    // Start closing animation
    setSheetModal(prev => ({ ...prev, closing: true }))
    
    // Wait for animation to complete, then hide modal
    setTimeout(() => {
      setSheetModal({ show: false, closing: false, sheetUrl: '', sheetName: '' })
    }, 300) // Match animation duration
  }

  if (mode === 'edit' && !initial && loadingInitial) {
    return (
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="h-6 w-48 rounded bg-gray-200 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
              <div className="h-10 w-full rounded-md bg-gray-100 animate-pulse" />
            </div>
          ))}
          <div className="md:col-span-2 space-y-2">
            <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
            <div className="h-24 w-full rounded-md bg-gray-100 animate-pulse" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading form...</span>
        </div>
        {loadError && <p className="mt-4 text-sm text-red-600">{loadError}</p>}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
      <div className="md:col-span-8 space-y-6">
        {mode === 'edit' && !initial && loadError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center justify-between">
            <span>{loadError}</span>
            <button type="button" className="btn-secondary" onClick={doFallbackLoad}>Retry</button>
          </div>
        )}
        {duplicateFrom && !loadError && (
          <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700 flex items-center gap-2">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Form data loaded for duplication. Please set a unique reference key and configure response sheet.</span>
          </div>
        )}
        <form onSubmit={handleSave} className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="title">Title *</label>
              <input id="title" className="w-full" required value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label htmlFor="refKey">Reference Key *</label>
              <input 
                id="refKey" 
                ref={refKeyInputRef}
                className="w-full" 
                required 
                value={refKey} 
                onChange={(e) => setRefKey(e.target.value)} 
              />
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="description">Description</label>
            <textarea id="description" className="w-full" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label>Response Sheet URL *</label>
              <HelpButton title="How to Set Up Google Sheets for Form Responses">
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Quick Start:</strong> Form responses will be automatically saved to any Google Sheet you specify. The system will create headers and save all submissions.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Step 1: Create a Google Sheet</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                      <li>Go to <a href="https://sheets.google.com" target="_blank" className="text-blue-600 hover:underline">Google Sheets</a></li>
                      <li>Click the <strong>"+"</strong> button to create a new spreadsheet</li>
                      <li>Give your sheet a meaningful name (e.g., "Contact Form Responses")</li>
                    </ol>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Step 2: Set Permissions</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                      <li>Click the <strong>"Share"</strong> button in the top-right corner</li>
                      <li>Under "General access", select <strong>"Anyone with the link"</strong></li>
                      <li>Set permission to <strong>"Editor"</strong></li>
                      <li>Click <strong>"Done"</strong></li>
                    </ol>
                    <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-xs text-yellow-800">
                        <strong>Note:</strong> Editor permission is required for the form to write responses to your sheet.
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Step 3: Copy the Sheet URL</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                      <li>Copy the URL from your browser's address bar</li>
                      <li>It should look like: <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">https://docs.google.com/spreadsheets/d/...</code></li>
                      <li>Paste it in the field below</li>
                    </ol>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-semibold text-green-900 mb-2">What Happens Next?</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-green-800">
                      <li>Headers will be automatically created based on your form fields</li>
                      <li>Each submission creates a new row with timestamp</li>
                      <li>Files are saved as clickable links</li>
                      <li>You can view and analyze responses directly in Google Sheets</li>
                    </ul>
                  </div>
                </div>
              </HelpButton>
            </div>
            <div className="flex gap-2 items-center">
              {responseSheetUrl ? (
                <div className="flex-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="truncate">
                      {(() => {
                        // Display only the ID part if it has #sheet= format
                        if (responseSheetUrl.includes('#sheet=')) {
                          const parts = responseSheetUrl.split('#sheet=')
                          const sheetName = parts[1] ? decodeURIComponent(parts[1]) : ''
                          return (
                            <>
                              <span>{parts[0]}</span>
                              {sheetName && <span className="ml-2 text-xs text-gray-500">→ {sheetName}</span>}
                            </>
                          )
                        }
                        return responseSheetUrl
                      })()}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                  No sheet configured
                </div>
              )}
              <button 
                type="button" 
                className="btn w-20"
                onClick={() => setShowSheetModal(true)}
              >
                {responseSheetUrl ? 'Change' : 'Configure'}
              </button>
            </div>
            {!responseSheetUrl && (
              <p className="text-xs text-gray-500">Click "Configure" to select a Google Sheet for form responses</p>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="slack">Slack Webhook URL (optional)</label>
              <HelpButton title="How to Set Up Slack Notifications">
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Quick Start:</strong> Get instant Slack notifications whenever someone submits your form. Perfect for urgent inquiries or team collaboration.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Step 1: Create Slack App</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                      <li>Go to <a href="https://api.slack.com/apps" target="_blank" className="text-blue-600 hover:underline">Slack API Apps</a></li>
                      <li>Click <strong>"Create New App"</strong></li>
                      <li>Choose <strong>"From scratch"</strong></li>
                      <li>Name your app (e.g., "Form Notifications")</li>
                      <li>Select your Slack workspace</li>
                    </ol>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Step 2: Enable Incoming Webhooks</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                      <li>In your app settings, click <strong>"Incoming Webhooks"</strong> in the left sidebar</li>
                      <li>Toggle <strong>"Activate Incoming Webhooks"</strong> to ON</li>
                      <li>Click <strong>"Add New Webhook to Workspace"</strong></li>
                      <li>Select the channel where you want notifications</li>
                      <li>Click <strong>"Allow"</strong></li>
                    </ol>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Step 3: Copy Webhook URL</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                      <li>Copy the Webhook URL (starts with <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">https://hooks.slack.com/services/...</code>)</li>
                      <li>Paste it in the field below</li>
                      <li>Click "Test" to verify it works</li>
                    </ol>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-semibold text-green-900 mb-2">What You'll Get:</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-green-800">
                      <li>Instant notifications for every form submission</li>
                      <li>All form data formatted nicely in Slack</li>
                      <li>Clickable links for uploaded files</li>
                      <li>Timestamp and submission details</li>
                    </ul>
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-xs text-yellow-800">
                      <strong>Alternative:</strong> You can also use existing webhook URLs from services like Zapier, Make (Integromat), or IFTTT to connect to other apps.
                    </p>
                  </div>
                </div>
              </HelpButton>
            </div>
            <div className="flex gap-2">
              <input id="slack" className="flex-1" value={slackWebhookUrl} onChange={(e) => setSlackWebhookUrl(e.target.value)} placeholder="https://hooks.slack.com/services/..." />
              <button className="btn-secondary w-20" type="button" onClick={handleTestSlack} disabled={!slackWebhookUrl}>Test</button>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="uploadFolder">
                Google Drive Upload Folder URL {fields.some(field => field.type === 'file') ? '*' : '(optional)'}
              </label>
              <HelpButton title="How to Set Up Google Drive for File Uploads">
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Quick Start:</strong> Allow users to upload files with your form. Files are automatically saved to your Google Drive folder with unique names.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Step 1: Create or Choose a Folder</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                      <li>Go to <a href="https://drive.google.com" target="_blank" className="text-blue-600 hover:underline">Google Drive</a></li>
                      <li>Create a new folder or navigate to an existing one</li>
                      <li>Name it appropriately (e.g., "Form Uploads - Contact")</li>
                    </ol>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Step 2: Set Folder Permissions</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                      <li>Right-click on the folder</li>
                      <li>Select <strong>"Share"</strong></li>
                      <li>Under "General access", select <strong>"Anyone with the link"</strong></li>
                      <li>Set permission to <strong>"Editor"</strong></li>
                      <li>Click <strong>"Done"</strong></li>
                    </ol>
                    <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-xs text-yellow-800">
                        <strong>Important:</strong> Editor permission is required for the form to upload files to your folder.
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Step 3: Copy the Folder URL</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                      <li>Open the folder in Google Drive</li>
                      <li>Copy the URL from your browser's address bar</li>
                      <li>It should look like: <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">https://drive.google.com/drive/folders/...</code></li>
                      <li>Paste it in the field below</li>
                    </ol>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-semibold text-green-900 mb-2">File Upload Features:</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-green-800">
                      <li>Files are automatically renamed with unique IDs to prevent conflicts</li>
                      <li>Support for all common file types (images, documents, PDFs, etc.)</li>
                      <li>File size limit: 100MB per file</li>
                      <li>Public sharing links are automatically generated</li>
                      <li>Links are saved in your response sheet for easy access</li>
                    </ul>
                  </div>
                  
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">File Naming Convention:</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      Files are saved as: <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{'{fieldKey}'}_{'{uniqueId}'}_{'{originalFilename}'}</code>
                    </p>
                    <p className="text-xs text-gray-500">
                      Example: <code>resume_1234567890123_john-doe-cv.pdf</code>
                    </p>
                  </div>
                </div>
              </HelpButton>
            </div>
            <input 
              id="uploadFolder" 
              className={`w-full ${fields.some(field => field.type === 'file') && !uploadFolderUrl?.trim() ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
              value={uploadFolderUrl} 
              onChange={(e) => setUploadFolderUrl(e.target.value)} 
              placeholder="https://drive.google.com/drive/folders/..." 
              required={fields.some(field => field.type === 'file')}
            />
            <p className="text-xs text-gray-500">Required for file upload fields. Files will be uploaded to this Google Drive folder.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn" type="submit" disabled={saving || loadingInitial}>{loadingInitial ? 'Loading...' : saving ? 'Saving...' : 'Save Form'}</button>
            <a 
              className={`btn-secondary ${!formSaved ? 'opacity-50 cursor-not-allowed' : ''}`}
              href={formSaved ? `/f/${encodeURIComponent(refKey || 'example')}` : '#'}
              target={formSaved ? "_blank" : undefined}
              rel={formSaved ? "noreferrer" : undefined}
              onClick={(e) => {
                if (!formSaved) {
                  e.preventDefault()
                  return
                }
                handlePreviewClick()
              }}
              title={formSaved ? "Open form in new tab" : "Please save the form first"}
            >
              Open Form
            </a>
            <button
              className={`btn-secondary ${!responseSheetUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => openSheet(responseSheetUrl)}
              title={responseSheetUrl ? "Open response sheet" : "No response sheet configured"}
              disabled={!responseSheetUrl}
              type="button"
            >
              Open Response Sheet
            </button>
          </div>
          {message && (
            <div className={`rounded-lg p-4 flex items-start gap-3 animate-shake ${
              message.includes('success') || message.includes('sent') || message.includes('Saved successfully') 
                ? 'bg-green-100 border border-green-200' 
                : 'bg-red-100 border border-red-200'
            }`}>
              <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 ${
                message.includes('success') || message.includes('sent') || message.includes('Saved successfully')
                  ? 'bg-green-500 text-white'
                  : 'bg-red-500 text-white'
              }`}>
                {message.includes('success') || message.includes('sent') || message.includes('Saved successfully') ? '✓' : '!'}
              </div>
              <p className={`text-sm font-medium ${
                message.includes('success') || message.includes('sent') || message.includes('Saved successfully')
                  ? 'text-green-800'
                  : 'text-red-800'
              }`}>
                {message}
              </p>
            </div>
          )}
        </form>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Fields</h3>
            {editingIndex === null && (
              <button className="btn" onClick={() => setEditingIndex(-1)}>Add Field</button>
            )}
          </div>
          <FieldList
            fields={fields}
            onEdit={(i) => setEditingIndex(i)}
            onRemove={removeField}
            onMoveUp={moveUp}
            onMoveDown={moveDown}
          />
          {editingIndex !== null && (
            <div className="rounded-md border p-4">
              <h4 className="mb-2 font-medium">{editingIndex === -1 ? 'Add Field' : `Edit: ${fields[editingIndex]?.label}`}</h4>
              <FieldEditor
                value={editingIndex >= 0 ? fields[editingIndex] : undefined}
                onSave={(f) => (editingIndex === -1 ? addField(f) : updateField(editingIndex, f))}
                onCancel={() => setEditingIndex(null)}
              />
            </div>
          )}
        </section>
      </div>
      <aside className="md:col-span-4 space-y-3">
        <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <p className="mb-3 font-semibold text-blue-900">💡 Quick Guide</p>
          <ul className="space-y-2 list-disc pl-5">
            <li><strong>Reference Key:</strong> Creates form URL /f/{refKey}. Use lowercase, hyphens only (no spaces or symbols).</li>
            <li><strong>Response Sheet:</strong> Must be shared with "Anyone with the link" + "Editor" permissions. Use help button for setup guide.</li>
            <li><strong>Field Order:</strong> Drag to reorder fields. This determines column order in your spreadsheet.</li>
            <li><strong>File Uploads:</strong> Requires Google Drive folder URL. Files auto-upload with unique names.</li>
            <li><strong>Slack Notifications:</strong> Optional webhook URL for instant form submission alerts.</li>
            <li><strong>Validation:</strong> Required fields, email format, min/max values prevent invalid submissions.</li>
            <li><strong>Testing:</strong> Always use "Open Form" to test before sharing. Check "Open Response Sheet" to verify data.</li>
          </ul>
        </div>
      </aside>
      <SheetUrlModal
        isOpen={showSheetModal}
        onClose={() => setShowSheetModal(false)}
        onConfirm={handleSheetModalConfirm}
        initialUrl={responseSheetUrl}
        currentFields={fields}
      />
      
      {/* Sheet Modal */}
      {sheetModal.show && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-out"
          style={{
            animation: sheetModal.closing ? 'fadeOut 0.3s ease-out' : 'fadeIn 0.2s ease-out'
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden transition-all duration-300 ease-out transform"
            style={{
              animation: sheetModal.closing ? 'slideDown 0.3s ease-out' : 'slideUp 0.3s ease-out'
            }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">Form Responses</h3>
                <button 
                  onClick={handleSheetModalCancel}
                  className="text-blue-100 hover:text-white text-xl transition-colors duration-200"
                >
                  ✕
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Sheet Name Highlight */}
              {sheetModal.sheetName && (
                <div className="text-center bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">Click on this tab:</p>
                  <div className="text-4xl font-bold text-blue-600 py-2 px-4 bg-white rounded-md border-2 border-blue-200 inline-block animate-pulse">
                    {sheetModal.sheetName}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">This tab contains your form responses</p>
                </div>
              )}
              
              {/* Instructions */}
              <div className="space-y-3">
                <div className="flex items-start space-x-3 transform transition-all duration-300 delay-100">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-green-600 text-xs">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Google Sheets will open</p>
                    <p className="text-sm text-gray-600">A new tab will open with your spreadsheet</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 transform transition-all duration-300 delay-200">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-xs">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Find the tab at the bottom</p>
                    <p className="text-sm text-gray-600">Look for sheet tabs at the bottom of the page</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 transform transition-all duration-300 delay-300">
                  <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-orange-600 text-xs">💡</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Bookmark for later</p>
                    <p className="text-sm text-gray-600">Save to bookmarks for quick access</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end">
              <button 
                onClick={handleSheetModalClose}
                className="btn px-6 py-2 text-sm hover:scale-105 hover:bg-blue-600 transition-all duration-200"
              >
                Got it, open sheet →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Data Migration Modal */}
      <DataMigrationModal
        show={migrationModal.show}
        closing={migrationModal.closing}
        onConfirm={handleMigrationConfirm}
        onCancel={handleMigrationCancel}
        changes={migrationModal.changes}
        existingDataCount={migrationModal.existingDataCount}
      />
    </div>
  )
}
