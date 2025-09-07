"use client"
import { useState, useEffect, useCallback } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { adminFetch } from '@/lib/api'
import { FormField } from '@/lib/types'

type SheetUrlModalProps = {
  isOpen: boolean
  onClose: () => void
  onConfirm: (url: string, sheetName: string) => void
  initialUrl?: string
  currentFields?: FormField[]
}

type SheetMeta = {
  spreadsheetId: string
  url: string
  sheets: {
    name: string
    index: number
    rows: number
    cols: number
    headers: string[]
  }[]
}

export function SheetUrlModal({ isOpen, onClose, onConfirm, initialUrl = '', currentFields = [] }: SheetUrlModalProps) {
  const [url, setUrl] = useState(initialUrl)
  const [sheetsMeta, setSheetsMeta] = useState<SheetMeta | null>(null)
  const [selectedSheet, setSelectedSheet] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle')
  const [isValidating, setIsValidating] = useState(false)

  // Store the pre-selected sheet name separately
  const [initialSheetName, setInitialSheetName] = useState<string>('')
  const [isProgrammaticUrlChange, setIsProgrammaticUrlChange] = useState<boolean>(false)

  function extractSheetId(input: string): string | null {
    if (!input) return null
    try {
      // Clean up the input - remove any trailing /edit, query params, and fragments
      let cleaned = input.trim()
      
      // If it's a full URL, extract the ID
      if (cleaned.includes('docs.google.com/spreadsheets')) {
        const match = cleaned.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
        if (match) return match[1]
      }
      
      // Handle cases where user pasted partial path like "d/ID/edit?gid=0#gid=0"
      if (cleaned.startsWith('d/')) {
        // Extract ID from "d/ID/..." pattern
        const match = cleaned.match(/^d\/([a-zA-Z0-9-_]+)/)
        if (match) {
          cleaned = match[1]
        }
      }
      
      // Remove any trailing paths, query params, and fragments
      cleaned = cleaned.split('/')[0].split('?')[0].split('#')[0]
      
      // If it looks like just an ID (alphanumeric with dashes/underscores, at least 10 chars)
      // Google Sheets IDs are typically 44 characters but we'll be flexible
      if (/^[a-zA-Z0-9-_]{10,}$/.test(cleaned)) {
        return cleaned
      }
      
      return null
    } catch {
      return null
    }
  }

  const validateUrl = useCallback(async (isRefresh = false, preselectedSheetOverride?: string) => {
    // Prevent concurrent validations
    if (isValidating) {
      console.log('Validation already in progress, skipping')
      return
    }

    const id = extractSheetId(url)
    if (!id) {
      setError('Please enter a valid Google Sheets URL or ID')
      setValidationStatus('invalid')
      return
    }

    console.log('Validating spreadsheet ID:', id)
    console.log('Current initialSheetName before validation:', initialSheetName)
    console.log('Current selectedSheet before validation:', selectedSheet)
    console.log('PreselectedSheetOverride:', preselectedSheetOverride)
    
    // Capture the initial sheet name at the start of validation to preserve it
    // Use the override parameter if provided (for initial load), otherwise use current state
    const preservedInitialSheetName = preselectedSheetOverride || initialSheetName
    
    setIsValidating(true)
    
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)
    setValidationStatus('idle')

    try {
      const res = await adminFetch<any>(`/api/forms/sheets?id=${encodeURIComponent(id)}`)
      console.log('Sheet validation response:', res)
      
      // First check if the request was successful
      if (!res.ok && res.error) {
        const baseErrorMsg = res.error?.message || 'Failed to load spreadsheet metadata'
        console.error('Sheet validation failed:', baseErrorMsg)
        
        // Provide more specific error guidance based on common issues
        let detailedError = baseErrorMsg
        if (baseErrorMsg.includes('not found') || baseErrorMsg.includes('404')) {
          detailedError = `Spreadsheet not found. Please verify:
• The spreadsheet ID is correct: ${id}
• The spreadsheet exists and hasn't been deleted
• The Apps Script has been granted access to this spreadsheet`
        } else if (baseErrorMsg.includes('permission') || baseErrorMsg.includes('access') || baseErrorMsg.includes('Unable to access spreadsheet structure')) {
          detailedError = `Apps Script Permission Issue:

The Apps Script cannot access this spreadsheet. To fix this:

1. Open the Apps Script project at script.google.com
2. Go to the spreadsheet: https://docs.google.com/spreadsheets/d/${id}
3. Share the spreadsheet with the Apps Script project email
4. Ensure the Apps Script has "Editor" permission
5. Redeploy the Apps Script if you made recent changes

Common causes:
• Apps Script doesn't have edit access to spreadsheet: ${id}
• Spreadsheet owner hasn't shared it with the Apps Script service account
• Apps Script deployment is outdated or broken`
        } else if (baseErrorMsg.includes('timeout') || baseErrorMsg.includes('connection')) {
          detailedError = `Connection timeout. This might be temporary:
• Check your internet connection
• Try again in a few moments
• Verify the Apps Script deployment is active`
        }
        
        setError(detailedError)
        setValidationStatus('invalid')
        return
      }
      
      // Handle nested data structures from GAS
      let metaData: any = res
      
      // If response has ok:true and data property, use data
      if (res.ok === true && 'data' in res) {
        metaData = res.data
      }
      // If response has nested data.data, use that
      if (metaData && typeof metaData === 'object' && 'data' in metaData) {
        metaData = metaData.data
      }
      
      console.log('Extracted metadata:', metaData)
      
      // Check if sheets exist in the response
      if (!metaData || !metaData.sheets) {
        console.error('No sheets property in response:', metaData)
        console.error('Full API response structure:', JSON.stringify(res, null, 2))
        
        // Provide more specific error guidance
        const errorMsg = `Unable to access spreadsheet structure. Debug info:
• Spreadsheet ID: ${id}
• Check browser console for detailed API response
• Common causes:
  - Apps Script doesn't have permission to access this spreadsheet
  - Spreadsheet ID is incorrect or spreadsheet was deleted
  - Apps Script deployment needs to be refreshed

Next steps:
1. Check the browser console for the full API response
2. Ensure Apps Script has edit access to spreadsheet: ${id}
3. Try redeploying the Apps Script project`
        setError(errorMsg)
        setValidationStatus('invalid')
        return
      }
      
      const meta = metaData as SheetMeta
      setSheetsMeta(meta)
      setValidationStatus('valid')
      
      // Auto-select sheet if available
      if (meta.sheets && Array.isArray(meta.sheets) && meta.sheets.length > 0) {
        console.log('Available sheets:', meta.sheets.map(s => s.name))
        console.log('Current initialSheetName:', initialSheetName)
        console.log('Current selectedSheet:', selectedSheet)
        console.log('Preserved initialSheetName:', preservedInitialSheetName)
        
        // First priority: use the preserved initial sheet name from the saved configuration
        if (preservedInitialSheetName && meta.sheets.find(s => s.name === preservedInitialSheetName)) {
          setSelectedSheet(preservedInitialSheetName)
          console.log('✅ Selected preserved initial sheet from saved config:', preservedInitialSheetName)
        }
        // Second priority: use the current initial sheet name if it still exists
        else if (initialSheetName && meta.sheets.find(s => s.name === initialSheetName)) {
          setSelectedSheet(initialSheetName)
          console.log('✅ Selected initial sheet from saved config:', initialSheetName)
        }
        // Third priority: keep currently selected sheet if it exists
        else if (selectedSheet && meta.sheets.find(s => s.name === selectedSheet)) {
          // Keep the current selection if it exists in the sheets
          console.log('✅ Keeping pre-selected sheet:', selectedSheet)
        }
        // Fallback: select the first available sheet
        else {
          const firstSheet = meta.sheets[0].name
          setSelectedSheet(firstSheet)
          console.log('⚠️ Fallback: Selected first sheet:', firstSheet)
          console.log('Reason: No preserved or current sheet name found in available sheets')
        }
      } else {
        console.log('Empty or invalid sheets array:', meta.sheets)
        setError('No sheets found in the spreadsheet. The spreadsheet might be empty or the Apps Script might not have proper access.')
        setValidationStatus('invalid')
      }
    } catch (err: any) {
      console.error('Sheet validation error:', err)
      setError(err?.message || 'Failed to validate spreadsheet')
      setValidationStatus('invalid')
    } finally {
      setLoading(false)
      setRefreshing(false)
      setIsValidating(false)
    }
  }, [url, initialSheetName, selectedSheet, isValidating])

  useEffect(() => {
    if (isOpen) {
      console.log('Modal opening with initialUrl:', initialUrl)
      // Parse the initial URL to handle the #sheet= format
      let urlToUse = initialUrl
      let preselectedSheet = ''
      
      if (initialUrl && initialUrl.includes('#sheet=')) {
        // Extract the sheet name from the fragment
        const parts = initialUrl.split('#sheet=')
        urlToUse = parts[0] // Just the ID part
        if (parts[1]) {
          preselectedSheet = decodeURIComponent(parts[1])
        }
        console.log('Parsed URL parts:', { urlToUse, preselectedSheet })
      }
      
      setIsProgrammaticUrlChange(true)
      setUrl(urlToUse)
      setSheetsMeta(null)
      setInitialSheetName(preselectedSheet) // Store for later use
      setSelectedSheet(preselectedSheet)
      setError(null)
      setValidationStatus('idle')
      
      console.log('Set initial sheet name to:', preselectedSheet)
      
      // Reset the flag after a brief delay to allow the input to update
      setTimeout(() => setIsProgrammaticUrlChange(false), 50)
      
      // Auto-validate if there's an initial URL
      if (urlToUse && urlToUse.trim()) {
        // Small delay to ensure state is updated, and pass the preselected sheet directly
        setTimeout(() => validateUrl(false, preselectedSheet), 100)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialUrl])

  async function refreshSheets() {
    if (sheetsMeta) {
      // Clear the current metadata to show loading state
      setSheetsMeta(null)
      setSelectedSheet('')
      await validateUrl(true)
    }
  }

  function handleConfirm() {
    if (!sheetsMeta || !selectedSheet) {
      setError('Please validate the URL and select a sheet')
      return
    }

    // Create the effective URL with sheet reference
    const id = sheetsMeta.spreadsheetId
    const effectiveUrl = `${id}#sheet=${encodeURIComponent(selectedSheet)}`
    onConfirm(effectiveUrl, selectedSheet)
    onClose()
  }

  function handleUrlChange(value: string) {
    console.log('handleUrlChange called with value:', value)
    console.log('isProgrammaticUrlChange:', isProgrammaticUrlChange)
    
    setUrl(value)
    setValidationStatus('idle')
    setSheetsMeta(null)
    setSelectedSheet('')
    
    // Only clear initial sheet name if this is a real user change, not programmatic
    if (!isProgrammaticUrlChange) {
      setInitialSheetName('') // Clear initial sheet when URL changes
      console.log('Cleared initialSheetName because user changed URL')
    } else {
      console.log('Kept initialSheetName because this is programmatic change')
    }
    
    setError(null)
  }


  function checkStructureMismatch(sheet: SheetMeta['sheets'][0] | undefined): { hasContent: boolean; structureMatches: boolean } {
    if (!sheet) return { hasContent: false, structureMatches: true }
    
    const hasContent = sheet.rows > 0
    if (!hasContent) return { hasContent: false, structureMatches: true }
    
    // Expected headers for form responses
    const expectedHeaders = ['timestamp', 'refKey', 'ip', 'userAgent', ...currentFields.map(f => f.key)]
    const currentHeaders = sheet.headers || []
    
    // Check if headers match
    const structureMatches = 
      currentHeaders.length === expectedHeaders.length &&
      currentHeaders.every((h, i) => h === expectedHeaders[i])
    
    return { hasContent, structureMatches }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configure Response Sheet" size="lg">
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="sheet-url" className="block text-sm font-medium">
            Google Sheets URL or ID *
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Paste the full Google Sheets URL or just the spreadsheet ID
          </p>
          <div className="flex gap-2">
            <input
              id="sheet-url"
              type="text"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/... or just the ID"
              className="flex-1"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => validateUrl()}
              disabled={loading || !url.trim()}
              className="btn"
            >
              {loading ? 'Validating...' : 'Validate'}
            </button>
          </div>
          {validationStatus === 'valid' && (
            <p className="text-sm text-green-600">✓ Spreadsheet validated successfully</p>
          )}
          {error && validationStatus === 'invalid' && (
            <div className="mt-2 rounded-md bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-800 whitespace-pre-line">{error}</p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium">
                Select Target Sheet *
              </label>
              <span className="text-xs text-gray-500">New/Rename sheets may take 2-5 minutes to appear</span>
            </div>
            {sheetsMeta && (
              <button
                type="button"
                onClick={refreshSheets}
                disabled={refreshing}
                className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400"
              >
                {refreshing ? 'Refreshing...' : '↻ Refresh'}
              </button>
            )}
          </div>
          
          {loading ? (
            <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
                Loading sheets...
              </div>
            </div>
          ) : sheetsMeta ? (
            <>
              <Select
                options={(sheetsMeta?.sheets || []).map((s) => ({
                  value: s.name,
                  label: `${s.name}${s.rows > 0 ? ` (${s.rows} rows)` : ' (empty)'}`
                }))}
                value={selectedSheet}
                onChange={setSelectedSheet}
                placeholder="Select a sheet"
                disabled={refreshing}
              />
              {selectedSheet && sheetsMeta && (() => {
                const sheet = sheetsMeta.sheets?.find(s => s.name === selectedSheet)
                if (!sheet) return null
                const { hasContent, structureMatches } = checkStructureMismatch(sheet)
                
                return (
                  <div className="space-y-2">
                    <div className="rounded-md bg-gray-50 p-3 text-sm">
                      <p className="font-medium">Sheet Details:</p>
                      <p className="mt-1 text-gray-600">
                        {hasContent ? `This sheet has ${sheet.rows} rows of data` : 'This sheet is empty'}
                      </p>
                    </div>
                    
                    {hasContent && !structureMatches && (
                      <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3 text-sm">
                        <p className="font-medium text-yellow-800">⚠️ Structure Mismatch Warning</p>
                        <p className="mt-1 text-yellow-700">
                          The existing sheet headers don't match your form fields. Headers will be automatically updated when you save the form.
                        </p>
                        <details className="mt-2">
                          <summary className="cursor-pointer text-yellow-700 hover:text-yellow-800 text-xs">
                            View details
                          </summary>
                          <div className="mt-2 text-xs text-yellow-600">
                            <p>Current headers: {sheet.headers?.slice(0, 5).join(', ')}{(sheet.headers?.length || 0) > 5 ? '...' : ''}</p>
                            <p className="mt-1">Expected headers: timestamp, refKey, ip, userAgent{currentFields.length > 0 ? ', ' + currentFields.map(f => f.key).join(', ') : ''}</p>
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                )
              })()}
            </>
          ) : (
            <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-500">
              Please validate a Google Sheets URL first
            </div>
          )}
        </div>

        <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">
          <p className="font-medium">Important:</p>
          <ul className="mt-1 list-disc pl-5">
            <li>Make sure the Apps Script project has edit access to this spreadsheet</li>
            <li>Form responses will be written to the selected sheet</li>
            <li>Headers will be automatically updated to match your form fields</li>
          </ul>
        </div>

        <div className="flex justify-end gap-3 border-t pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!sheetsMeta || !selectedSheet || validationStatus !== 'valid'}
            className="btn"
          >
            Confirm Selection
          </button>
        </div>
      </div>
    </Modal>
  )
}