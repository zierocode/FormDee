import { google } from 'googleapis'
import { logger } from '@/lib/logger'

/**
 * Google Sheets integration service
 * Requires Google Service Account credentials to be configured
 */

export interface GoogleSheetsConfig {
  spreadsheetId: string
  sheetName?: string
}

export interface GoogleSheetsRow {
  timestamp: string
  values: (string | number)[]
}

/**
 * Initialize Google Sheets API client with service account authentication
 */
function getGoogleSheetsClient() {
  try {
    // Check if service account credentials are configured
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    const serviceAccountPrivateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY

    if (!serviceAccountEmail || !serviceAccountPrivateKey) {
      logger.warn(
        '[Google Sheets] Service account credentials not configured. Google Sheets integration disabled.'
      )
      return null
    }

    // Create JWT auth client
    const auth = new google.auth.JWT({
      email: serviceAccountEmail,
      key: serviceAccountPrivateKey.replace(/\\n/g, '\n'), // Handle escaped newlines
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.readonly',
      ],
    })

    // Initialize Sheets API
    const sheets = google.sheets({ version: 'v4', auth })

    return sheets
  } catch (error) {
    logger.error('[Google Sheets] Failed to initialize Google Sheets client:', error)
    return null
  }
}

/**
 * Extract spreadsheet ID from Google Sheets URL
 */
export function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return match ? match[1] : null
}

/**
 * Test Google Sheets connectivity and permissions
 */
export async function testGoogleSheetsConnection(spreadsheetUrl: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const sheets = getGoogleSheetsClient()
    if (!sheets) {
      return {
        success: false,
        error: 'Google Sheets service not configured. Please set up service account credentials.',
      }
    }

    const spreadsheetId = extractSpreadsheetId(spreadsheetUrl)
    if (!spreadsheetId) {
      return {
        success: false,
        error: 'Invalid Google Sheets URL format',
      }
    }

    // Test access by getting spreadsheet metadata
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'properties.title,sheets.properties.title',
    })

    if (response.data && response.data.properties) {
      logger.info(
        `[Google Sheets] Successfully connected to spreadsheet: ${response.data.properties.title}`
      )
      return { success: true }
    } else {
      return {
        success: false,
        error: 'Unable to access spreadsheet',
      }
    }
  } catch (error: any) {
    logger.error('[Google Sheets] Connection test failed:', error)

    if (error.code === 403) {
      return {
        success: false,
        error: 'Permission denied. Please share the spreadsheet with the service account email.',
      }
    } else if (error.code === 404) {
      return {
        success: false,
        error: 'Spreadsheet not found. Please check the URL.',
      }
    } else {
      return {
        success: false,
        error: `Connection failed: ${error.message}`,
      }
    }
  }
}

/**
 * Append data to Google Sheets
 */
export async function appendToGoogleSheets(
  spreadsheetUrl: string,
  headers: string[],
  values: (string | number)[],
  options: {
    sheetName?: string
    formTitle?: string
  } = {}
): Promise<{
  success: boolean
  error?: string
  rowsAppended?: number
}> {
  try {
    const sheets = getGoogleSheetsClient()
    if (!sheets) {
      return {
        success: false,
        error: 'Google Sheets service not configured',
      }
    }

    const spreadsheetId = extractSpreadsheetId(spreadsheetUrl)
    if (!spreadsheetId) {
      return {
        success: false,
        error: 'Invalid Google Sheets URL format',
      }
    }

    // Determine sheet name
    let sheetName = options.sheetName || 'Sheet1'

    // If formTitle is provided, try to use it as sheet name (sanitized)
    if (options.formTitle) {
      sheetName = options.formTitle.replace(/[^\w\s-]/g, '').substring(0, 100) || 'FormDee'
    }

    // Check if sheet exists, create if needed
    try {
      await sheets.spreadsheets.get({
        spreadsheetId,
        ranges: [`${sheetName}!A1:A1`],
      })
    } catch (error: any) {
      if (error.code === 400) {
        // Sheet doesn't exist, create it
        logger.info(`[Google Sheets] Creating new sheet: ${sheetName}`)
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: sheetName,
                  },
                },
              },
            ],
          },
        })
      } else {
        throw error
      }
    }

    // Check if headers need to be added
    const headerRange = `${sheetName}!1:1`
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: headerRange,
    })

    const existingHeaders = headerResponse.data.values?.[0] || []
    const needsHeaders =
      existingHeaders.length === 0 || JSON.stringify(existingHeaders) !== JSON.stringify(headers)

    if (needsHeaders) {
      logger.info(`[Google Sheets] Adding/updating headers in sheet: ${sheetName}`)
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: headerRange,
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers],
        },
      })
    }

    // Append the data
    const appendResponse = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:A`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [values],
      },
    })

    const updatesData = appendResponse.data.updates
    const rowsAppended = updatesData?.updatedRows || 1

    logger.info(
      `[Google Sheets] Successfully appended ${rowsAppended} row(s) to sheet: ${sheetName}`
    )

    return {
      success: true,
      rowsAppended,
    }
  } catch (error: any) {
    logger.error('[Google Sheets] Failed to append data:', error)

    if (error.code === 403) {
      return {
        success: false,
        error: 'Permission denied. Please share the spreadsheet with the service account.',
      }
    } else if (error.code === 404) {
      return {
        success: false,
        error: 'Spreadsheet not found.',
      }
    } else {
      return {
        success: false,
        error: `Failed to save data: ${error.message}`,
      }
    }
  }
}

/**
 * Get setup instructions for Google Sheets integration
 */
export function getGoogleSheetsSetupInstructions(): string {
  return `
To enable Google Sheets integration, you need to:

1. Create a Google Cloud Project:
   - Go to https://console.cloud.google.com/
   - Create a new project or select existing one

2. Enable Google Sheets API:
   - Go to APIs & Services > Library
   - Search for "Google Sheets API" and enable it

3. Create a Service Account:
   - Go to APIs & Services > Credentials
   - Click "Create Credentials" > "Service Account"
   - Download the JSON key file

4. Set Environment Variables:
   - GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
   - GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"

5. Share your Google Sheet:
   - Open your Google Sheet
   - Click "Share" and add your service account email
   - Give "Editor" permissions

For detailed instructions, visit: https://developers.google.com/sheets/api/quickstart/nodejs
`.trim()
}
