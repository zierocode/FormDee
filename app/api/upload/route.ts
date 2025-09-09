import { NextRequest, NextResponse } from 'next/server'
import { HTTP_STATUS } from '@/lib/constants'
import { uploadToR2 } from '@/lib/r2-storage'

export const maxDuration = 60

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
]

function errorResponse(message: string, code: number = HTTP_STATUS.BAD_REQUEST) {
  return NextResponse.json({ ok: false, error: { code: String(code), message } }, { status: code })
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const file = formData.get('file') as File | null
    const refKey = formData.get('refKey') as string | null
    const fieldKey = formData.get('fieldKey') as string | null

    if (!file) {
      return errorResponse('No file provided')
    }

    if (!refKey) {
      return errorResponse('Form reference key is required')
    }

    if (!fieldKey) {
      return errorResponse('Field key is required')
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return errorResponse(`File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`)
    }

    // Validate file type
    const fileType = file.type || 'application/octet-stream'
    if (!ALLOWED_FILE_TYPES.includes(fileType)) {
      return errorResponse('File type not allowed')
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to R2
    const result = await uploadToR2({
      file: buffer,
      fileName: file.name,
      refKey,
      contentType: fileType,
    })

    if (!result.success) {
      return errorResponse(
        result.error || 'Failed to upload file',
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      )
    }

    // Return success response with file URL
    return NextResponse.json({
      ok: true,
      data: {
        url: result.url,
        key: result.key,
        fileName: file.name,
        fileSize: file.size,
        fileType: fileType,
        fieldKey: fieldKey,
      },
    })
  } catch (error: any) {
    console.error('[API] Upload error:', error)
    return errorResponse(
      error?.message || 'Failed to upload file',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    )
  }
}

// Add OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  })
}
