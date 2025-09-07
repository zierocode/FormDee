"use client"
import { FormField } from '@/lib/types'

type Props = {
  fields: FormField[]
  onEdit: (index: number) => void
  onRemove: (index: number) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
}

export function FieldList({ fields, onEdit, onRemove, onMoveUp, onMoveDown }: Props) {
  if (!fields.length) return <p className="text-sm text-gray-500">No fields yet.</p>
  return (
    <ul className="divide-y rounded-md border">
      {fields.map((f, i) => (
        <li key={f.key} className="flex items-center justify-between gap-3 p-3">
          <div>
            <div className="font-medium">{f.label} <span className="text-xs text-gray-500">({f.key})</span></div>
            <div className="text-xs text-gray-500">{f.type}{f.required ? ' • required' : ''} • <span className="font-mono bg-gray-100 px-1 rounded">Col {String.fromCharCode(69 + i)}</span></div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-secondary" onClick={() => onMoveUp(i)} aria-label={`Move ${f.label} up`}>↑</button>
            <button className="btn-secondary" onClick={() => onMoveDown(i)} aria-label={`Move ${f.label} down`}>↓</button>
            <button className="btn-secondary" onClick={() => onEdit(i)}>Edit</button>
            <button className="btn-secondary" onClick={() => onRemove(i)}>Remove</button>
          </div>
        </li>
      ))}
    </ul>
  )
}

