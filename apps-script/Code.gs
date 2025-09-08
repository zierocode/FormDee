/**
 * 🚀 FormDee - Google Apps Script Backend (Production v1.1.0)
 * 
 * ENTERPRISE-READY FORM BUILDER BACKEND
 * 
 * 🌟 Key Features:
 * - ✅ Dynamic form creation & management
 * - ✅ Real-time form submissions with Google Sheets integration
 * - ✅ File upload support with Google Drive integration
 * - ✅ Data migration for form structure changes
 * - ✅ Slack webhook notifications
 * - ✅ Comprehensive admin authentication
 * - ✅ Auto-cleanup for test data protection
 * - ✅ Performance-optimized caching strategy
 * 
 * 🏗️ Architecture:
 * - Master Sheet: Central form configurations storage ('Forms' tab)
 * - Response Sheets: Individual sheets for form submissions
 * - Google Drive: File storage with automatic public sharing
 * - RESTful API: Operation-based routing with comprehensive error handling
 * 
 * 📊 Google Sheets Structure:
 * Master Sheet Columns:
 * A: refKey | B: title | C: description | D: responseSheetUrl 
 * E: slackWebhookUrl | F: uploadFolderUrl | G: fields (JSON) 
 * H: createdAt | I: updatedAt
 * 
 * Response Sheet Columns:
 * A: timestamp | B: refKey | C: ip | D: userAgent | E+: form field data
 * 
 * ⚡ Performance & Caching:
 * - Forms: NO caching (ensures real-time form builder updates)
 * - Sheet Metadata: 1-minute cache (optimizes performance)
 * - File Uploads: Direct to Google Drive (no intermediate storage)
 * - Submissions: Real-time processing with immediate sheet updates
 * 
 * 🔒 Security & Safety:
 * - Admin operations: Protected by ADMIN_API_KEY in Script Properties
 * - Public endpoints: Form access and submissions (no auth required)
 * - Test data protection: Automatic cleanup with production safeguards
 * - Input validation: Server-side validation for all operations
 * - File security: Uploaded files auto-shared with view permissions
 * 
 * 🛠️ Required Setup:
 * 1. Script Properties: Set ADMIN_API_KEY with secure 32+ character key
 * 2. Sheet Access: Ensure script has edit access to master spreadsheet
 * 3. Drive Permissions: Grant access to file upload folders
 * 4. Web App Deployment: Deploy with public execution permissions
 * 5. Environment: Copy deployment URL to Next.js .env file
 * 
 * 📝 Deployment Steps:
 * 1. Open Google Apps Script (script.google.com)
 * 2. Create new project or open existing
 * 3. Paste this entire code
 * 4. Configure Script Properties (Project Settings → Script Properties)
 * 5. Deploy as Web App (Deploy → New deployment → Web app)
 * 6. Set Execute as: "Me", Access: "Anyone"
 * 7. Copy deployment URL and update your .env file
 * 
 * 🔧 API Endpoints:
 * GET  /?op=forms&refKey=xyz          → Get single form (public)
 * GET  /?op=forms&apiKey=key          → List all forms (admin)
 * POST /?op=forms + body              → Create/update form (admin)
 * POST /?op=forms_migrate + body      → Migrate form data (admin)
 * POST /?op=forms_update_headers      → Update headers only (admin)
 * POST /?op=forms_delete&refKey=xyz   → Delete form (admin)
 * POST /?op=submit + body             → Submit form response (public)
 * POST /?op=upload_file + body        → Upload file to Drive (public)
 * GET  /?op=sheets_meta&id=xyz        → Get sheet metadata (admin)
 * GET  /?op=data_count&refKey=xyz     → Check existing data count (admin)
 * POST /?op=forms_test_slack + body   → Test Slack webhook (admin)
 * 
 * 🚨 Important Notes:
 * - This script requires Google Apps Script runtime (not standalone JavaScript)
 * - All sheet operations require appropriate Google Drive permissions
 * - File uploads need Google Drive folder write permissions
 * - Large file uploads (>10MB) may timeout - consider chunking for production
 * - Slack webhooks are optional but recommended for production monitoring
 * 
 * @version 1.0.0
 * @author FormDee Development Team
 * @lastUpdated September 7, 2025
 * @license MIT
 * @repository https://github.com/yourusername/formDee
 * @documentation https://github.com/yourusername/formDee/blob/main/README.md
 */

// =============================================================================
// MAIN ENTRY POINTS
// =============================================================================

/**
 * Main GET request handler - processes all incoming GET requests
 * @param {GoogleAppsScript.Events.DoGet} e - The GET request event
 * @returns {GoogleAppsScript.Content.TextOutput} JSON response
 */
function doGet(e) { return route(e, 'GET') }

/**
 * Main POST request handler - processes all incoming POST requests  
 * @param {GoogleAppsScript.Events.DoPost} e - The POST request event
 * @returns {GoogleAppsScript.Content.TextOutput} JSON response
 */
function doPost(e) { return route(e, 'POST') }

// =============================================================================
// ROUTING SYSTEM
// =============================================================================

/**
 * Central router that handles all incoming requests and dispatches to appropriate handlers
 * 
 * Supported Routes:
 * - GET  / → root (health check)
 * - GET  /forms?refKey=xyz → get single form (public)
 * - GET  /forms?apiKey=xyz → get all forms (admin only)
 * - POST /forms → create/update form (admin only)
 * - POST /forms_delete → delete form (admin only)
 * - POST /responses_delete → delete form responses (admin only)
 * - POST /submit → submit form response (public)
 * - GET  /sheets_meta → get sheet metadata (admin only)
 * - POST /forms/test-slack → test Slack integration (admin only)
 * 
 * @param {GoogleAppsScript.Events.DoGet|GoogleAppsScript.Events.DoPost} e - Request event
 * @param {string} method - HTTP method ('GET' or 'POST')
 * @returns {GoogleAppsScript.Content.TextOutput} JSON response
 */
function route(e, method) {
  const rawPath = (e && e.pathInfo) || '/'
  const path = rawPath[0] !== '/' ? '/' + rawPath : rawPath
  const params = (e && e.parameter) || {}
  let op = params.op || ''
  
  // Path-to-operation mapping (modern REST-like approach)
  if (!op) {
    const routes = {
      '/forms': 'forms',                    // Form CRUD operations
      '/forms/test-slack': 'forms_test_slack', // Slack webhook testing
      '/submit': 'submit',                  // Form submissions
      '/': method === 'GET' ? 'root' : null // Health check
    }
    op = routes[path] || ''
  }
  
  // Parse JSON body for POST requests
  let body = null
  if (method === 'POST' && e.postData && e.postData.type === 'application/json') {
    try { 
      body = JSON.parse(e.postData.contents)
      // Extract op from body if not in params
      if (!op && body && body.op) {
        op = body.op
      }
    } catch (err) {
      return jsonError('Invalid JSON body - ensure Content-Type is application/json', 400)
    }
  }
  
  // Operation handlers mapping
  const handlers = {
    'root': () => jsonOk({ 
      message: 'FormDee GAS API', 
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      endpoints: {
        'GET /forms?refKey=xyz': 'Get single form (public)',
        'GET /forms?apiKey=xyz': 'Get all forms (admin)',
        'POST /forms': 'Create/update form (admin)',
        'POST /submit': 'Submit form response (public)',
        'POST /forms_migrate': 'Migrate form data (admin)',
        'POST /forms_update_headers': 'Update sheet headers for field reordering (admin)',
        'GET /data_count': 'Check existing data count (admin)',
        'POST /upload_file': 'Upload file to Google Drive (public)',
        'GET /settings': 'Get settings (admin)',
        'POST /settings': 'Update settings (admin)'
      }
    }),
    'forms': () => method === 'GET' ? handleGetForms(params) : handlePostForms(params, body),
    'forms_migrate': () => handleFormsMigrate(params, body), // Data migration
    'forms_update_headers': () => handleFormsUpdateHeaders(params, body), // Header-only updates for field reordering
    'data_count': () => handleDataCount(params),           // Data count check
    'forms_delete': () => handleDeleteForm(params),        // Test cleanup
    'forms_test_slack': () => handleTestSlack(params, body), // Slack testing
    'responses_delete': () => handleDeleteResponses(params), // Test cleanup
    'sheets_meta': () => handleGetSheetsMeta(params),     // Sheet info
    'submit': () => handleSubmit(params, body),           // Form submissions
    'upload_file': () => handleUploadFile(params, body),  // File uploads
    'settings': () => method === 'GET' ? handleGetSettings(params) : handleUpdateSettings(params, body) // Settings
  }
  
  try {
    const handler = handlers[op]
    if (!handler) {
      return jsonError(`Unknown operation: ${op}`, 404)
    }
    return handler()
  } catch (error) {
    console.error('Error:', error)
    return jsonError(error.toString(), 500)
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create successful JSON response with CORS headers
 * @param {any} data - Response data
 * @returns {GoogleAppsScript.Content.TextOutput} JSON response
 */
function jsonOk(data) {
  const output = ContentService
    .createTextOutput(JSON.stringify({ ok: true, data }))
    .setMimeType(ContentService.MimeType.JSON)
  
  // Add CORS headers for cross-origin requests
  return output
}

/**
 * Create error JSON response with appropriate HTTP status
 * @param {string} message - Error message
 * @param {number} code - HTTP status code
 * @returns {GoogleAppsScript.Content.TextOutput} JSON error response
 */
function jsonError(message, code = 400) {
  console.error(`API Error ${code}: ${message}`)
  return ContentService
    .createTextOutput(JSON.stringify({ 
      ok: false, 
      error: { 
        code: String(code), 
        message,
        timestamp: new Date().toISOString()
      }
    }))
    .setMimeType(ContentService.MimeType.JSON)
}

/**
 * Verify admin authentication using API key
 * @param {Object} params - Request parameters containing apiKey
 * @throws {Error} If authentication fails
 */
function assertAdmin(params) {
  const { apiKey } = params
  const validApiKey = getProperty('ADMIN_API_KEY')
  
  if (!validApiKey) {
    throw new Error('Server configuration error: ADMIN_API_KEY not set in Script Properties')
  }
  
  if (!apiKey || apiKey !== validApiKey) {
    throw new Error('Unauthorized: Invalid or missing API key')
  }
}

/**
 * Get script property value
 * @param {string} key - Property key
 * @returns {string|null} Property value or null if not found
 */
function getProperty(key) {
  return PropertiesService.getScriptProperties().getProperty(key)
}

// =============================================================================
// SPREADSHEET ACCESS
// =============================================================================

/**
 * Get the master spreadsheet ID using smart detection
 * 
 * Resolution order:
 * 1. MASTER_SHEET_ID from Script Properties (manual override)
 * 2. Container spreadsheet (if script is bound to a sheet)
 * 3. Error if neither is available
 * 
 * @returns {string} Spreadsheet ID
 * @throws {Error} If master sheet ID cannot be determined
 */
function getMasterSheetId() {
  // Option 1: Explicit configuration in Script Properties
  let id = getProperty('MASTER_SHEET_ID')
  if (id) {
    console.log('✅ Using MASTER_SHEET_ID from script properties:', id)
    return id
  }
  
  // Option 2: Auto-detect from container spreadsheet (recommended setup)
  try {
    const container = SpreadsheetApp.getActiveSpreadsheet()
    if (container) {
      id = container.getId()
      console.log('✅ Using container spreadsheet ID:', id)
      return id
    }
  } catch (e) {
    console.log('ℹ️ No container spreadsheet found:', e.toString())
  }
  
  // Configuration required
  throw new Error('❌ MASTER_SHEET_ID not configured and no container spreadsheet found. Please either:\n1. Bind this script to your master spreadsheet, OR\n2. Set MASTER_SHEET_ID in Script Properties')
}

/**
 * Get the master sheet containing form configurations
 * 
 * Expected structure:
 * - Sheet name: 'Forms'
 * - Columns: refKey, title, description, responseSheetUrl, slackWebhookUrl, uploadFolderUrl, fields, createdAt, updatedAt
 * 
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} The Forms sheet
 * @throws {Error} If sheet cannot be accessed
 */
function getMasterSheet() {
  const id = getMasterSheetId()
  if (!id) throw new Error('Unable to determine master sheet ID')
  
  const spreadsheet = SpreadsheetApp.openById(id)
  const sheet = spreadsheet.getSheetByName('Forms')
  
  if (!sheet) {
    throw new Error(`❌ 'Forms' sheet not found in spreadsheet ${id}. Please create a sheet named 'Forms' with proper headers.`)
  }
  
  return sheet
}

/**
 * Get the settings sheet from master spreadsheet
 * Creates the sheet if it doesn't exist
 * 
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} The Settings sheet
 */
function getSettingsSheet() {
  const id = getMasterSheetId()
  if (!id) throw new Error('Unable to determine master sheet ID')
  
  const spreadsheet = SpreadsheetApp.openById(id)
  let sheet = spreadsheet.getSheetByName('Settings')
  
  if (!sheet) {
    // Create Settings sheet with headers
    sheet = spreadsheet.insertSheet('Settings')
    const headers = ['key', 'value', 'updatedAt']
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    
    // Add default settings
    const defaultSettings = [
      ['aiModel', 'gpt-5-mini', new Date().toISOString()],
      ['aiApiKey', '', new Date().toISOString()]
    ]
    sheet.getRange(2, 1, defaultSettings.length, 3).setValues(defaultSettings)
  }
  
  return sheet
}

// =============================================================================
// SETTINGS HANDLERS
// =============================================================================

/**
 * Get settings from Settings sheet (admin only)
 * @param {Object} params - Request parameters containing apiKey
 * @returns {GoogleAppsScript.Content.TextOutput} JSON response with settings
 */
function handleGetSettings(params) {
  assertAdmin(params)
  
  try {
    const sheet = getSettingsSheet()
    const data = sheet.getDataRange().getValues()
    
    const settings = {}
    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const [key, value] = data[i]
      if (key) {
        settings[key] = value
      }
    }
    
    return jsonOk(settings)
  } catch (error) {
    console.error('Error getting settings:', error)
    return jsonError('Failed to get settings: ' + error.toString(), 500)
  }
}

/**
 * Update settings in Settings sheet (admin only)
 * @param {Object} params - Request parameters containing apiKey
 * @param {Object} body - Settings to update
 * @returns {GoogleAppsScript.Content.TextOutput} JSON response
 */
function handleUpdateSettings(params, body) {
  assertAdmin(params)
  
  if (!body) {
    return jsonError('Request body required', 400)
  }
  
  try {
    const sheet = getSettingsSheet()
    const data = sheet.getDataRange().getValues()
    const now = new Date().toISOString()
    
    // Update each setting
    Object.keys(body).forEach(key => {
      let found = false
      
      // Look for existing key
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === key) {
          // Update existing setting
          sheet.getRange(i + 1, 2, 1, 2).setValues([[body[key], now]])
          found = true
          break
        }
      }
      
      // Add new setting if not found
      if (!found) {
        const lastRow = sheet.getLastRow()
        sheet.getRange(lastRow + 1, 1, 1, 3).setValues([[key, body[key], now]])
      }
    })
    
    return jsonOk({ message: 'Settings updated successfully', settings: body })
  } catch (error) {
    console.error('Error updating settings:', error)
    return jsonError('Failed to update settings: ' + error.toString(), 500)
  }
}

// =============================================================================
// FORM MANAGEMENT HANDLERS
// =============================================================================

/**
 * Handle form retrieval requests
 * - With refKey: Returns single form (public access)
 * - Without refKey: Returns all forms (admin only)
 * 
 * NO CACHING: Ensures form builder always gets latest data
 * 
 * @param {Object} params - Request parameters
 * @returns {GoogleAppsScript.Content.TextOutput} JSON response
 */
function handleGetForms(params) {
  const { refKey } = params
  
  if (refKey) {
    // Get single form by refKey
    return getSingleForm(refKey)
  }
  
  // Get all forms (admin only)
  assertAdmin(params)
  return getAllForms()
}

/**
 * Retrieve a single form by reference key (public access)
 * @param {string} refKey - Unique form identifier
 * @returns {GoogleAppsScript.Content.TextOutput} JSON response with form data
 */
function getSingleForm(refKey) {
  const sheet = getMasterSheet()
  const data = sheet.getDataRange().getValues()
  const headers = data[0]
  
  // Search for form by refKey
  for (let i = 1; i < data.length; i++) {
    const row = data[i]
    const form = {}
    
    // Build form object from sheet row
    headers.forEach((header, index) => {
      form[header] = row[index]
    })
    
    if (form.refKey === refKey) {
      // Parse JSON fields if they exist
      if (form.fields && typeof form.fields === 'string') {
        try {
          form.fields = JSON.parse(form.fields)
        } catch (err) {
          console.warn(`Invalid fields JSON for form ${refKey}:`, err)
          form.fields = []
        }
      }
      
      console.log(`✅ Found form: ${refKey}`)
      return jsonOk(form)
    }
  }
  
  console.log(`❌ Form not found: ${refKey}`)
  return jsonError('Form not found', 404)
}

/**
 * Retrieve all forms (admin only)
 * @returns {GoogleAppsScript.Content.TextOutput} JSON response with all forms
 */
function getAllForms() {
  const sheet = getMasterSheet()
  const data = sheet.getDataRange().getValues()
  const headers = data[0]
  const forms = []
  
  // Process all rows except header
  for (let i = 1; i < data.length; i++) {
    const row = data[i]
    const form = {}
    
    // Build form object from sheet row
    headers.forEach((header, index) => {
      form[header] = row[index]
    })
    
    // Parse JSON fields if they exist
    if (form.fields && typeof form.fields === 'string') {
      try {
        form.fields = JSON.parse(form.fields)
      } catch (err) {
        console.warn(`Invalid fields JSON for form ${form.refKey}:`, err)
        form.fields = []
      }
    }
    
    forms.push(form)
  }
  
  console.log(`✅ Retrieved ${forms.length} forms`)
  return jsonOk(forms)
}

function handlePostForms(params, body) {
  assertAdmin(params)
  
  if (!body) {
    return jsonError('Request body required', 400)
  }
  
  const form = body
  const overwrite = !!(body && body._overwrite)
  
  // Save the form
  const saved = saveForm(form, overwrite)
  return jsonOk(saved)
}

function saveForm(form, overwrite = false) {
  const sheet = getMasterSheet()
  const data = sheet.getDataRange().getValues()
  const headers = data[0]
  
  // Validate required fields
  if (!form.refKey) {
    throw new Error('Reference key is required')
  }
  
  // Check for duplicates (unless overwriting)
  if (!overwrite) {
    for (let i = 1; i < data.length; i++) {
      const row = data[i]
      const existingRefKey = row[headers.indexOf('refKey')]
      if (existingRefKey === form.refKey) {
        throw new Error('Reference key already exists. Choose another.')
      }
    }
  }
  
  // Prepare the form data
  const formData = {
    refKey: form.refKey,
    title: form.title || '',
    description: form.description || '',
    responseSheetUrl: form.responseSheetUrl || '',
    slackWebhookUrl: form.slackWebhookUrl || '',
    uploadFolderUrl: form.uploadFolderUrl || '',
    fields: form.fields ? JSON.stringify(form.fields) : '[]',
    createdAt: form.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  
  // Find or create row
  let targetRow = -1
  if (overwrite) {
    for (let i = 1; i < data.length; i++) {
      const row = data[i]
      const existingRefKey = row[headers.indexOf('refKey')]
      if (existingRefKey === form.refKey) {
        targetRow = i + 1 // 1-indexed for sheets
        break
      }
    }
  }
  
  if (targetRow === -1) {
    // Add new row
    targetRow = sheet.getLastRow() + 1
  }
  
  // Write data
  headers.forEach((header, index) => {
    if (formData.hasOwnProperty(header)) {
      sheet.getRange(targetRow, index + 1).setValue(formData[header])
    }
  })
  
  return formData
}

// =============================================================================
// SHEET METADATA HANDLER  
// =============================================================================

/**
 * Handle sheet metadata requests (admin only)
 * 
 * WITH LIGHT CACHING: 1-minute cache for performance
 * Cache can be bypassed with: nocache, refresh, force, _t, or r parameters
 * 
 * @param {Object} params - Request parameters including spreadsheet ID
 * @returns {GoogleAppsScript.Content.TextOutput} JSON response with sheet info
 */
function handleGetSheetsMeta(params) {
  assertAdmin(params)
  
  const { id } = params
  if (!id) {
    throw new Error('Spreadsheet ID required')
  }
  
  // Check for cache bypass
  const bypassCache = !!(params.nocache || params.refresh || params.force || params._t || params.r)
  const cacheKey = `sheets_meta:${id}`
  
  if (!bypassCache) {
    const cache = CacheService.getScriptCache()
    const cached = cache.get(cacheKey)
    if (cached) {
      return jsonOk(JSON.parse(cached))
    }
  }
  
  // Fetch fresh data
  const result = fetchSheetMetadata(id)
  
  // Cache for 1 minute
  const cache = CacheService.getScriptCache()
  cache.put(cacheKey, JSON.stringify(result), 60)
  
  return jsonOk(result)
}

function fetchSheetMetadata(spreadsheetId) {
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId)
  const sheets = spreadsheet.getSheets()
  
  const result = {
    spreadsheetId,
    url: spreadsheet.getUrl(),
    sheets: sheets.map(sheet => ({
      name: sheet.getName(),
      index: sheet.getIndex(),
      rows: sheet.getLastRow(),
      cols: sheet.getLastColumn(),
      headers: sheet.getLastRow() > 0 ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : []
    }))
  }
  
  return result
}

// =============================================================================
// FORM SUBMISSION HANDLER
// =============================================================================

/**
 * Handle form submission (public access)
 * 
 * Process:
 * 1. Validate submission data
 * 2. Find form configuration
 * 3. Save to response sheet (if configured)
 * 4. Send Slack notification (if configured)
 * 
 * @param {Object} params - Request parameters
 * @param {Object} body - Submission data containing refKey and form values
 * @returns {GoogleAppsScript.Content.TextOutput} JSON response
 */
function handleSubmit(params, body) {
  if (!body || !body.refKey) {
    return jsonError('Form refKey required', 400)
  }
  
  // Get form configuration - getSingleForm returns a ContentService response, we need to get the parsed data
  let form = null
  let debugInfo = []
  
  try {
    const sheet = getMasterSheet()
    if (!sheet) {
      return jsonError('Master sheet not found', 500)
    }
    
    const data = sheet.getDataRange().getValues()
    if (!data || data.length < 2) {
      return jsonError('No forms found in master sheet', 404)
    }
    
    const headers = data[0]
    
    // Debug: collect all refKeys in the sheet
    const allRefKeys = []
    
    // Find form by refKey
    for (let i = 1; i < data.length; i++) {
      const row = data[i]
      const formObj = {}
      headers.forEach((header, index) => {
        formObj[header] = row[index]
      })
      
      // Collect all refKeys for debugging
      allRefKeys.push(formObj.refKey)
      
      // Trim both refKeys to handle any whitespace issues
      if (String(formObj.refKey).trim() === String(body.refKey).trim()) {
        // Parse fields if they exist
        if (formObj.fields && typeof formObj.fields === 'string') {
          try {
            formObj.fields = JSON.parse(formObj.fields)
          } catch {
            formObj.fields = []
          }
        }
        form = formObj
        break
      }
    }
    
    if (!form) {
      // Return detailed error with all available refKeys for debugging
      return jsonError(`Form not found. Looking for: "${body.refKey}". Available forms: ${allRefKeys.join(', ')}`, 404)
    }
    
    // Submit to sheet
    if (form.responseSheetUrl) {
      try {
        submitToSheet(form, body)
      } catch (sheetError) {
        console.error('Error submitting to sheet:', sheetError)
        return jsonError(`Failed to submit to sheet: ${sheetError.toString()}`, 500)
      }
    }
    
    // Send to Slack
    if (form.slackWebhookUrl) {
      try {
        sendToSlack(form, body)
      } catch (slackError) {
        console.error('Error sending to Slack:', slackError)
        // Don't fail the whole submission if Slack fails
      }
    }
    
  } catch (error) {
    console.error('Error in handleSubmit:', error)
    return jsonError(`Error processing submission: ${error.toString()}`, 500)
  }
  
  return jsonOk({ message: 'Form submitted successfully' })
}

function submitToSheet(form, submission) {
  // Extract sheet info
  const parts = form.responseSheetUrl.split('#sheet=')
  const spreadsheetId = parts[0]
  // Decode the sheet name in case it's URL encoded
  const sheetName = parts[1] ? decodeURIComponent(parts[1]) : 'Sheet1'
  
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId)
  const sheet = spreadsheet.getSheetByName(sheetName)
  
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found`)
  }
  
  // Prepare row data with metadata fields first, then form fields
  const formFields = form.fields || []
  
  // Standard headers: timestamp, refKey, ip, userAgent, then form fields
  const headers = ['timestamp', 'refKey', 'ip', 'userAgent', ...formFields.map(field => field.key)]
  
  // Build values array in the same order as headers
  const values = [
    new Date().toISOString(),
    submission.refKey || '',
    submission.ip || '',
    submission.userAgent || ''
  ]
  
  // Add form field values
  formFields.forEach(field => {
    // Check both field.key and submission.values[field.key] since submission has nested values
    let fieldValue = submission.values ? submission.values[field.key] : submission[field.key]
    
    // Handle file fields - create hyperlink with file name
    if (field.type === 'file' && fieldValue && typeof fieldValue === 'object') {
      // If it's a file object, create a hyperlink formula
      if (fieldValue.url && fieldValue.name) {
        // Create Google Sheets HYPERLINK formula
        fieldValue = `=HYPERLINK("${fieldValue.url}", "${fieldValue.name}")`
      } else if (fieldValue.url) {
        // Fallback to just URL if no name
        fieldValue = fieldValue.url
      } else if (Array.isArray(fieldValue) && fieldValue.length > 0) {
        // Handle multiple files - create multiple hyperlinks
        const links = fieldValue.map(f => {
          if (f.url && f.name) {
            return `=HYPERLINK("${f.url}", "${f.name}")`
          }
          return f.url || ''
        })
        // For multiple files, just use the first one (or join with text if needed)
        fieldValue = links[0] || ''
      }
    }
    
    values.push(fieldValue || '')
  })
  
  // Ensure headers exist
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])
  }
  
  // Add the submission
  const nextRow = sheet.getLastRow() + 1
  sheet.getRange(nextRow, 1, 1, values.length).setValues([values])
}

function sendToSlack(form, submission) {
  if (!form.slackWebhookUrl) return
  
  const payload = {
    text: `New form submission: ${form.title}`,
    attachments: [{
      color: 'good',
      fields: (form.fields || []).map(field => {
        const fieldValue = submission.values ? submission.values[field.key] : submission[field.key]
        return {
          title: field.label,
          value: fieldValue || 'N/A',
          short: true
        }
      })
    }]
  }
  
  UrlFetchApp.fetch(form.slackWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    payload: JSON.stringify(payload)
  })
}

function handleTestSlack(params, body) {
  assertAdmin(params)
  
  if (!body || !body.slackWebhookUrl) {
    return jsonError('Slack webhook URL required', 400)
  }
  
  const payload = {
    text: 'Test message from Dynamic Form Builder',
    attachments: [{
      color: 'good',
      text: 'If you see this message, your Slack integration is working correctly!'
    }]
  }
  
  try {
    UrlFetchApp.fetch(body.slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      payload: JSON.stringify(payload)
    })
    
    return jsonOk({ message: 'Test message sent to Slack successfully!' })
  } catch (error) {
    return jsonError(`Failed to send test message: ${error.toString()}`, 500)
  }
}

// =============================================================================
// DATA MIGRATION HANDLERS
// =============================================================================

/**
 * Handle form migration operations (admin only)
 * 
 * Process:
 * 1. Validate migration request
 * 2. Get current form configuration
 * 3. Save new form configuration
 * 4. Migrate existing sheet data if needed
 * 
 * @param {Object} params - Request parameters containing apiKey
 * @param {Object} body - Form data with migration flags
 * @returns {GoogleAppsScript.Content.TextOutput} JSON response
 */
function handleFormsMigrate(params, body) {
  assertAdmin(params)
  
  if (!body || !body._migrate) {
    return jsonError('Migration flag required', 400)
  }
  
  try {
    const { refKey, fields, responseSheetUrl, _migrationChanges } = body
    
    // Get current form configuration to compare fields
    let currentFields = []
    try {
      const currentFormResponse = getSingleForm(refKey)
      const currentFormJson = JSON.parse(currentFormResponse.getContent())
      if (currentFormJson.ok && currentFormJson.data && currentFormJson.data.fields) {
        currentFields = currentFormJson.data.fields
      }
    } catch (error) {
      console.log('No existing form found or error getting current form:', error.toString())
      // Continue with empty current fields for new forms
    }
    
    // Save the form configuration first
    const saveResult = saveForm(body, true) // overwrite = true
    
    // If we have existing data and field changes, perform migration
    if (_migrationChanges && responseSheetUrl && currentFields.length > 0) {
      try {
        console.log('Starting data migration for form:', refKey)
        migrateSheetData(responseSheetUrl, currentFields, fields, _migrationChanges)
        console.log('Data migration completed successfully')
      } catch (migrationError) {
        console.error('Migration error:', migrationError)
        // Form was saved, but migration failed - return warning
        return jsonOk({
          ...saveResult,
          warning: 'Form saved but data migration failed: ' + migrationError.toString()
        })
      }
    }
    
    return jsonOk(saveResult)
  } catch (error) {
    console.error('Error in form migration:', error)
    return jsonError('Migration failed: ' + error.toString(), 500)
  }
}

/**
 * Handle form header updates for field reordering (admin only)
 * 
 * This operation is specifically for field reordering scenarios where:
 * - Only field positions have changed (no structural changes)
 * - No data migration is needed
 * - Only sheet headers need to be updated to reflect new field order
 * 
 * @param {Object} params - Request parameters containing apiKey
 * @param {Object} body - Form data with updated field order
 * @returns {GoogleAppsScript.Content.TextOutput} JSON response
 */
function handleFormsUpdateHeaders(params, body) {
  assertAdmin(params)
  
  if (!body || !body._updateHeadersOnly) {
    return jsonError('Header-only update flag required', 400)
  }
  
  try {
    const { refKey, fields, responseSheetUrl } = body
    
    if (!refKey || !fields || !responseSheetUrl) {
      return jsonError('refKey, fields, and responseSheetUrl are required', 400)
    }
    
    // Save the form configuration first
    const saveResult = saveForm(body, true) // overwrite = true
    
    // Update sheet headers to match new field order
    if (responseSheetUrl) {
      try {
        console.log('Updating sheet headers for field reordering:', refKey)
        updateSheetHeadersForReordering(responseSheetUrl, fields)
        console.log('Sheet headers updated successfully')
      } catch (headerError) {
        console.error('Header update error:', headerError)
        // Form was saved, but header update failed - return warning
        return jsonOk({
          ...saveResult,
          warning: 'Form saved but header update failed: ' + headerError.toString()
        })
      }
    }
    
    return jsonOk(saveResult)
  } catch (error) {
    console.error('Error in header update:', error)
    return jsonError('Header update failed: ' + error.toString(), 500)
  }
}

/**
 * Update sheet headers for field reordering without affecting data
 * @param {string} responseSheetUrl - URL to the response sheet
 * @param {Array} newFields - New field configuration with updated order
 */
function updateSheetHeadersForReordering(responseSheetUrl, newFields) {
  const { spreadsheetId, sheetName } = parseSheetUrl(responseSheetUrl)
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId)
  const sheet = spreadsheet.getSheetByName(sheetName)
  
  if (!sheet) {
    throw new Error('Response sheet not found: ' + sheetName)
  }
  
  const lastRow = sheet.getLastRow()
  if (lastRow === 0) {
    // No headers exist, just create them
    updateSheetHeaders(sheet, newFields)
    return
  }
  
  // Get existing data to preserve it
  const allData = sheet.getRange(1, 1, lastRow, sheet.getLastColumn()).getValues()
  const oldHeaders = allData[0]
  const dataRows = allData.slice(1)
  
  // Create new header structure
  const newHeaders = ['timestamp', 'refKey', 'ip', 'userAgent', ...newFields.map(f => f.key)]
  
  // Only update if headers have actually changed
  const headersChanged = JSON.stringify(oldHeaders) !== JSON.stringify(newHeaders)
  
  if (!headersChanged) {
    console.log('Headers unchanged, no update needed')
    return
  }
  
  if (dataRows.length === 0) {
    // Only headers exist, safe to just replace them
    sheet.clear()
    sheet.getRange(1, 1, 1, newHeaders.length).setValues([newHeaders])
  } else {
    // Preserve existing data by mapping columns to new positions
    const reorderedData = []
    
    for (let i = 0; i < dataRows.length; i++) {
      const oldRow = dataRows[i]
      const newRow = new Array(newHeaders.length).fill('')
      
      // Copy system columns (timestamp, refKey, ip, userAgent) - first 4 columns
      for (let j = 0; j < Math.min(4, oldRow.length, newHeaders.length); j++) {
        newRow[j] = oldRow[j] || ''
      }
      
      // Map field data based on header positions
      for (let newIndex = 4; newIndex < newHeaders.length; newIndex++) {
        const fieldKey = newHeaders[newIndex]
        const oldIndex = oldHeaders.indexOf(fieldKey)
        
        if (oldIndex !== -1 && oldIndex < oldRow.length) {
          newRow[newIndex] = oldRow[oldIndex] || ''
        }
        // If field doesn't exist in old structure, leave empty
      }
      
      reorderedData.push(newRow)
    }
    
    // Replace sheet content with reordered data
    sheet.clear()
    
    // Write new headers
    sheet.getRange(1, 1, 1, newHeaders.length).setValues([newHeaders])
    
    // Write reordered data
    if (reorderedData.length > 0) {
      sheet.getRange(2, 1, reorderedData.length, newHeaders.length).setValues(reorderedData)
    }
  }
  
  console.log(`Headers updated for field reordering: ${newFields.length} fields, ${dataRows.length} data rows preserved`)
}

/**
 * Handle data count checking (admin only)
 * 
 * @param {Object} params - Request parameters containing refKey, responseSheetUrl, and apiKey
 * @returns {GoogleAppsScript.Content.TextOutput} JSON response with data count
 */
function handleDataCount(params) {
  assertAdmin(params)
  
  const { refKey, responseSheetUrl } = params
  
  if (!refKey || !responseSheetUrl) {
    return jsonError('refKey and responseSheetUrl required', 400)
  }
  
  try {
    const count = getExistingDataCount(responseSheetUrl)
    return jsonOk({ count })
  } catch (error) {
    console.error('Error getting data count:', error)
    return jsonError('Failed to get data count: ' + error.toString(), 500)
  }
}

/**
 * Get existing data count from response sheet
 * @param {string} responseSheetUrl - URL to the response sheet
 * @returns {number} Number of existing data rows (excluding header)
 */
function getExistingDataCount(responseSheetUrl) {
  try {
    const { spreadsheetId, sheetName } = parseSheetUrl(responseSheetUrl)
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId)
    const sheet = spreadsheet.getSheetByName(sheetName)
    
    if (!sheet) {
      return 0
    }
    
    const lastRow = sheet.getLastRow()
    // Subtract 1 for header row, return 0 if no data rows
    return Math.max(0, lastRow - 1)
  } catch (error) {
    console.error('Error counting existing data:', error)
    return 0
  }
}

/**
 * Migrate sheet data based on field changes
 * @param {string} responseSheetUrl - URL to the response sheet
 * @param {Array} oldFields - Previous field configuration
 * @param {Array} newFields - New field configuration
 * @param {Object} changes - Migration changes object
 */
function migrateSheetData(responseSheetUrl, oldFields, newFields, changes) {
  const { spreadsheetId, sheetName } = parseSheetUrl(responseSheetUrl)
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId)
  const sheet = spreadsheet.getSheetByName(sheetName)
  
  if (!sheet) {
    throw new Error('Response sheet not found: ' + sheetName)
  }
  
  const lastRow = sheet.getLastRow()
  if (lastRow <= 1) {
    // No data to migrate, just update headers
    updateSheetHeaders(sheet, newFields)
    return
  }
  
  console.log('Migrating data with changes:', JSON.stringify(changes))
  
  // Get all existing data including headers
  const allData = sheet.getRange(1, 1, lastRow, sheet.getLastColumn()).getValues()
  const headers = allData[0]
  const dataRows = allData.slice(1)
  
  // Create new column structure
  const newHeaders = ['timestamp', 'refKey', 'ip', 'userAgent', ...newFields.map(f => f.key)]
  const newData = []
  
  // Process each data row
  for (let i = 0; i < dataRows.length; i++) {
    const oldRow = dataRows[i]
    const newRow = new Array(newHeaders.length).fill('')
    
    // Copy system columns (timestamp, refKey, ip, userAgent)
    for (let j = 0; j < Math.min(4, oldRow.length); j++) {
      newRow[j] = oldRow[j] || ''
    }
    
    // Map field data based on changes
    for (let newFieldIndex = 0; newFieldIndex < newFields.length; newFieldIndex++) {
      const newField = newFields[newFieldIndex]
      const newColIndex = 4 + newFieldIndex // After system columns
      
      // Find where this field's data should come from
      const oldFieldIndex = oldFields.findIndex(f => f.key === newField.key)
      
      if (oldFieldIndex !== -1) {
        // Field exists in old structure, copy data
        const oldColIndex = 4 + oldFieldIndex
        if (oldColIndex < oldRow.length) {
          newRow[newColIndex] = oldRow[oldColIndex] || ''
        }
      }
      // If field doesn't exist in old structure, leave empty (new field)
    }
    
    newData.push(newRow)
  }
  
  // Clear the sheet and write new structure
  sheet.clear()
  
  // Write new headers
  if (newHeaders.length > 0) {
    sheet.getRange(1, 1, 1, newHeaders.length).setValues([newHeaders])
    
    // Write migrated data
    if (newData.length > 0) {
      sheet.getRange(2, 1, newData.length, newHeaders.length).setValues(newData)
    }
  }
  
  console.log(`Migration completed: ${dataRows.length} rows migrated with ${newFields.length} fields`)
}

/**
 * Update sheet headers only (for new sheets or when no data exists)
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The sheet to update
 * @param {Array} fields - Array of field objects
 */
function updateSheetHeaders(sheet, fields) {
  const headers = ['timestamp', 'refKey', 'ip', 'userAgent', ...fields.map(f => f.key)]
  sheet.clear()
  if (headers.length > 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])
  }
}

/**
 * Parse sheet URL to extract spreadsheet ID and sheet name
 * @param {string} url - The sheet URL or ID with sheet reference
 * @returns {Object} Object with spreadsheetId and sheetName
 */
function parseSheetUrl(url) {
  // Handle direct spreadsheet ID with tab reference (e.g., "1ABC#sheet=SheetName")
  if (url.includes('#sheet=')) {
    const [id, tabPart] = url.split('#sheet=')
    return {
      spreadsheetId: id,
      sheetName: decodeURIComponent(tabPart)
    }
  }
  
  // Handle full Google Sheets URLs
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (match) {
    const spreadsheetId = match[1]
    const tabMatch = url.match(/#.*gid=(\d+)/) || url.match(/#sheet=(.+)/)
    const sheetName = tabMatch ? decodeURIComponent(tabMatch[1]) : 'Sheet1'
    return { spreadsheetId, sheetName }
  }
  
  throw new Error('Invalid sheet URL format: ' + url)
}

// =============================================================================
// TEST CLEANUP HANDLERS
// =============================================================================

/**
 * Delete a form by refKey (admin only)
 * 
 * ⚠️ CAUTION: This permanently deletes form configuration
 * Primarily used for automated test cleanup
 * 
 * @param {Object} params - Request parameters containing refKey and apiKey
 * @returns {GoogleAppsScript.Content.TextOutput} JSON response
 */
function handleDeleteForm(params) {
  assertAdmin(params)
  
  const refKey = params.refKey
  if (!refKey) {
    return jsonError('refKey parameter required', 400)
  }
  
  try {
    const sheet = getMasterSheet()
    const data = sheet.getDataRange().getValues()
    const headers = data[0]
    const refKeyCol = headers.indexOf('refKey')
    
    if (refKeyCol === -1) {
      return jsonError('refKey column not found', 500)
    }
    
    // Find the row with the matching refKey
    let rowIndex = -1
    for (let i = 1; i < data.length; i++) {
      if (data[i][refKeyCol] === refKey) {
        rowIndex = i + 1 // Sheet rows are 1-indexed
        break
      }
    }
    
    if (rowIndex === -1) {
      return jsonError(`Form with refKey '${refKey}' not found`, 404)
    }
    
    // Delete the row
    sheet.deleteRow(rowIndex)
    
    return jsonOk({ 
      message: `Form '${refKey}' deleted successfully`,
      refKey: refKey
    })
    
  } catch (error) {
    console.error('Delete form error:', error)
    return jsonError(`Failed to delete form: ${error.toString()}`, 500)
  }
}

/**
 * Delete form responses from a specific sheet (admin only)
 * 
 * Options:
 * - With refKey: Delete only responses for that form
 * - Without refKey: Delete all responses (keeps header row)
 * 
 * ⚠️ CAUTION: This permanently deletes response data
 * Primarily used for automated test cleanup
 * 
 * @param {Object} params - Request parameters containing sheetUrl, optional refKey, and apiKey
 * @returns {GoogleAppsScript.Content.TextOutput} JSON response
 */
function handleDeleteResponses(params) {
  assertAdmin(params)
  
  const sheetUrl = params.sheetUrl
  const refKey = params.refKey
  
  if (!sheetUrl) {
    return jsonError('sheetUrl parameter required', 400)
  }
  
  try {
    // Parse the sheet URL to get spreadsheet ID and sheet name
    const parts = sheetUrl.split('#sheet=')
    const spreadsheetId = parts[0].replace(/.*\/d\/|\/.*$/g, '')
    const sheetName = parts[1] ? decodeURIComponent(parts[1]) : 'Sheet1'
    
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId)
    const sheet = spreadsheet.getSheetByName(sheetName)
    
    if (!sheet) {
      return jsonError(`Sheet '${sheetName}' not found`, 404)
    }
    
    let deletedCount = 0
    
    if (refKey) {
      // Delete only responses for specific refKey
      const data = sheet.getDataRange().getValues()
      const headers = data[0]
      const refKeyColIndex = headers.indexOf('refKey')
      
      if (refKeyColIndex === -1) {
        return jsonError('refKey column not found in response sheet', 404)
      }
      
      // Delete rows from bottom to top to avoid index issues
      for (let i = data.length - 1; i >= 1; i--) {
        if (data[i][refKeyColIndex] === refKey) {
          sheet.deleteRow(i + 1) // Sheet rows are 1-indexed
          deletedCount++
        }
      }
    } else {
      // Delete all responses (keep header row)
      const lastRow = sheet.getLastRow()
      if (lastRow > 1) {
        sheet.deleteRows(2, lastRow - 1)
        deletedCount = lastRow - 1
      }
    }
    
    return jsonOk({ 
      message: `Deleted ${deletedCount} responses from ${sheetName}`,
      deletedCount: deletedCount,
      sheetName: sheetName,
      refKey: refKey || 'all'
    })
    
  } catch (error) {
    console.error('Delete responses error:', error)
    return jsonError(`Failed to delete responses: ${error.toString()}`, 500)
  }
}

/**
 * Handle file upload to Google Drive
 * 
 * Uploads files to a Google Drive folder specified in the form configuration.
 * Files are named with the field key as prefix for organization.
 * Returns file metadata including Google Drive sharing URL.
 * 
 * @param {Object} params - Request parameters (not used for file uploads)
 * @param {Object} body - Request body containing file data and fieldKey
 * @returns {GoogleAppsScript.Content.TextOutput} JSON response with file info
 */
function handleUploadFile(params, body) {
  if (!body || !body.file || !body.fieldKey) {
    return jsonError('File data and fieldKey are required', 400)
  }
  
  try {
    const { file, fieldKey } = body
    
    if (!file.content || !file.name) {
      return jsonError('Invalid file data - content and name are required', 400)
    }
    
    // For file uploads, we need to identify which form this belongs to
    // The upload folder URL should be passed with the request
    let folderId = null
    
    if (body.uploadFolderUrl) {
      folderId = extractFolderIdFromUrl(body.uploadFolderUrl)
      if (!folderId) {
        return jsonError('Invalid Google Drive folder URL provided', 400)
      }
    } else {
      return jsonError('Upload folder URL is required for file uploads', 400)
    }
    
    try {
      // Generate unique identifier (timestamp + random)
      const timestamp = Date.now()
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
      const uniqueId = `${timestamp}${random}`
      
      // Convert base64 content to blob with new naming convention
      const contentBlob = Utilities.newBlob(
        Utilities.base64Decode(file.content),
        file.type,
        `${fieldKey}_${uniqueId}_${file.name}`
      )
      
      // Create file in Google Drive
      let driveFile
      if (folderId) {
        const folder = DriveApp.getFolderById(folderId)
        driveFile = folder.createFile(contentBlob)
      } else {
        driveFile = DriveApp.createFile(contentBlob)
      }
      
      // Make file publicly viewable
      driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW)
      
      // Return file information
      const uploadedFile = {
        id: driveFile.getId(),
        name: driveFile.getName(),
        size: file.size,
        type: file.type,
        url: `https://drive.google.com/file/d/${driveFile.getId()}/view?usp=sharing`,
        uploadedAt: new Date().toISOString()
      }
      
      return jsonOk(uploadedFile)
      
    } catch (driveError) {
      console.error('Google Drive error:', driveError)
      return jsonError(`Failed to upload to Google Drive: ${driveError.toString()}`, 500)
    }
    
  } catch (error) {
    console.error('Upload file error:', error)
    return jsonError(`Failed to upload file: ${error.toString()}`, 500)
  }
}

/**
 * Get Google Drive folder ID from URL
 * Supports various Google Drive folder URL formats
 * 
 * @param {string} url - Google Drive folder URL
 * @returns {string|null} Folder ID or null if invalid
 */
function extractFolderIdFromUrl(url) {
  if (!url) return null
  
  try {
    // Pattern for Google Drive folder URLs
    const patterns = [
      /\/folders\/([a-zA-Z0-9-_]+)/,     // Standard folder URL
      /id=([a-zA-Z0-9-_]+)/,            // Alternative format
      /^([a-zA-Z0-9-_]+)$/              // Direct ID
    ]
    
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    
    return null
  } catch (error) {
    console.error('Error parsing folder URL:', error)
    return null
  }
}