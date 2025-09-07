import { NextRequest, NextResponse } from 'next/server'
import { UploadedFile, ApiResult } from '@/lib/types'

const GAS_BASE_URL = process.env.GAS_BASE_URL

export async function POST(request: NextRequest) {
  try {
    if (!GAS_BASE_URL) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const fieldKey = formData.get('fieldKey') as string
    const refKey = formData.get('refKey') as string

    if (!file || !fieldKey || !refKey) {
      return NextResponse.json(
        { error: 'File, fieldKey, and refKey are required' },
        { status: 400 }
      )
    }

    // Get form configuration to find upload folder URL
    const formResponse = await fetch(`${GAS_BASE_URL}?op=forms&refKey=${encodeURIComponent(refKey)}`)
    const formResult = await formResponse.json()
    
    if (!formResponse.ok || !formResult.ok) {
      return NextResponse.json(
        { error: 'Form not found or no upload folder configured' },
        { status: 404 }
      )
    }
    
    const formData_config = Array.isArray(formResult.data) ? formResult.data[0] : formResult.data
    if (!formData_config.uploadFolderUrl) {
      return NextResponse.json(
        { error: 'No upload folder configured for this form' },
        { status: 400 }
      )
    }

    // Validate file size (100MB max)
    const maxSize = 100 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds maximum limit of 100MB' },
        { status: 400 }
      )
    }

    // Convert file to base64 for Google Apps Script
    const buffer = await file.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')

    // Prepare payload for Google Apps Script
    const payload = {
      op: 'upload_file',
      file: {
        name: file.name,
        type: file.type,
        size: file.size,
        content: base64,
      },
      fieldKey,
      uploadFolderUrl: formData_config.uploadFolderUrl,
    }

    // Send to Google Apps Script
    const response = await fetch(GAS_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const result = await response.json()

    if (!response.ok || !result.ok) {
      return NextResponse.json(
        { error: result.error?.message || 'Upload failed' },
        { status: response.status || 500 }
      )
    }

    // Return the uploaded file information from result.data
    const uploadedFile: UploadedFile = {
      id: result.data.id,
      name: result.data.name,
      size: result.data.size,
      type: result.data.type,
      url: result.data.url,
      uploadedAt: result.data.uploadedAt,
    }

    const apiResult: ApiResult<UploadedFile> = {
      ok: true,
      data: uploadedFile,
    }

    return NextResponse.json(apiResult)

  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}