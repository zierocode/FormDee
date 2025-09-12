import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth } from '@/lib/auth-supabase'
import { ERROR_MESSAGES, HTTP_STATUS } from '@/lib/constants'

// Initialize R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * UI-only endpoint for storage statistics
 *
 * IMPORTANT: This endpoint is ONLY for UI/browser access
 * - Uses UI authentication (cookie-based)
 * - DO NOT modify to accept API keys
 * - For API access, use /api/storage-stats instead
 *
 * Security: UI key only - never accept API keys here
 */
export async function GET(req: NextRequest) {
  try {
    // Validate authentication (UI key only - NEVER change to 'any' or 'api')
    const auth = await withApiAuth(req, 'ui')

    if (!auth.authenticated) {
      return NextResponse.json(
        { ok: false, error: { message: ERROR_MESSAGES.UNAUTHORIZED } },
        { status: HTTP_STATUS.UNAUTHORIZED }
      )
    }

    const bucketName = process.env.R2_BUCKET_NAME

    if (!bucketName) {
      return NextResponse.json(
        { ok: false, error: { message: 'R2 bucket not configured' } },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      )
    }

    // List all objects in the bucket (simplified for dashboard)
    let continuationToken: string | undefined
    let totalSize = 0
    let totalCount = 0

    do {
      const listCommand = new ListObjectsV2Command({
        Bucket: bucketName,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      })

      const listResponse = await r2Client.send(listCommand)

      if (listResponse.Contents) {
        for (const object of listResponse.Contents) {
          if (object.Size) {
            totalCount++
            totalSize += object.Size
          }
        }
      }

      continuationToken = listResponse.NextContinuationToken
    } while (continuationToken)

    // R2 Storage limits (for free tier)
    const maxStorage = 10 * 1024 * 1024 * 1024 // 10 GB

    const response = {
      ok: true,
      data: {
        summary: {
          totalFiles: totalCount,
          totalSize: totalSize,
          totalSizeFormatted: formatBytes(totalSize),
          usedPercentage: ((totalSize / maxStorage) * 100).toFixed(2) + '%',
          remainingStorage: maxStorage - totalSize,
          remainingStorageFormatted: formatBytes(maxStorage - totalSize),
          maxStorage: maxStorage,
          maxStorageFormatted: formatBytes(maxStorage),
        },
        limits: {
          plan: 'free',
          maxStorage: formatBytes(maxStorage),
          maxOperationsPerMonth: '1,000,000',
        },
      },
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('[API] Dashboard storage error:', error)

    return NextResponse.json(
      {
        ok: false,
        error: {
          message: error.message || 'Failed to retrieve storage statistics',
        },
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    )
  }
}
