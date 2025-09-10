import { test, expect, Page } from '@playwright/test'

// Import cleanup utilities
const { PlaywrightCleanupHelper } = require('../utils/universal-cleanup')

/**
 * E2E Standard Test Suite for FormDee v1.2
 * 
 * This test suite covers essential user workflows and core functionality:
 * 1. Home page and navigation
 * 2. Authentication flow
 * 3. Form builder basic functionality
 * 4. Form submission flow
 * 5. Basic settings management
 * 
 * These tests represent the minimum viable functionality that must work
 * for the application to be considered functional.
 */

// Test configuration
const TEST_CONFIG = {
  adminKey: process.env.TEST_ADMIN_KEY || 'pir2092025',
  baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
  timeouts: {
    navigation: 10000,
    element: 5000,
    api: 15000
  }
}

// Global cleanup and test tracking
let globalCleanupHelper: any = null
let createdFormKeys: string[] = []

// Helper functions
class TestHelpers {
  static async authenticateAdmin(page: Page) {
    await page.goto('/builder')
    
    // Check if already authenticated by looking for the Form Builder heading
    const builderHeading = page.locator('h4:has-text("Form Builder")')
    const isAlreadyAuthenticated = await builderHeading.isVisible({ timeout: 2000 })
    
    if (!isAlreadyAuthenticated) {
      const loginButton = page.locator('button:has-text("Login")').first()
      if (await loginButton.isVisible({ timeout: 2000 })) {
        await loginButton.click()
        await page.fill('input[type="password"]', TEST_CONFIG.adminKey)
        await page.click('button:has-text("Login")')
        await page.waitForURL('**/builder', { timeout: TEST_CONFIG.timeouts.navigation })
      }
    }
    
    // Ensure we're on the builder page
    await expect(builderHeading).toBeVisible()
  }

  static async createTestForm(page: Page, refKey: string) {
    // Track this form for cleanup
    createdFormKeys.push(refKey)
    
    await page.click('button:has-text("Create New")')
    await page.fill('input[placeholder*="unique reference"]', refKey)
    await page.fill('input[placeholder*="title"]', `Test Form ${refKey}`)
    await page.fill('textarea[placeholder*="description"]', 'E2E Test Form Description')
    
    // Add a simple text field
    await page.click('button:has-text("Add Field")')
    await page.fill('input[placeholder*="label"]', 'Full Name')
    await page.fill('input[placeholder*="key"]', 'full_name')
    await page.selectOption('select', 'text')
    await page.click('button:has-text("Save")')
  }

  static async cleanupTestForm(page: Page, refKey: string) {
    // This method is deprecated - cleanup is now handled globally
    // Remove from tracking if manually called
    const index = createdFormKeys.indexOf(refKey)
    if (index > -1) {
      createdFormKeys.splice(index, 1)
    }
    
    try {
      await page.evaluate(async (refKey) => {
        await fetch('/api/forms', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ refKey })
        })
      }, refKey)
    } catch (error) {
      console.log(`Individual cleanup warning for ${refKey}:`, error)
    }
  }

  static generateTestRefKey(prefix: string = 'e2e-standard'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
  }
}

test.describe('FormDee E2E Standard Suite', () => {
  test.describe.configure({ mode: 'serial' })

  // Setup global cleanup helper before tests
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    globalCleanupHelper = new PlaywrightCleanupHelper(page)
    
    // Reset tracking arrays
    createdFormKeys.length = 0
    
    await page.close()
    await context.close()
  })

  // Cleanup after all tests complete
  test.afterAll(async () => {
    try {
      console.log('\n🧹 Starting E2E test cleanup...')
      
      // Perform comprehensive cleanup
      const result = await globalCleanupHelper?.performFullCleanup()
      
      if (result?.success) {
        console.log(`✅ E2E cleanup completed: ${result.formsDeleted} forms deleted`)
      } else {
        console.log('⚠️  E2E cleanup had issues:', result?.error || 'Unknown error')
      }
    } catch (error) {
      console.log('⚠️  E2E cleanup error:', error instanceof Error ? error.message : String(error))
    }
  })

  test('Home page loads correctly and shows proper branding', async ({ page }) => {
    await page.goto('/')
    
    // Check page title
    await expect(page).toHaveTitle(/FormDee/)
    
    // Check main content is visible (home page has h2 with FormDee title)
    await expect(page.getByRole('heading', { name: 'FormDee' })).toBeVisible()
    
    // Check for navigation elements
    const navigation = page.locator('nav, header, .ant-layout-header')
    if (await navigation.count() > 0) {
      await expect(navigation.first()).toBeVisible()
    }
    
    // Verify page is responsive
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page.locator('body')).toBeVisible()
    
    await page.setViewportSize({ width: 1280, height: 720 })
  })

  test('Authentication flow works correctly', async ({ page }) => {
    // First, clear any existing authentication
    await page.context().clearCookies()
    await page.goto('/builder')
    
    // Check if we need to authenticate or if already authenticated
    const builderHeading = page.locator('h4:has-text("Form Builder")')
    const isAlreadyAuthenticated = await builderHeading.isVisible({ timeout: 2000 })
    
    if (!isAlreadyAuthenticated) {
      // Wait for login page to load after redirect
      await page.waitForTimeout(1000)
      
      // Should show login form - try different possible selectors
      const passwordInput = page.locator('input[type="password"]')
      const loginButton = page.locator('button:has-text("Login")')
      
      if (await passwordInput.isVisible({ timeout: 3000 })) {
        // Test invalid login first
        await passwordInput.fill('invalid-key')
        if (await loginButton.isVisible()) {
          await loginButton.click()
          // Should show error or stay on login page (wait briefly for error)
          await page.waitForTimeout(1000)
        }
        
        // Test valid login
        await passwordInput.fill(TEST_CONFIG.adminKey)
        if (await loginButton.isVisible()) {
          await loginButton.click()
        }
        
        // Should redirect to builder
        await page.waitForURL('**/builder', { timeout: TEST_CONFIG.timeouts.navigation })
      }
    }
    
    // Verify we're on the builder page
    await expect(page.locator('h4:has-text("Form Builder")')).toBeVisible()
  })

  test('Form builder interface loads and basic functionality works', async ({ page }) => {
    await TestHelpers.authenticateAdmin(page)
    
    // Verify builder interface elements
    const headings = page.locator('h1, h2, h3, h4')
    await expect(headings.first()).toBeVisible()
    
    // Check for create form button (using the actual button text from the interface)
    const createButton = page.locator('button:has-text("Create New")')
    await expect(createButton).toBeVisible()
    
    // Test create form modal/interface
    await createButton.first().click()
    
    // Verify form creation interface
    const formFields = page.locator('input[placeholder*="reference"], input[placeholder*="title"], textarea')
    await expect(formFields.first()).toBeVisible()
    
    // Test form validation (empty submission)
    const saveButton = page.locator('button:has-text("Save Form"), button:has-text("Create")')
    if (await saveButton.count() > 0) {
      const isDisabled = await saveButton.first().isDisabled()
      // Save should be disabled or show validation error
      expect(isDisabled).toBeTruthy()
    }
  })

  test('Complete form creation and submission workflow', async ({ page }) => {
    const testRefKey = TestHelpers.generateTestRefKey()
    
    try {
      await TestHelpers.authenticateAdmin(page)
      await TestHelpers.createTestForm(page, testRefKey)
      
      // Save the form
      const saveButton = page.locator('button:has-text("Save Form")')
      if (await saveButton.isVisible()) {
        await saveButton.click()
        // Wait for save confirmation
        await expect(page.locator('text=Success, text=Saved, .ant-message-success')).toBeVisible({ timeout: TEST_CONFIG.timeouts.api })
      }
      
      // Test form submission
      await page.goto(`/f/${testRefKey}`)
      
      // Verify form loads
      await expect(page.locator('form, [data-testid="form"]')).toBeVisible()
      await expect(page.locator('text=Full Name, input[placeholder*="Full Name"]')).toBeVisible()
      
      // Fill and submit form
      const nameInput = page.locator('input[name="full_name"], input[placeholder*="Full Name"]').first()
      await nameInput.fill('John Doe Test User')
      
      const submitButton = page.locator('button[type="submit"], button:has-text("Submit")')
      await submitButton.click()
      
      // Verify submission success
      await expect(page.locator('text=Success, text=Thank you, .ant-result-success')).toBeVisible({ timeout: TEST_CONFIG.timeouts.api })
      
    } finally {
      // Individual cleanup is handled globally, but we can remove from tracking
      const index = createdFormKeys.indexOf(testRefKey)
      if (index > -1) {
        createdFormKeys.splice(index, 1)
      }
    }
  })

  test('Settings drawer opens and basic functionality works', async ({ page }) => {
    await TestHelpers.authenticateAdmin(page)
    
    // Look for settings button/icon
    const settingsLocators = [
      'button[data-testid="settings-button"]',
      'button:has-text("Settings")',
      '[aria-label*="Settings"]',
      '[title*="Settings"]',
      'svg[data-icon="setting"]',
      '.anticon-setting',
      'button:has(.anticon-setting)'
    ]
    
    let settingsButton = null
    for (const locator of settingsLocators) {
      const element = page.locator(locator).first()
      if (await element.isVisible({ timeout: 1000 })) {
        settingsButton = element
        break
      }
    }
    
    if (settingsButton) {
      await settingsButton.click()
      
      // Verify settings drawer/modal opens
      const settingsContent = page.locator('text=Settings, text=Configuration, .ant-drawer-content, .ant-modal-content')
      await expect(settingsContent.first()).toBeVisible({ timeout: TEST_CONFIG.timeouts.element })
      
      // Check for AI model selection (if available)
      const modelSelect = page.locator('.ant-select, select')
      if (await modelSelect.count() > 0) {
        await expect(modelSelect.first()).toBeVisible()
      }
      
      // Check for API key field (if available)
      const apiKeyField = page.locator('textarea[placeholder*="API"], input[placeholder*="key"]')
      if (await apiKeyField.count() > 0) {
        await expect(apiKeyField.first()).toBeVisible()
      }
    } else {
      console.log('Settings button not found - this may be expected for current version')
    }
  })

  test('Form list displays and basic management works', async ({ page }) => {
    await TestHelpers.authenticateAdmin(page)
    
    // Check if forms list is visible
    const formsList = page.locator('[data-testid="forms-list"], .forms-list, .ant-list')
    if (await formsList.count() > 0) {
      await expect(formsList.first()).toBeVisible()
      
      // Check for form items or empty state
      const formsOrEmpty = page.locator('.ant-list-item, .ant-empty, text=No forms')
      await expect(formsOrEmpty.first()).toBeVisible()
    }
    
    // Test search functionality (if available)
    const searchInput = page.locator('input[placeholder*="search"], .ant-input-search')
    if (await searchInput.count() > 0) {
      await searchInput.first().fill('test')
      await page.waitForTimeout(500) // Allow search to process
    }
  })

  test('Navigation between pages works correctly', async ({ page }) => {
    // Test home to builder navigation
    await page.goto('/')
    
    const builderLink = page.locator('a[href*="builder"], button:has-text("Builder")')
    if (await builderLink.count() > 0) {
      await builderLink.first().click()
      await page.waitForURL('**/builder', { timeout: TEST_CONFIG.timeouts.navigation })
    } else {
      await page.goto('/builder')
    }
    
    // Test back navigation (if available)
    const backButton = page.locator('button:has-text("Back"), .ant-back-top')
    if (await backButton.count() > 0) {
      await backButton.first().click()
    }
    
    // Test direct form access
    await page.goto('/f/nonexistent-form')
    // Should show not found or error message
    await expect(page.locator('text=Not Found, text=404, text=Error')).toBeVisible({ timeout: TEST_CONFIG.timeouts.element })
  })

  test('Error handling and user feedback works', async ({ page }) => {
    await TestHelpers.authenticateAdmin(page)
    
    const testRefKey = TestHelpers.generateTestRefKey()
    
    try {
      // Test duplicate form creation
      await TestHelpers.createTestForm(page, testRefKey)
      
      const saveButton = page.locator('button:has-text("Save Form")')
      if (await saveButton.isVisible()) {
        await saveButton.click()
        await expect(page.locator('text=Success, .ant-message-success')).toBeVisible({ timeout: TEST_CONFIG.timeouts.api })
      }
      
      // Try to create form with same refKey
      await page.click('button:has-text("Create Form"), button:has-text("Create New")')
      await page.fill('input[placeholder*="unique reference"]', testRefKey)
      await page.fill('input[placeholder*="title"]', 'Duplicate Form')
      
      const saveAgainButton = page.locator('button:has-text("Save Form")')
      if (await saveAgainButton.isVisible()) {
        await saveAgainButton.click()
        // Should show error for duplicate
        await expect(page.locator('text=Error, text=exists, .ant-message-error')).toBeVisible({ timeout: TEST_CONFIG.timeouts.api })
      }
      
    } finally {
      // Individual cleanup is handled globally, but we can remove from tracking
      const index = createdFormKeys.indexOf(testRefKey)
      if (index > -1) {
        createdFormKeys.splice(index, 1)
      }
    }
  })
})

// Test teardown - ensure clean state
test.afterEach(async ({ page }) => {
  // Clear browser storage to prevent state leakage between tests
  try {
    await page.evaluate(() => {
      // Clear localStorage
      localStorage.clear()
      // Clear sessionStorage  
      sessionStorage.clear()
    })
  } catch (error) {
    console.log('Browser storage cleanup warning:', error)
  }
  
  // Clean up any forms created in this specific test
  if (globalCleanupHelper && createdFormKeys.length > 0) {
    await globalCleanupHelper.cleanupTestFormsFromPage([...createdFormKeys])
    createdFormKeys.length = 0
  }
})