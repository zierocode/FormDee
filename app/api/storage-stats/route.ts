import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth } from '@/lib/auth-supabase'
import { ERROR_MESSAGES, HTTP_STATUS } from '@/lib/constants'

// Force dynamic rendering since this route uses authentication
export const dynamic = 'force-dynamic'

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

export async function GET(req: NextRequest) {
  try {
    // Validate authentication (API key only)
    const auth = await withApiAuth(req, 'api')

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

    // List all objects in the bucket
    let continuationToken: string | undefined
    let totalSize = 0
    let totalCount = 0
    const filesByType: Record<string, { count: number; size: number }> = {}
    const filesByForm: Record<string, { count: number; size: number }> = {}

    do {
      const listCommand = new ListObjectsV2Command({
        Bucket: bucketName,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      })

      const listResponse = await r2Client.send(listCommand)

      if (listResponse.Contents) {
        for (const object of listResponse.Contents) {
          if (object.Key && object.Size) {
            totalCount++
            totalSize += object.Size

            // Parse file extension
            const extension = object.Key.split('.').pop()?.toLowerCase() || 'unknown'
            if (!filesByType[extension]) {
              filesByType[extension] = { count: 0, size: 0 }
            }
            filesByType[extension].count++
            filesByType[extension].size += object.Size

            // Parse form reference (files are named like: refKey-timestamp-filename)
            const formRef = object.Key.split('-')[0]
            if (formRef) {
              if (!filesByForm[formRef]) {
                filesByForm[formRef] = { count: 0, size: 0 }
              }
              filesByForm[formRef].count++
              filesByForm[formRef].size += object.Size
            }
          }
        }
      }

      continuationToken = listResponse.NextContinuationToken
    } while (continuationToken)

    // R2 Storage limits (for free tier - adjust based on your plan)
    const storageLimits = {
      free: {
        storage: 10 * 1024 * 1024 * 1024, // 10 GB
        operations: 1000000, // 1M operations/month
      },
      // Add your plan limits here if not on free tier
    }

    const currentPlan = 'free' // Adjust based on your actual plan
    const maxStorage = storageLimits[currentPlan].storage

    // Sort file types by size (descending)
    const sortedFileTypes = Object.entries(filesByType)
      .map(([type, stats]) => ({
        type,
        count: stats.count,
        size: stats.size,
        sizeFormatted: formatBytes(stats.size),
      }))
      .sort((a, b) => b.size - a.size)

    // Sort forms by size (descending) and take top 10
    const topForms = Object.entries(filesByForm)
      .map(([form, stats]) => ({
        form,
        count: stats.count,
        size: stats.size,
        sizeFormatted: formatBytes(stats.size),
      }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 10)

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
        byFileType: sortedFileTypes,
        topFormsByStorage: topForms,
        limits: {
          plan: currentPlan,
          maxStorage: formatBytes(maxStorage),
          maxOperationsPerMonth: storageLimits[currentPlan].operations.toLocaleString(),
        },
      },
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('[API] Storage stats error:', error)

    // Check for specific R2 errors
    if (error.name === 'NoSuchBucket') {
      return NextResponse.json(
        { ok: false, error: { message: 'R2 bucket not found' } },
        { status: HTTP_STATUS.NOT_FOUND }
      )
    }

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
