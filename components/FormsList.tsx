"use client"
import { useEffect, useRef, useState, useMemo } from 'react'
import { adminFetch } from '@/lib/api'

export function FormsList() {
  const [allItems, setAllItems] = useState<{ refKey: string; title: string; description?: string; responseSheetUrl: string; updatedAt?: string }[]>([])
  const [displayedItems, setDisplayedItems] = useState<{ refKey: string; title: string; description?: string; responseSheetUrl: string; updatedAt?: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedRefKey, setCopiedRefKey] = useState<string | null>(null)
  const [loadingEdit, setLoadingEdit] = useState<string | null>(null)
  const [loadingDuplicate, setLoadingDuplicate] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const ITEMS_PER_PAGE = 5
  async function load() {
    setError(null)
    setLoading(true)
    const res = await adminFetch<typeof allItems>('/api/forms')
    if (res.ok) {
      const anyRes: any = res
      const raw = Array.isArray(anyRes?.data)
        ? anyRes.data
        : Array.isArray(anyRes?.data?.data)
          ? anyRes.data.data
          : []
      const list = raw
        .filter((x: any) => x && typeof x.refKey === 'string')
        .map((x: any) => ({ 
          refKey: String(x.refKey), 
          title: String(x.title || ''), 
          description: String(x.description || ''),
          responseSheetUrl: String(x.responseSheetUrl || ''),
          updatedAt: x.updatedAt || x.createdAt || null
        }))
        .sort((a: any, b: any) => a.title.localeCompare(b.title) || a.refKey.localeCompare(b.refKey))
      setAllItems(list)
      setCurrentPage(1)
    } else {
      setError(res.error.message)
      setAllItems([])
    }
    setLoading(false)
  }

  // Filter items based on search query
  const filteredItems = useMemo(() => allItems.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.refKey.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
  ), [allItems, searchQuery])

  // Paginate filtered items
  useEffect(() => {
    const startIndex = 0
    const endIndex = currentPage * ITEMS_PER_PAGE
    setDisplayedItems(filteredItems.slice(startIndex, endIndex))
  }, [filteredItems, currentPage])

  // Load more items for infinite scroll
  const loadMore = () => {
    if (isLoadingMore || displayedItems.length >= filteredItems.length) return
    
    setIsLoadingMore(true)
    setTimeout(() => {
      setCurrentPage(prev => prev + 1)
      setIsLoadingMore(false)
    }, 500) // Simulate loading delay
  }

  // Handle search input
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setCurrentPage(1) // Reset to first page when searching
  }
  
  // Copy form URL to clipboard
  async function copyFormUrl(refKey: string) {
    try {
      const formUrl = `${window.location.origin}/f/${encodeURIComponent(refKey)}`
      await navigator.clipboard.writeText(formUrl)
      setCopiedRefKey(refKey)
      setTimeout(() => setCopiedRefKey(null), 2000) // Reset after 2 seconds
    } catch (error) {
      console.error('Failed to copy URL:', error)
    }
  }

  // State for sheet modal
  const [sheetModal, setSheetModal] = useState<{
    show: boolean;
    closing: boolean;
    sheetUrl: string;
    sheetName: string;
  }>({ show: false, closing: false, sheetUrl: '', sheetName: '' })

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

  // Handle edit button click with loading animation
  function handleEditClick(refKey: string) {
    setLoadingEdit(refKey)
    // Small delay to show the loading state, then navigate
    setTimeout(() => {
      window.location.href = `/builder/${encodeURIComponent(refKey)}`
    }, 100)
  }

  // Handle duplicate button click with loading animation
  async function handleDuplicateClick(refKey: string) {
    setLoadingDuplicate(refKey)
    
    try {
      // Preload the form data first
      const res = await adminFetch<any>(`/api/forms?refKey=${encodeURIComponent(refKey)}`)
      if (res.ok) {
        // Handle the same nested data structure as in load() function
        let formData = res.data
        if (res.data && res.data.data) {
          formData = res.data.data
        }
        
        sessionStorage.setItem(`duplicate_${refKey}`, JSON.stringify(formData))
        // Now redirect to the builder page
        window.location.href = `/builder?duplicate=${encodeURIComponent(refKey)}`
      } else {
        alert(`Failed to load form data: ${res.error.message}`)
        setLoadingDuplicate(null)
      }
    } catch (error: any) {
      alert(`Failed to load form data: ${error.message}`)
      setLoadingDuplicate(null)
    }
  }

  // Format date for display
  function formatDate(dateString?: string | null) {
    if (!dateString) return 'Unknown'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Unknown'
      
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / (1000 * 60))
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      
      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      if (diffDays < 7) return `${diffDays}d ago`
      
      return date.toLocaleDateString()
    } catch {
      return 'Unknown'
    }
  }

  // In React 18 Strict Mode (Next.js dev), effects may run twice.
  // Guard to ensure we only fire the network call once per mount.
  const didInit = useRef(false)
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Infinite scroll detection
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop !== document.documentElement.offsetHeight) return
      loadMore()
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayedItems.length, filteredItems.length, isLoadingMore])
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Existing Forms</h2>
          {!loading && (
            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">
              {filteredItems.length} {filteredItems.length === 1 ? 'form' : 'forms'}
              {searchQuery && ` matching "${searchQuery}"`}
            </span>
          )}
        </div>
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search forms..."
            className="pl-10 pr-4 py-2 w-full text-sm"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {searchQuery && (
            <button
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => handleSearch('')}
            >
              <svg className="w-4 h-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          <span>{error}</span>
          <button className="btn-secondary" onClick={load}>Retry</button>
        </div>
      )}
      
      {!loading && filteredItems.length === 0 && !error && (
        <div className="text-center py-8">
          {searchQuery ? (
            <div>
              <p className="text-sm text-gray-500">No forms match "{searchQuery}"</p>
              <button 
                onClick={() => handleSearch('')}
                className="text-sm text-blue-600 hover:text-blue-800 mt-1"
              >
                Clear search
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No forms yet.</p>
          )}
        </div>
      )}
      <ul className="divide-y rounded-md border">
        {loading && (
          <>
            {[...Array(3)].map((_, i) => (
              <li key={i} className="flex items-center justify-between p-3">
                <div className="space-y-1 w-2/3">
                  <div className="h-4 w-40 rounded bg-gray-200 animate-pulse" />
                  <div className="h-3 w-28 rounded bg-gray-100 animate-pulse" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-12 rounded-md bg-gray-100 animate-pulse" />
                  <div className="h-8 w-12 rounded-md bg-gray-100 animate-pulse" />
                  <div className="h-8 w-12 rounded-md bg-gray-100 animate-pulse" />
                  <div className="h-8 w-12 rounded-md bg-gray-100 animate-pulse" />
                </div>
              </li>
            ))}
          </>
        )}
        {!loading && Array.isArray(displayedItems) && displayedItems.map((f) => (
          <li key={f.refKey} className="flex items-center justify-between p-3">
            <div className="flex-1">
              <div className="font-medium">{f.title}</div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>{f.refKey}</span>
                <span>•</span>
                <span>Modified {formatDate(f.updatedAt)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Primary Actions Group */}
              <div className="flex items-center gap-1">
                <button
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${loadingEdit === f.refKey 
                    ? 'bg-blue-100 text-blue-600 cursor-wait opacity-75' 
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700'}`}
                  onClick={() => handleEditClick(f.refKey)}
                  onMouseEnter={() => {
                    // Warm the Next proxy microcache so edit page loads fast
                    try { fetch(`/api/forms?refKey=${encodeURIComponent(f.refKey)}`, { cache: 'no-store' }) } catch {}
                  }}
                  title="Edit form configuration"
                  disabled={loadingEdit === f.refKey}
                >
                  {loadingEdit === f.refKey ? (
                    <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  )}
                  <span className="hidden sm:inline">Edit</span>
                </button>
                
                <button
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${loadingDuplicate === f.refKey 
                    ? 'bg-purple-100 text-purple-600 cursor-wait opacity-75' 
                    : 'bg-purple-50 text-purple-600 hover:bg-purple-100 hover:text-purple-700'}`}
                  onClick={() => handleDuplicateClick(f.refKey)}
                  title="Duplicate form (clone and edit)"
                  disabled={loadingDuplicate === f.refKey}
                >
                  {loadingDuplicate === f.refKey ? (
                    <div className="w-3.5 h-3.5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                  <span className="hidden sm:inline">Duplicate</span>
                </button>
              </div>

              {/* Secondary Actions Group */}
              <div className="flex items-center gap-1">
                <a 
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 transition-colors" 
                  href={`/f/${encodeURIComponent(f.refKey)}`} 
                  target="_blank" 
                  rel="noreferrer"
                  title="View form in new tab"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span className="hidden sm:inline">View</span>
                </a>

                <button
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${copiedRefKey === f.refKey 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-700'}`}
                  onClick={() => copyFormUrl(f.refKey)}
                  title="Copy form URL to clipboard"
                >
                  {copiedRefKey === f.refKey ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="hidden sm:inline">Copied!</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span className="hidden sm:inline">Copy URL</span>
                    </>
                  )}
                </button>

                <button
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${!f.responseSheetUrl 
                    ? 'bg-gray-50 text-gray-400 cursor-not-allowed opacity-50' 
                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700'}`}
                  onClick={() => openSheet(f.responseSheetUrl)}
                  title={f.responseSheetUrl ? "Open response sheet in new tab" : "No response sheet configured"}
                  disabled={!f.responseSheetUrl}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="hidden sm:inline">Response Sheet</span>
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      
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
    </div>
  )
}
