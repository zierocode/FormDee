import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL

if (
  !R2_ACCOUNT_ID ||
  !R2_ACCESS_KEY_ID ||
  !R2_SECRET_ACCESS_KEY ||
  !R2_BUCKET_NAME ||
  !R2_PUBLIC_URL
) {
  console.warn('R2 storage configuration is incomplete. File uploads will not work.')
}

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || '',
    secretAccessKey: R2_SECRET_ACCESS_KEY || '',
  },
})

export interface UploadFileOptions {
  file: Buffer | Uint8Array
  fileName: string
  refKey: string
  contentType?: string
}

export interface UploadResult {
  success: boolean
  url?: string
  key?: string
  error?: string
}

/**
 * Generate a unique file key for R2 storage
 */
export function generateFileKey(refKey: string, fileName: string): string {
  const timestamp = Date.now()
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
  return `${refKey}-${timestamp}-${sanitizedFileName}`
}

/**
 * Upload a file to R2 storage
 */
export async function uploadToR2({
  file,
  fileName,
  refKey,
  contentType = 'application/octet-stream',
}: UploadFileOptions): Promise<UploadResult> {
  try {
    if (!R2_BUCKET_NAME || !R2_PUBLIC_URL) {
      throw new Error('R2 storage is not configured')
    }

    const key = generateFileKey(refKey, fileName)

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
    })

    await r2Client.send(command)

    const publicUrl = `${R2_PUBLIC_URL}/${key}`

    return {
      success: true,
      url: publicUrl,
      key,
    }
  } catch (error) {
    console.error('R2 upload error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload file',
    }
  }
}

/**
 * Delete a file from R2 storage
 */
export async function deleteFromR2(key: string): Promise<boolean> {
  try {
    if (!R2_BUCKET_NAME) {
      throw new Error('R2 storage is not configured')
    }

    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    })

    await r2Client.send(command)
    return true
  } catch (error) {
    console.error('R2 delete error:', error)
    return false
  }
}

/**
 * Get the public URL for a file
 */
export function getPublicUrl(key: string): string {
  if (!R2_PUBLIC_URL) {
    throw new Error('R2 public URL is not configured')
  }
  return `${R2_PUBLIC_URL}/${key}`
}

/**
 * Extract the key from a public URL
 */
export function extractKeyFromUrl(url: string): string | null {
  if (!R2_PUBLIC_URL) {
    return null
  }

  if (url.startsWith(R2_PUBLIC_URL)) {
    return url.substring(R2_PUBLIC_URL.length + 1)
  }

  return null
}
