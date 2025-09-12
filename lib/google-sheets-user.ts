import { logger } from '@/lib/logger'
import { createSheetsClient, refreshAccessToken } from './google-auth'

interface GoogleSheetsResult {
  success: boolean
  error?: string
  rowsAppended?: number
  spreadsheetTitle?: string
  spreadsheetId?: string
  sheetName?: string
  sheetExists?: boolean
}

// interface AppendOptions {
//   // No longer need formTitle or sheetName since we use fixed name
// }

interface UserAuthOptions {
  accessToken: string
  refreshToken?: string
}

/**
 * Extract Spreadsheet ID from Google Sheets URL
 */
export function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return match ? match[1] : null
}

/**
 * Create authenticated Google Sheets client using user authentication
 * Automatically handles token refresh using refresh token
 */
async function getSheetsClientWithUserAuth(userAuth: UserAuthOptions) {
  let accessToken = userAuth.accessToken

  // If we have a refresh token, always use it to get a fresh access token
  // This ensures we always have a valid token without checking expiry
  if (userAuth.refreshToken) {
    try {
      const newAuth = await refreshAccessToken(userAuth.refreshToken)
      accessToken = newAuth.accessToken

      // Update the access token in the database for future use
      const { supabase } = await import('@/lib/supabase')
      await supabase
        .from('GoogleAuth')
        .update({
          access_token: accessToken,
          updated_at: new Date().toISOString(),
        })
        .eq('refresh_token', userAuth.refreshToken)
    } catch (error) {
      // If refresh fails, fall back to the existing access token
      logger.info('Failed to refresh token, using existing access token')
    }
  }

  return createSheetsClient(accessToken)
}

/**
 * Test Google Sheets connectivity with user authentication
 */
export async function testGoogleSheetsConnectionWithUser(
  spreadsheetUrl: string,
  userAuth: UserAuthOptions
): Promise<{
  success: boolean
  error?: string
  spreadsheetTitle?: string
  spreadsheetId?: string
}> {
  try {
    const sheets = await getSheetsClientWithUserAuth(userAuth)

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
      return {
        success: true,
        spreadsheetTitle: response.data.properties.title || undefined,
        spreadsheetId,
      }
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
        error: 'Permission denied. You need edit access to this spreadsheet.',
      }
    } else if (error.code === 404) {
      return {
        success: false,
        error: 'Spreadsheet not found. Please check the URL.',
      }
    } else if (error.message.includes('authentication')) {
      return {
        success: false,
        error: 'Authentication failed. Please re-authenticate with Google.',
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
 * Test if Google Sheet is writable by attempting to write and delete a test row
 */
export async function testWriteGoogleSheet(
  spreadsheetUrl: string,
  userAuth: UserAuthOptions
): Promise<{
  success: boolean
  error?: string
  needsSheetCreation?: boolean
  sheetName?: string
  sheetExists?: boolean
  spreadsheetId?: string
  spreadsheetTitle?: string
}> {
  try {
    const sheets = await getSheetsClientWithUserAuth(userAuth)

    const spreadsheetId = extractSpreadsheetId(spreadsheetUrl)
    if (!spreadsheetId) {
      return {
        success: false,
        error: 'Invalid Google Sheets URL format',
      }
    }

    // Get spreadsheet metadata first
    let spreadsheetTitle: string | undefined
    try {
      const metadataResponse = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'properties.title',
      })
      spreadsheetTitle = metadataResponse.data?.properties?.title || undefined
    } catch (error) {
      // Continue with write test even if metadata fails
    }

    // Fixed sheet name for all FormDee forms
    const sheetName = 'FormDee Responses'

    // Escape sheet name with single quotes since it contains spaces
    const escapedSheetName = `'${sheetName}'`

    // Try to write a test value to a temporary cell (use A100 which should be safe for most sheets)
    const testRange = `${escapedSheetName}!A100`
    const testValue = `FormDee Write Test - ${Date.now()}`

    try {
      // Attempt to write
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: testRange,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[testValue]],
        },
      })

      // Clean up - delete the test value
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: testRange,
      })

      logger.info('[Google Sheets] Write test successful - sheet is writable')
      return { success: true, sheetName, sheetExists: true, spreadsheetId, spreadsheetTitle }
    } catch (writeError: any) {
      if (writeError.code === 403) {
        return {
          success: false,
          error: 'No write access. You need edit permissions for this spreadsheet.',
        }
      } else if (writeError.code === 400 && writeError.message?.includes('Unable to parse range')) {
        // Sheet doesn't exist with this name
        logger.info(`[Google Sheets] Sheet '${sheetName}' not found in spreadsheet`)
        return {
          success: false,
          error: `Sheet '${sheetName}' does not exist in this spreadsheet. It will be created when you save.`,
          needsSheetCreation: true,
          sheetName,
          sheetExists: false,
          spreadsheetId,
          spreadsheetTitle,
        }
      }
      throw writeError
    }
  } catch (error: any) {
    logger.error('[Google Sheets] Write test failed:', error)
    return {
      success: false,
      error: `Write test failed: ${error.message}`,
    }
  }
}

/**
 * Append data to Google Sheets with user authentication
 */
export async function appendToGoogleSheetsWithUser(
  spreadsheetUrl: string,
  headers: string[],
  values: (string | number)[],
  userAuth: UserAuthOptions
): Promise<GoogleSheetsResult> {
  try {
    const sheets = await getSheetsClientWithUserAuth(userAuth)

    const spreadsheetId = extractSpreadsheetId(spreadsheetUrl)
    if (!spreadsheetId) {
      return {
        success: false,
        error: 'Invalid Google Sheets URL format',
      }
    }

    // Fixed sheet name for all FormDee forms
    const sheetName = 'FormDee Responses'

    // Escape sheet name with single quotes since it contains spaces
    const escapedSheetName = `'${sheetName}'`

    // Check if sheet exists, create if needed
    try {
      await sheets.spreadsheets.get({
        spreadsheetId,
        ranges: [`${escapedSheetName}!A1:A1`],
      })
    } catch (error: any) {
      if (error.code === 400 && error.message.includes('Unable to parse range')) {
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
    const headerRange = `${escapedSheetName}!1:1`
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
      range: `${escapedSheetName}!A:A`,
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
        error: 'Permission denied. You need edit access to this spreadsheet.',
      }
    } else if (error.code === 404) {
      return {
        success: false,
        error: 'Spreadsheet not found.',
      }
    } else if (error.message.includes('authentication')) {
      return {
        success: false,
        error: 'Authentication failed. Please re-authenticate with Google.',
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
 * Clear all data from a sheet except headers (for form structure changes)
 */
export async function clearSheetDataWithUser(
  spreadsheetUrl: string,
  userAuth: UserAuthOptions
): Promise<GoogleSheetsResult> {
  try {
    const sheets = await getSheetsClientWithUserAuth(userAuth)

    const spreadsheetId = extractSpreadsheetId(spreadsheetUrl)
    if (!spreadsheetId) {
      return {
        success: false,
        error: 'Invalid Google Sheets URL format',
      }
    }

    // Fixed sheet name for all FormDee forms
    const sheetName = 'FormDee Responses'
    // Escape sheet name with single quotes since it contains spaces
    const escapedSheetName = `'${sheetName}'`

    // Clear all data except the first row (headers)
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${escapedSheetName}!2:1000000`,
    })

    logger.info(`[Google Sheets] Cleared data from sheet: ${sheetName}`)

    return { success: true }
  } catch (error: any) {
    logger.error('[Google Sheets] Failed to clear sheet data:', error)

    return {
      success: false,
      error: `Failed to clear sheet data: ${error.message}`,
    }
  }
}

/**
 * Create a new Google Spreadsheet
 */
async function createNewSpreadsheet(
  title: string,
  userAuth: UserAuthOptions
): Promise<{ spreadsheetId?: string; spreadsheetUrl?: string; error?: string }> {
  try {
    const sheets = await getSheetsClientWithUserAuth(userAuth)

    const response = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: title,
        },
        sheets: [
          {
            properties: {
              title: 'FormDee Responses',
            },
          },
        ],
      },
    })

    if (response.data && response.data.spreadsheetId) {
      const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${response.data.spreadsheetId}/edit`
      logger.info(`[Google Sheets] Created new spreadsheet: ${title} (${spreadsheetUrl})`)
      return {
        spreadsheetId: response.data.spreadsheetId,
        spreadsheetUrl: spreadsheetUrl,
      }
    } else {
      return { error: 'Failed to create spreadsheet' }
    }
  } catch (error: any) {
    logger.error('[Google Sheets] Failed to create spreadsheet:', error)
    return { error: `Failed to create spreadsheet: ${error.message}` }
  }
}

/**
 * Export existing response data from Supabase to Google Sheets
 */
export async function exportResponsesToGoogleSheets(
  spreadsheetUrl: string,
  headers: string[],
  responseData: any[],
  userAuth: UserAuthOptions
): Promise<GoogleSheetsResult & { newSpreadsheetUrl?: string }> {
  try {
    const sheets = await getSheetsClientWithUserAuth(userAuth)

    let spreadsheetId = extractSpreadsheetId(spreadsheetUrl)
    let actualSpreadsheetUrl = spreadsheetUrl
    let createdNewSpreadsheet = false

    if (!spreadsheetId) {
      return {
        success: false,
        error: 'Invalid Google Sheets URL format',
      }
    }

    // Fixed sheet name for all FormDee forms
    const sheetName = 'FormDee Responses'

    // Escape sheet name with single quotes since it contains spaces
    const escapedSheetName = `'${sheetName}'`

    // First, check if the spreadsheet exists
    try {
      await sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'properties.title',
      })
    } catch (error: any) {
      if (error.code === 404) {
        // Spreadsheet not found, create a new one
        logger.info(`[Google Sheets] Spreadsheet not found, creating new one: FormDee Responses`)
        const newSpreadsheet = await createNewSpreadsheet('FormDee Responses', userAuth)

        if (newSpreadsheet.error) {
          return {
            success: false,
            error: newSpreadsheet.error,
          }
        }

        if (newSpreadsheet.spreadsheetId && newSpreadsheet.spreadsheetUrl) {
          spreadsheetId = newSpreadsheet.spreadsheetId
          actualSpreadsheetUrl = newSpreadsheet.spreadsheetUrl
          createdNewSpreadsheet = true
        } else {
          return {
            success: false,
            error: 'Failed to create new spreadsheet',
          }
        }
      } else {
        throw error
      }
    }

    // Check if sheet exists, create if needed
    try {
      await sheets.spreadsheets.get({
        spreadsheetId,
        ranges: [`${escapedSheetName}!A1:A1`],
      })

      // Sheet exists, clear existing data if we didn't create a new spreadsheet
      if (!createdNewSpreadsheet) {
        const clearResult = await clearSheetDataWithUser(actualSpreadsheetUrl, userAuth)
        if (!clearResult.success) {
          return clearResult
        }
      }
    } catch (error: any) {
      if (error.code === 400 && error.message.includes('Unable to parse range')) {
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

    // Set headers
    const headerRange = `${escapedSheetName}!1:1`
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: headerRange,
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers],
      },
    })

    // If there's no response data, just return success
    if (!responseData || responseData.length === 0) {
      logger.info(`[Google Sheets] Headers set, no existing response data to export`)
      return { success: true, rowsAppended: 0 }
    }

    // Batch insert all response data
    const dataRange = `${escapedSheetName}!A2:Z${responseData.length + 1}`
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: dataRange,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: responseData,
      },
    })

    const rowsExported = responseData.length
    logger.info(
      `[Google Sheets] Successfully exported ${rowsExported} existing response(s) to sheet: ${sheetName}`
    )

    const result: GoogleSheetsResult & { newSpreadsheetUrl?: string } = {
      success: true,
      rowsAppended: rowsExported,
    }

    if (createdNewSpreadsheet) {
      result.newSpreadsheetUrl = actualSpreadsheetUrl
    }

    return result
  } catch (error: any) {
    logger.error('[Google Sheets] Failed to export responses:', error)

    if (error.code === 403) {
      return {
        success: false,
        error: 'Permission denied. You need edit access to this spreadsheet.',
      }
    } else if (error.code === 404) {
      return {
        success: false,
        error: 'Spreadsheet not found.',
      }
    } else if (error.message.includes('authentication')) {
      return {
        success: false,
        error: 'Authentication failed. Please re-authenticate with Google.',
      }
    } else {
      return {
        success: false,
        error: `Failed to export responses: ${error.message}`,
      }
    }
  }
}
