'use client'
import { CloseOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { Button } from 'antd'
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
    moved: { from: string; to: string; field: FormField }[]
    renamed: { from: string; to: string; field: FormField }[]
  }
  existingDataCount: number
}

export function DataMigrationModal({
  show,
  closing,
  onConfirm,
  onCancel,
  changes,
  existingDataCount,
}: DataMigrationModalProps) {
  if (!show) return null

  const hasChanges =
    changes.added.length > 0 ||
    changes.removed.length > 0 ||
    changes.moved.length > 0 ||
    changes.renamed.length > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 transition-opacity duration-300 ease-out"
      style={{
        animation: closing ? 'fadeOut 0.3s ease-out' : 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl transform overflow-hidden rounded-xl bg-white shadow-2xl transition-all duration-300 ease-out"
        style={{
          animation: closing ? 'slideDown 0.3s ease-out' : 'slideUp 0.3s ease-out',
        }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white bg-opacity-20">
                <svg
                  className="h-5 w-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Data Migration Required</h3>
                <p className="text-sm text-amber-100">Existing response data will be affected</p>
              </div>
            </div>
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={onCancel}
              className="text-amber-100 hover:text-white"
              size="large"
            />
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          {/* Warning Summary */}
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <svg
                className="mt-0.5 h-5 w-5 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h4 className="mb-1 font-semibold text-amber-800">
                  {existingDataCount} existing response{existingDataCount !== 1 ? 's' : ''} found
                </h4>
                <p className="text-sm text-amber-700">
                  Your form structure has changed and existing data needs to be migrated to match
                  the new field configuration.
                </p>
              </div>
            </div>
          </div>

          {/* Column Mapping Reference */}
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <div className="mb-2 flex items-center gap-2">
              <svg
                className="h-4 w-4 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 002-2M13 7a2 2 0 012 2v6a2 2 0 002 2"
                />
              </svg>
              <span className="text-sm font-medium text-blue-800">
                Google Sheets Column Mapping
              </span>
            </div>
            <p className="text-xs text-blue-700">
              <span className="rounded bg-white px-1 font-mono">A</span>=timestamp,
              <span className="rounded bg-white px-1 font-mono">B</span>=refKey,
              <span className="rounded bg-white px-1 font-mono">C</span>=ip,
              <span className="rounded bg-white px-1 font-mono">D</span>=userAgent,
              <span className="rounded bg-white px-1 font-mono">E+</span>=form fields
            </p>
          </div>

          {/* Changes Overview */}
          {hasChanges && (
            <div className="space-y-4">
              <h4 className="flex items-center gap-2 font-semibold text-gray-900">
                <svg
                  className="h-5 w-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
                Changes Summary
              </h4>

              {/* Added Fields */}
              {changes.added.length > 0 && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <h5 className="mb-2 flex items-center gap-2 font-medium text-green-800">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    New Fields ({changes.added.length})
                  </h5>
                  <div className="space-y-1">
                    {changes.added.map((field, i) => (
                      <div
                        key={i}
                        className="rounded border bg-white px-3 py-2 text-sm text-green-700"
                      >
                        <span className="font-medium">{field.label}</span>
                        <span className="ml-2 text-green-600">({field.key})</span>
                        <span className="ml-2 text-gray-500">• {field.type}</span>
                        <span className="ml-2 rounded bg-green-100 px-1 font-mono text-xs text-green-800">
                          Col {getColumnLetter(i)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-green-600">
                    New columns will be added to your response sheet.
                  </p>
                </div>
              )}

              {/* Removed Fields */}
              {changes.removed.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <h5 className="mb-2 flex items-center gap-2 font-medium text-red-800">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Removed Fields ({changes.removed.length})
                  </h5>
                  <div className="space-y-1">
                    {changes.removed.map((field, i) => (
                      <div
                        key={i}
                        className="rounded border bg-white px-3 py-2 text-sm text-red-700"
                      >
                        <span className="font-medium">{field.label}</span>
                        <span className="ml-2 text-red-600">({field.key})</span>
                        <span className="ml-2 text-gray-500">• {field.type}</span>
                        <span className="ml-2 rounded bg-red-100 px-1 font-mono text-xs text-red-800">
                          Col {getColumnLetter(i)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-red-600">
                    ⚠️ Data in these columns will be preserved but hidden.
                  </p>
                </div>
              )}

              {/* Moved Fields */}
              {changes.moved.length > 0 && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <h5 className="mb-2 flex items-center gap-2 font-medium text-blue-800">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                      />
                    </svg>
                    Reordered Fields ({changes.moved.length})
                  </h5>
                  <div className="space-y-1">
                    {changes.moved.map((change, i) => {
                      // Convert position numbers to column letters (if they are numbers)
                      const fromCol =
                        typeof change.from === 'string' && /^\d+$/.test(change.from)
                          ? getColumnLetter(parseInt(change.from))
                          : change.from
                      const toCol =
                        typeof change.to === 'string' && /^\d+$/.test(change.to)
                          ? getColumnLetter(parseInt(change.to))
                          : change.to

                      return (
                        <div
                          key={i}
                          className="rounded border bg-white px-3 py-2 text-sm text-blue-700"
                        >
                          <span className="font-medium">{change.field.label}</span>
                          <span className="ml-2 text-gray-500">
                            <span className="rounded bg-blue-100 px-1 font-mono">
                              Col {fromCol}
                            </span>{' '}
                            →{' '}
                            <span className="rounded bg-blue-100 px-1 font-mono">Col {toCol}</span>
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  <p className="mt-2 text-xs text-blue-600">
                    Columns will be reordered in your Google Sheet to match the new field
                    arrangement.
                  </p>
                </div>
              )}

              {/* Renamed Fields */}
              {changes.renamed.length > 0 && (
                <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                  <h5 className="mb-2 flex items-center gap-2 font-medium text-purple-800">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Renamed Fields ({changes.renamed.length})
                  </h5>
                  <div className="space-y-1">
                    {changes.renamed.map((change, i) => (
                      <div
                        key={i}
                        className="rounded border bg-white px-3 py-2 text-sm text-purple-700"
                      >
                        <span className="font-medium">{change.field.label}</span>
                        <span className="ml-2 text-gray-500">
                          "{change.from}" → "{change.to}"
                        </span>
                        <span className="ml-2 rounded bg-purple-100 px-1 font-mono text-xs text-purple-800">
                          Col {getColumnLetter(i)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-purple-600">
                    Column headers will be updated to match new field keys.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Migration Process */}
          <div className="mt-6 rounded-lg bg-gray-50 p-4">
            <h4 className="mb-3 flex items-center gap-2 font-medium text-gray-900">
              <svg
                className="h-5 w-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              What will happen:
            </h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="mt-1 text-green-600">✓</span>
                <span>
                  Your existing data will be <strong>safely preserved</strong>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-blue-600">↻</span>
                <span>Column structure will be updated to match your new form fields</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-purple-600">⚡</span>
                <span>Data will be automatically moved to the correct columns</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-amber-600">⚠</span>
                <span>This process cannot be undone automatically</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t bg-gray-50 px-6 py-4">
          <Button onClick={onCancel} size="large">
            Cancel
          </Button>
          <Button
            type="primary"
            onClick={onConfirm}
            size="large"
            danger
            icon={<ExclamationCircleOutlined />}
            className="border-amber-500 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
          >
            Proceed with Migration
          </Button>
        </div>
      </div>
    </div>
  )
}
