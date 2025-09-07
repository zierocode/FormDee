"use client"
import { FormField } from '@/lib/types'

// Helper function to convert field index to Google Sheets column letter
// Fields start at column E (index 0 = E, index 1 = F, etc.)
function getColumnLetter(index: number): string {
  return String.fromCharCode(69 + index) // 69 is ASCII for 'E'
}

interface DataMigrationModalProps {
  show: boolean
  closing: boolean
  onConfirm: () => void
  onCancel: () => void
  changes: {
    added: FormField[]
    removed: FormField[]
    moved: { from: string, to: string, field: FormField }[]
    renamed: { from: string, to: string, field: FormField }[]
  }
  existingDataCount: number
}

export function DataMigrationModal({ 
  show, 
  closing, 
  onConfirm, 
  onCancel, 
  changes,
  existingDataCount 
}: DataMigrationModalProps) {
  if (!show) return null

  const hasChanges = changes.added.length > 0 || changes.removed.length > 0 || 
                     changes.moved.length > 0 || changes.renamed.length > 0

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-out"
      style={{
        animation: closing ? 'fadeOut 0.3s ease-out' : 'fadeIn 0.2s ease-out'
      }}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden transition-all duration-300 ease-out transform"
        style={{
          animation: closing ? 'slideDown 0.3s ease-out' : 'slideUp 0.3s ease-out'
        }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Data Migration Required</h3>
                <p className="text-amber-100 text-sm">Existing response data will be affected</p>
              </div>
            </div>
            <button 
              onClick={onCancel}
              className="text-amber-100 hover:text-white text-xl transition-colors duration-200"
            >
              ✕
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Warning Summary */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="font-semibold text-amber-800 mb-1">
                  {existingDataCount} existing response{existingDataCount !== 1 ? 's' : ''} found
                </h4>
                <p className="text-sm text-amber-700">
                  Your form structure has changed and existing data needs to be migrated to match the new field configuration.
                </p>
              </div>
            </div>
          </div>

          {/* Column Mapping Reference */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 002-2M13 7a2 2 0 012 2v6a2 2 0 002 2" />
              </svg>
              <span className="text-sm font-medium text-blue-800">Google Sheets Column Mapping</span>
            </div>
            <p className="text-xs text-blue-700">
              <span className="font-mono bg-white px-1 rounded">A</span>=timestamp, 
              <span className="font-mono bg-white px-1 rounded">B</span>=refKey, 
              <span className="font-mono bg-white px-1 rounded">C</span>=ip, 
              <span className="font-mono bg-white px-1 rounded">D</span>=userAgent, 
              <span className="font-mono bg-white px-1 rounded">E+</span>=form fields
            </p>
          </div>

          {/* Changes Overview */}
          {hasChanges && (
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Changes Summary
              </h4>

              {/* Added Fields */}
              {changes.added.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h5 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    New Fields ({changes.added.length})
                  </h5>
                  <div className="space-y-1">
                    {changes.added.map((field, i) => (
                      <div key={i} className="text-sm text-green-700 bg-white px-3 py-2 rounded border">
                        <span className="font-medium">{field.label}</span>
                        <span className="text-green-600 ml-2">({field.key})</span>
                        <span className="text-gray-500 ml-2">• {field.type}</span>
                        <span className="font-mono bg-green-100 text-green-800 px-1 rounded text-xs ml-2">Col {getColumnLetter(i)}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-green-600 mt-2">New columns will be added to your response sheet.</p>
                </div>
              )}

              {/* Removed Fields */}
              {changes.removed.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h5 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Removed Fields ({changes.removed.length})
                  </h5>
                  <div className="space-y-1">
                    {changes.removed.map((field, i) => (
                      <div key={i} className="text-sm text-red-700 bg-white px-3 py-2 rounded border">
                        <span className="font-medium">{field.label}</span>
                        <span className="text-red-600 ml-2">({field.key})</span>
                        <span className="text-gray-500 ml-2">• {field.type}</span>
                        <span className="font-mono bg-red-100 text-red-800 px-1 rounded text-xs ml-2">Col {getColumnLetter(i)}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-red-600 mt-2">⚠️ Data in these columns will be preserved but hidden.</p>
                </div>
              )}

              {/* Moved Fields */}
              {changes.moved.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h5 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    Reordered Fields ({changes.moved.length})
                  </h5>
                  <div className="space-y-1">
                    {changes.moved.map((change, i) => {
                      // Convert position numbers to column letters (if they are numbers)
                      const fromCol = typeof change.from === 'string' && /^\d+$/.test(change.from) 
                        ? getColumnLetter(parseInt(change.from)) 
                        : change.from
                      const toCol = typeof change.to === 'string' && /^\d+$/.test(change.to) 
                        ? getColumnLetter(parseInt(change.to)) 
                        : change.to
                      
                      return (
                        <div key={i} className="text-sm text-blue-700 bg-white px-3 py-2 rounded border">
                          <span className="font-medium">{change.field.label}</span>
                          <span className="text-gray-500 ml-2">
                            <span className="font-mono bg-blue-100 px-1 rounded">Col {fromCol}</span> → <span className="font-mono bg-blue-100 px-1 rounded">Col {toCol}</span>
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  <p className="text-xs text-blue-600 mt-2">Columns will be reordered in your Google Sheet to match the new field arrangement.</p>
                </div>
              )}

              {/* Renamed Fields */}
              {changes.renamed.length > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h5 className="font-medium text-purple-800 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Renamed Fields ({changes.renamed.length})
                  </h5>
                  <div className="space-y-1">
                    {changes.renamed.map((change, i) => (
                      <div key={i} className="text-sm text-purple-700 bg-white px-3 py-2 rounded border">
                        <span className="font-medium">{change.field.label}</span>
                        <span className="text-gray-500 ml-2">
                          "{change.from}" → "{change.to}"
                        </span>
                        <span className="font-mono bg-purple-100 text-purple-800 px-1 rounded text-xs ml-2">Col {getColumnLetter(i)}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-purple-600 mt-2">Column headers will be updated to match new field keys.</p>
                </div>
              )}
            </div>
          )}

          {/* Migration Process */}
          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              What will happen:
            </h4>
            <ul className="text-sm text-gray-700 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">✓</span>
                <span>Your existing data will be <strong>safely preserved</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">↻</span>
                <span>Column structure will be updated to match your new form fields</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-1">⚡</span>
                <span>Data will be automatically moved to the correct columns</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 mt-1">⚠</span>
                <span>This process cannot be undone automatically</span>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
          <button 
            onClick={onCancel}
            className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors duration-200"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-md hover:from-amber-600 hover:to-orange-600 transition-all duration-200 transform hover:scale-105"
          >
            Proceed with Migration
          </button>
        </div>
      </div>
    </div>
  )
}