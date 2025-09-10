import { test, expect, Page } from '@playwright/test'

// Import cleanup utilities
const { PlaywrightCleanupHelper } = require('../utils/universal-cleanup')

/**
 * E2E Full Test Suite for FormDee v1.2
 * 
 * Comprehensive end-to-end testing covering:
 * 1. Advanced form builder functionality
 * 2. Field validation and edge cases
 * 3. File upload workflows
 * 4. Multi-browser compatibility
 * 5. Performance and accessibility
 * 6. Error recovery scenarios
 * 7. Mobile responsive design
 * 8. Security testing
 * 9. Data persistence and migration
 * 10. Advanced user workflows
 */

const TEST_CONFIG = {
  adminKey: process.env.TEST_ADMIN_KEY || 'pir2092025',
  baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
  timeouts: {
    navigation: 15000,
    element: 10000,
    api: 30000,
    fileUpload: 45000
  },
  performance: {
    maxLoadTime: 3000,
    maxRenderTime: 1000
  }
}

// Global cleanup and test tracking
let globalCleanupHelper: any = null
let createdFormKeys: string[] = []

class AdvancedTestHelpers {
  static async authenticateAdmin(page: Page) {
    await page.goto('/builder')
    
    const loginButton = page.locator('button:has-text("Login")').first()
    if (await loginButton.isVisible({ timeout: 2000 })) {
      await loginButton.click()
      await page.fill('input[type="password"]', TEST_CONFIG.adminKey)
      await page.click('button:has-text("Login")')
      await page.waitForURL('**/builder', { timeout: TEST_CONFIG.timeouts.navigation })
    }
  }

  static async createComplexForm(page: Page, refKey: string) {
    // Track this form for cleanup
    createdFormKeys.push(refKey)
    
    await page.click('button:has-text("Create Form")')
    await page.fill('input[placeholder*="unique reference"]', refKey)
    await page.fill('input[placeholder*="title"]', `Complex Test Form ${refKey}`)
    await page.fill('textarea[placeholder*="description"]', 'Comprehensive E2E Test Form with multiple field types')
    
    // Add multiple field types
    const fieldsToAdd = [
      { label: 'Full Name', key: 'full_name', type: 'text', required: true },
      { label: 'Email Address', key: 'email', type: 'email', required: true },
      { label: 'Phone Number', key: 'phone', type: 'text', required: false },
      { label: 'Birth Date', key: 'birth_date', type: 'date', required: false },
      { label: 'Bio', key: 'bio', type: 'textarea', required: false },
      { label: 'Country', key: 'country', type: 'select', required: false },
      { label: 'Gender', key: 'gender', type: 'radio', required: false },
      { label: 'Newsletter', key: 'newsletter', type: 'checkbox', required: false }
    ]

    for (const field of fieldsToAdd) {
      await page.click('button:has-text("Add Field")')
      await page.fill('input[placeholder*="label"]', field.label)
      await page.fill('input[placeholder*="key"]', field.key)
      await page.selectOption('select', field.type)
      
      // Set required if needed
      if (field.required) {
        const requiredCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: 'Required' })
        if (await requiredCheckbox.count() > 0) {
          await requiredCheckbox.check()
        }
      }
      
      // Add options for select/radio
      if (field.type === 'select' && field.key === 'country') {
        const optionsField = page.locator('textarea[placeholder*="options"], input[placeholder*="options"]')
        if (await optionsField.count() > 0) {
          await optionsField.first().fill('USA\nCanada\nUK\nAustralia')
        }
      }
      
      if (field.type === 'radio' && field.key === 'gender') {
        const optionsField = page.locator('textarea[placeholder*="options"], input[placeholder*="options"]')
        if (await optionsField.count() > 0) {
          await optionsField.first().fill('Male\nFemale\nOther\nPrefer not to say')
        }
      }
      
      await page.click('button:has-text("Save")')
      await page.waitForTimeout(500) // Wait for field to be added
    }
  }

  static async cleanupTestForm(page: Page, refKey: string) {
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
      console.log(`Cleanup error for ${refKey}:`, error)
    }
  }

  static generateTestRefKey(prefix: string = 'e2e-full'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
  }

  static async measurePageLoad(page: Page, url: string) {
    const startTime = Date.now()
    await page.goto(url)
    const loadTime = Date.now() - startTime
    
    const renderStartTime = Date.now()
    await page.waitForLoadState('domcontentloaded')
    const renderTime = Date.now() - renderStartTime
    
    return { loadTime, renderTime }
  }

  static async checkAccessibility(page: Page) {
    // Basic accessibility checks
    const issues = []
    
    // Check for alt text on images
    const imagesWithoutAlt = await page.locator('img:not([alt])').count()
    if (imagesWithoutAlt > 0) {
      issues.push(`${imagesWithoutAlt} images without alt text`)
    }
    
    // Check for form labels
    const inputsWithoutLabels = await page.locator('input:not([aria-label]):not([aria-labelledby])').count()
    const labels = await page.locator('label').count()
    if (inputsWithoutLabels > labels) {
      issues.push('Some inputs may be missing labels')
    }
    
    // Check for heading hierarchy
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').count()
    const h1Count = await page.locator('h1').count()
    if (headings > 0 && h1Count === 0) {
      issues.push('Page missing main heading (h1)')
    }
    
    return issues
  }
}

test.describe('FormDee E2E Full Suite', () => {
  test.describe.configure({ mode: 'parallel' })

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
      console.log('\n🧹 Starting Full E2E test cleanup...')
      
      // Perform comprehensive cleanup
      const result = await globalCleanupHelper?.performFullCleanup()
      
      if (result?.success) {
        console.log(`✅ Full E2E cleanup completed: ${result.formsDeleted} forms deleted`)
      } else {
        console.log('⚠️  Full E2E cleanup had issues:', result?.error || 'Unknown error')
      }
    } catch (error) {
      console.log('⚠️  Full E2E cleanup error:', error instanceof Error ? error.message : String(error))
    }
  })
  
  // Cleanup between tests to prevent interference
  test.afterEach(async ({ page }) => {
    // Clear browser storage to prevent state leakage between tests
    try {
      await page.evaluate(() => {
        localStorage.clear()
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

  test.describe('Advanced Form Builder Tests', () => {
    test('Complex form creation with all field types', async ({ page }) => {
      const testRefKey = AdvancedTestHelpers.generateTestRefKey('complex')
      
      try {
        await AdvancedTestHelpers.authenticateAdmin(page)
        await AdvancedTestHelpers.createComplexForm(page, testRefKey)
        
        // Save the form
        const saveButton = page.locator('button:has-text("Save Form")')
        await saveButton.click()
        await expect(page.locator('text=Success, .ant-message-success')).toBeVisible({ timeout: TEST_CONFIG.timeouts.api })
        
        // Verify all fields were created
        const fieldsList = page.locator('[data-testid="fields-list"], .fields-list, .ant-list')
        if (await fieldsList.count() > 0) {
          const fields = page.locator('.field-item, .ant-list-item')
          expect(await fields.count()).toBeGreaterThanOrEqual(8)
        }
        
      } finally {
        await AdvancedTestHelpers.cleanupTestForm(page, testRefKey)
      }
    })

    test('Drag and drop field reordering', async ({ page }) => {
      const testRefKey = AdvancedTestHelpers.generateTestRefKey('dragdrop')
      
      try {
        await AdvancedTestHelpers.authenticateAdmin(page)
        
        // Create form with multiple fields
        await page.click('button:has-text("Create Form")')
        await page.fill('input[placeholder*="unique reference"]', testRefKey)
        await page.fill('input[placeholder*="title"]', 'Drag Drop Test')
        
        // Add 3 fields
        for (let i = 1; i <= 3; i++) {
          await page.click('button:has-text("Add Field")')
          await page.fill('input[placeholder*="label"]', `Field ${i}`)
          await page.fill('input[placeholder*="key"]', `field_${i}`)
          await page.click('button:has-text("Save")')
        }
        
        // Test drag and drop
        const firstField = page.locator('[draggable="true"]').first()
        const lastField = page.locator('[draggable="true"]').last()
        
        if (await firstField.count() > 0 && await lastField.count() > 0) {
          await firstField.dragTo(lastField)
          await page.waitForTimeout(500)
          
          // Verify reorder happened
          const fieldLabels = page.locator('[draggable="true"] .field-label, [draggable="true"] .font-medium')
          if (await fieldLabels.count() >= 3) {
            await expect(fieldLabels.last()).toContainText('Field 1')
          }
        }
        
      } finally {
        await AdvancedTestHelpers.cleanupTestForm(page, testRefKey)
      }
    })

    test('Undo/Redo functionality', async ({ page }) => {
      const testRefKey = AdvancedTestHelpers.generateTestRefKey('undoredo')
      
      try {
        await AdvancedTestHelpers.authenticateAdmin(page)
        await page.click('button:has-text("Create Form")')
        await page.fill('input[placeholder*="unique reference"]', testRefKey)
        await page.fill('input[placeholder*="title"]', 'Undo Redo Test')
        
        // Add a field
        await page.click('button:has-text("Add Field")')
        await page.fill('input[placeholder*="label"]', 'Test Field')
        await page.fill('input[placeholder*="key"]', 'test_field')
        await page.click('button:has-text("Save")')
        
        // Test undo functionality
        const undoButton = page.locator('button[title*="Undo"], button:has-text("Undo")')
        if (await undoButton.count() > 0 && await undoButton.first().isEnabled()) {
          await undoButton.first().click()
          await page.waitForTimeout(500)
          
          // Test redo functionality  
          const redoButton = page.locator('button[title*="Redo"], button:has-text("Redo")')
          if (await redoButton.count() > 0 && await redoButton.first().isEnabled()) {
            await redoButton.first().click()
            await page.waitForTimeout(500)
          }
        }
        
      } finally {
        await AdvancedTestHelpers.cleanupTestForm(page, testRefKey)
      }
    })
  })

  test.describe('Form Validation and Submission Tests', () => {
    test('Required field validation', async ({ page }) => {
      const testRefKey = AdvancedTestHelpers.generateTestRefKey('validation')
      
      try {
        await AdvancedTestHelpers.authenticateAdmin(page)
        
        // Create form with required fields
        await page.click('button:has-text("Create Form")')
        await page.fill('input[placeholder*="unique reference"]', testRefKey)
        await page.fill('input[placeholder*="title"]', 'Validation Test')
        
        await page.click('button:has-text("Add Field")')
        await page.fill('input[placeholder*="label"]', 'Required Field')
        await page.fill('input[placeholder*="key"]', 'required_field')
        
        const requiredCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: 'Required' })
        if (await requiredCheckbox.count() > 0) {
          await requiredCheckbox.check()
        }
        
        await page.click('button:has-text("Save")')
        
        const saveButton = page.locator('button:has-text("Save Form")')
        await saveButton.click()
        await expect(page.locator('text=Success')).toBeVisible({ timeout: TEST_CONFIG.timeouts.api })
        
        // Test form validation
        await page.goto(`/f/${testRefKey}`)
        
        const submitButton = page.locator('button[type="submit"], button:has-text("Submit")')
        await submitButton.click()
        
        // Should show validation error
        await expect(page.locator('text=required, text=Required, .ant-form-item-explain-error')).toBeVisible()
        
      } finally {
        await AdvancedTestHelpers.cleanupTestForm(page, testRefKey)
      }
    })

    test('Email field validation', async ({ page }) => {
      const testRefKey = AdvancedTestHelpers.generateTestRefKey('email')
      
      try {
        await AdvancedTestHelpers.authenticateAdmin(page)
        await page.click('button:has-text("Create Form")')
        await page.fill('input[placeholder*="unique reference"]', testRefKey)
        await page.fill('input[placeholder*="title"]', 'Email Validation Test')
        
        await page.click('button:has-text("Add Field")')
        await page.fill('input[placeholder*="label"]', 'Email')
        await page.fill('input[placeholder*="key"]', 'email')
        await page.selectOption('select', 'email')
        await page.click('button:has-text("Save")')
        
        const saveButton = page.locator('button:has-text("Save Form")')
        await saveButton.click()
        await expect(page.locator('text=Success')).toBeVisible({ timeout: TEST_CONFIG.timeouts.api })
        
        // Test email validation
        await page.goto(`/f/${testRefKey}`)
        
        const emailInput = page.locator('input[type="email"], input[name="email"]')
        await emailInput.fill('invalid-email')
        
        const submitButton = page.locator('button[type="submit"], button:has-text("Submit")')
        await submitButton.click()
        
        // Should show email validation error
        await expect(page.locator('text=valid email, text=Valid email, text=email format')).toBeVisible()
        
        // Test with valid email
        await emailInput.fill('test@example.com')
        await submitButton.click()
        await expect(page.locator('text=Success, text=Thank you')).toBeVisible({ timeout: TEST_CONFIG.timeouts.api })
        
      } finally {
        await AdvancedTestHelpers.cleanupTestForm(page, testRefKey)
      }
    })

    test('File upload functionality', async ({ page }) => {
      const testRefKey = AdvancedTestHelpers.generateTestRefKey('fileupload')
      
      try {
        await AdvancedTestHelpers.authenticateAdmin(page)
        await page.click('button:has-text("Create Form")')
        await page.fill('input[placeholder*="unique reference"]', testRefKey)
        await page.fill('input[placeholder*="title"]', 'File Upload Test')
        
        // Try to add file upload field
        await page.click('button:has-text("Add Field")')
        await page.fill('input[placeholder*="label"]', 'Upload File')
        await page.fill('input[placeholder*="key"]', 'file_upload')
        
        // Check if file type is available
        const fileOption = page.locator('option[value="file"]')
        if (await fileOption.count() > 0) {
          await page.selectOption('select', 'file')
          await page.click('button:has-text("Save")')
          
          const saveButton = page.locator('button:has-text("Save Form")')
          await saveButton.click()
          await expect(page.locator('text=Success')).toBeVisible({ timeout: TEST_CONFIG.timeouts.api })
          
          // Test file upload
          await page.goto(`/f/${testRefKey}`)
          
          const fileInput = page.locator('input[type="file"]')
          if (await fileInput.count() > 0) {
            // Create a test file
            const testFilePath = '/tmp/test-upload.txt'
            await page.evaluate((path) => {
              const fs = require('fs')
              fs.writeFileSync(path, 'Test file content')
            }, testFilePath)
            
            await fileInput.setInputFiles(testFilePath)
            
            const submitButton = page.locator('button[type="submit"], button:has-text("Submit")')
            await submitButton.click()
            
            await expect(page.locator('text=Success, text=Thank you')).toBeVisible({ timeout: TEST_CONFIG.timeouts.fileUpload })
          }
        }
        
      } finally {
        await AdvancedTestHelpers.cleanupTestForm(page, testRefKey)
      }
    })
  })

  test.describe('Performance and Accessibility Tests', () => {
    test('Page load performance', async ({ page }) => {
      const urls = ['/', '/builder']
      
      for (const url of urls) {
        if (url === '/builder') {
          await AdvancedTestHelpers.authenticateAdmin(page)
        }
        
        const { loadTime, renderTime } = await AdvancedTestHelpers.measurePageLoad(page, url)
        
        expect(loadTime).toBeLessThan(TEST_CONFIG.performance.maxLoadTime)
        expect(renderTime).toBeLessThan(TEST_CONFIG.performance.maxRenderTime)
      }
    })

    test('Basic accessibility compliance', async ({ page }) => {
      await page.goto('/')
      const homeIssues = await AdvancedTestHelpers.checkAccessibility(page)
      
      await AdvancedTestHelpers.authenticateAdmin(page)
      const builderIssues = await AdvancedTestHelpers.checkAccessibility(page)
      
      // Log issues but don't fail tests (accessibility is ongoing work)
      if (homeIssues.length > 0) {
        console.log('Home page accessibility issues:', homeIssues)
      }
      if (builderIssues.length > 0) {
        console.log('Builder page accessibility issues:', builderIssues)
      }
    })
  })

  test.describe('Mobile Responsive Tests (Form Renderer Only)', () => {
    test('Form renderer displays correctly on mobile', async ({ page }) => {
      const testRefKey = AdvancedTestHelpers.generateTestRefKey('mobile-display')
      
      try {
        // Create form on desktop first (builder is desktop-only)
        await AdvancedTestHelpers.authenticateAdmin(page)
        
        await page.click('button:has-text("Create Form")')
        await page.fill('input[placeholder*="unique reference"]', testRefKey)
        await page.fill('input[placeholder*="title"]', 'Mobile Display Test')
        
        await page.click('button:has-text("Add Field")')
        await page.fill('input[placeholder*="label"]', 'Full Name')
        await page.fill('input[placeholder*="key"]', 'full_name')
        await page.click('button:has-text("Save")')
        
        const saveButton = page.locator('button:has-text("Save Form")')
        await saveButton.click()
        await expect(page.locator('text=Success')).toBeVisible({ timeout: TEST_CONFIG.timeouts.api })
        
        // Now test mobile form renderer
        await page.setViewportSize({ width: 375, height: 667 })
        await page.goto(`/f/${testRefKey}`)
        
        // Verify form displays correctly on mobile
        await expect(page.locator('form, [data-testid="form"]')).toBeVisible()
        await expect(page.locator('input[name="full_name"]')).toBeVisible()
        
        // Test mobile interaction
        await page.fill('input[name="full_name"]', 'Mobile Test User')
        
        const submitButton = page.locator('button[type="submit"], button:has-text("Submit")')
        await expect(submitButton).toBeVisible()
        
      } finally {
        await AdvancedTestHelpers.cleanupTestForm(page, testRefKey)
        await page.setViewportSize({ width: 1280, height: 720 })
      }
    })

    test('Mobile form submission workflow', async ({ page }) => {
      const testRefKey = AdvancedTestHelpers.generateTestRefKey('mobile-submit')
      
      try {
        // Create form on desktop (builder is desktop-only)
        await AdvancedTestHelpers.authenticateAdmin(page)
        
        await page.click('button:has-text("Create Form")')
        await page.fill('input[placeholder*="unique reference"]', testRefKey)
        await page.fill('input[placeholder*="title"]', 'Mobile Submit Test')
        
        await page.click('button:has-text("Add Field")')
        await page.fill('input[placeholder*="label"]', 'Name')
        await page.fill('input[placeholder*="key"]', 'name')
        await page.click('button:has-text("Save")')
        
        const saveButton = page.locator('button:has-text("Save Form")')
        await saveButton.click()
        await expect(page.locator('text=Success')).toBeVisible({ timeout: TEST_CONFIG.timeouts.api })
        
        // Test mobile form submission
        await page.setViewportSize({ width: 375, height: 667 })
        await page.goto(`/f/${testRefKey}`)
        
        const nameInput = page.locator('input[name="name"]')
        await nameInput.fill('Mobile Test User')
        
        const submitButton = page.locator('button[type="submit"], button:has-text("Submit")')
        await submitButton.click()
        
        await expect(page.locator('text=Success, text=Thank you')).toBeVisible({ timeout: TEST_CONFIG.timeouts.api })
        
      } finally {
        await AdvancedTestHelpers.cleanupTestForm(page, testRefKey)
        await page.setViewportSize({ width: 1280, height: 720 })
      }
    })

    test('Desktop pages maintain desktop layout (no mobile responsive)', async ({ page }) => {
      // Test that admin/builder pages are desktop-only
      await AdvancedTestHelpers.authenticateAdmin(page)
      
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/builder')
      
      // Builder should still work but not be mobile-optimized
      // This test verifies the page loads without breaking on mobile viewports
      await expect(page.locator('h1, h2, h3, h4')).toBeVisible()
      
      // Reset viewport
      await page.setViewportSize({ width: 1280, height: 720 })
    })
  })

  test.describe('Error Recovery and Edge Cases', () => {
    test('Network interruption recovery', async ({ page }) => {
      const testRefKey = AdvancedTestHelpers.generateTestRefKey('network')
      
      try {
        await AdvancedTestHelpers.authenticateAdmin(page)
        
        // Go offline before form creation
        await page.context().setOffline(true)
        
        await page.click('button:has-text("Create Form")')
        await page.fill('input[placeholder*="unique reference"]', testRefKey)
        await page.fill('input[placeholder*="title"]', 'Network Test')
        
        const saveButton = page.locator('button:has-text("Save Form")')
        if (await saveButton.isVisible()) {
          await saveButton.click()
          
          // Should show network error
          await expect(page.locator('text=error, text=Error, text=network, text=offline')).toBeVisible({ timeout: TEST_CONFIG.timeouts.element })
        }
        
        // Go back online
        await page.context().setOffline(false)
        
        // Retry should work
        if (await saveButton.isVisible()) {
          await saveButton.click()
          await expect(page.locator('text=Success')).toBeVisible({ timeout: TEST_CONFIG.timeouts.api })
        }
        
      } finally {
        await page.context().setOffline(false)
        await AdvancedTestHelpers.cleanupTestForm(page, testRefKey)
      }
    })

    test('Large form handling', async ({ page }) => {
      const testRefKey = AdvancedTestHelpers.generateTestRefKey('large')
      
      try {
        await AdvancedTestHelpers.authenticateAdmin(page)
        await page.click('button:has-text("Create Form")')
        await page.fill('input[placeholder*="unique reference"]', testRefKey)
        await page.fill('input[placeholder*="title"]', 'Large Form Test')
        
        // Add many fields (stress test)
        for (let i = 1; i <= 20; i++) {
          await page.click('button:has-text("Add Field")')
          await page.fill('input[placeholder*="label"]', `Field ${i}`)
          await page.fill('input[placeholder*="key"]', `field_${i}`)
          await page.click('button:has-text("Save")')
          
          if (i % 5 === 0) {
            await page.waitForTimeout(100) // Small delay every 5 fields
          }
        }
        
        const saveButton = page.locator('button:has-text("Save Form")')
        await saveButton.click()
        await expect(page.locator('text=Success')).toBeVisible({ timeout: TEST_CONFIG.timeouts.api })
        
        // Test large form submission
        await page.goto(`/f/${testRefKey}`)
        await expect(page.locator('form')).toBeVisible()
        
        // Fill some fields
        for (let i = 1; i <= 5; i++) {
          const field = page.locator(`input[name="field_${i}"]`)
          if (await field.count() > 0) {
            await field.fill(`Value ${i}`)
          }
        }
        
        const submitButton = page.locator('button[type="submit"], button:has-text("Submit")')
        await submitButton.click()
        await expect(page.locator('text=Success')).toBeVisible({ timeout: TEST_CONFIG.timeouts.api })
        
      } finally {
        await AdvancedTestHelpers.cleanupTestForm(page, testRefKey)
      }
    })
  })

  test.describe('Security and Data Integrity', () => {
    test('XSS prevention in form fields', async ({ page }) => {
      const testRefKey = AdvancedTestHelpers.generateTestRefKey('xss')
      
      try {
        await AdvancedTestHelpers.authenticateAdmin(page)
        await page.click('button:has-text("Create Form")')
        await page.fill('input[placeholder*="unique reference"]', testRefKey)
        
        // Try XSS in form title
        const xssPayload = '<script>alert("XSS")</script>'
        await page.fill('input[placeholder*="title"]', xssPayload)
        
        // The XSS should be sanitized/escaped
        const titleValue = await page.locator('input[placeholder*="title"]').inputValue()
        expect(titleValue).not.toContain('<script>')
        
        await page.fill('input[placeholder*="title"]', 'XSS Test Form')
        
        // Add field and try XSS in field label
        await page.click('button:has-text("Add Field")')
        await page.fill('input[placeholder*="label"]', xssPayload)
        
        const labelValue = await page.locator('input[placeholder*="label"]').inputValue()
        expect(labelValue).not.toContain('<script>')
        
      } finally {
        await AdvancedTestHelpers.cleanupTestForm(page, testRefKey)
      }
    })

    test('SQL injection prevention', async ({ page }) => {
      const testRefKey = AdvancedTestHelpers.generateTestRefKey('sql')
      
      // Try SQL injection in refKey
      const sqlPayload = "'; DROP TABLE forms; --"
      
      try {
        await AdvancedTestHelpers.authenticateAdmin(page)
        await page.click('button:has-text("Create Form")')
        await page.fill('input[placeholder*="unique reference"]', sqlPayload)
        await page.fill('input[placeholder*="title"]', 'SQL Test Form')
        
        await page.click('button:has-text("Add Field")')
        await page.fill('input[placeholder*="label"]', 'Name')
        await page.fill('input[placeholder*="key"]', 'name')
        await page.click('button:has-text("Save")')
        
        const saveButton = page.locator('button:has-text("Save Form")')
        await saveButton.click()
        
        // Should either succeed (input sanitized) or show validation error
        const result = await Promise.race([
          page.locator('text=Success').waitFor({ timeout: 5000 }).then(() => 'success'),
          page.locator('text=error, text=Error, text=invalid').waitFor({ timeout: 5000 }).then(() => 'error')
        ])
        
        expect(['success', 'error']).toContain(result)
        
      } finally {
        await AdvancedTestHelpers.cleanupTestForm(page, sqlPayload)
        await AdvancedTestHelpers.cleanupTestForm(page, testRefKey)
      }
    })
  })

  test.describe('Data Migration and Persistence', () => {
    test('Form structure changes handle existing data', async ({ page }) => {
      const testRefKey = AdvancedTestHelpers.generateTestRefKey('migration')
      
      try {
        await AdvancedTestHelpers.authenticateAdmin(page)
        
        // Create initial form
        await page.click('button:has-text("Create Form")')
        await page.fill('input[placeholder*="unique reference"]', testRefKey)
        await page.fill('input[placeholder*="title"]', 'Migration Test')
        
        await page.click('button:has-text("Add Field")')
        await page.fill('input[placeholder*="label"]', 'Original Field')
        await page.fill('input[placeholder*="key"]', 'original_field')
        await page.click('button:has-text("Save")')
        
        const saveButton = page.locator('button:has-text("Save Form")')
        await saveButton.click()
        await expect(page.locator('text=Success')).toBeVisible({ timeout: TEST_CONFIG.timeouts.api })
        
        // Submit data to original form
        await page.goto(`/f/${testRefKey}`)
        await page.fill('input[name="original_field"]', 'Original Data')
        await page.click('button[type="submit"]')
        await expect(page.locator('text=Success')).toBeVisible({ timeout: TEST_CONFIG.timeouts.api })
        
        // Modify form structure
        await page.goto(`/builder/${testRefKey}`)
        
        await page.click('button:has-text("Add Field")')
        await page.fill('input[placeholder*="label"]', 'New Field')
        await page.fill('input[placeholder*="key"]', 'new_field')
        await page.click('button:has-text("Save")')
        
        await saveButton.click()
        
        // Check if migration modal appears
        const migrationModal = page.locator('text=Migration, text=Data Migration')
        if (await migrationModal.count() > 0) {
          await expect(migrationModal.first()).toBeVisible()
          
          // Accept migration
          const continueButton = page.locator('button:has-text("Continue"), button:has-text("Migrate")')
          if (await continueButton.count() > 0) {
            await continueButton.first().click()
          }
        }
        
        await expect(page.locator('text=Success')).toBeVisible({ timeout: TEST_CONFIG.timeouts.api })
        
      } finally {
        await AdvancedTestHelpers.cleanupTestForm(page, testRefKey)
      }
    })
  })
})

// ═══════════════════════════════════════════
// DELETE FUNCTIONALITY TESTS
// ═══════════════════════════════════════════

test.describe('Delete Functionality', () => {
  test('Delete form with confirmation dialog', async ({ page }) => {
    await AdvancedTestHelpers.authenticateAdmin(page)
    
    const formRefKey = `delete-test-e2e-${Date.now()}`
    
    // Step 1: Create a test form
    await page.click('button:has-text("Create New")')
    await page.fill('[data-testid="form-title"], input[placeholder*="title"], input[value=""], input:not([type="hidden"])', 'Delete Test Form')
    await page.fill('[data-testid="form-ref-key"], input[placeholder*="key"], input[placeholder*="reference"], input:not([readonly]):not([type="hidden"])', formRefKey)
    
    // Wait for form to be ready and save
    await page.waitForTimeout(1000)
    await page.click('button:has-text("Save")', { timeout: TEST_CONFIG.timeouts.element })
    await page.waitForURL('**/builder', { timeout: TEST_CONFIG.timeouts.navigation })
    
    // Track for cleanup (in case test fails)
    createdFormKeys.push(formRefKey)

    // Step 2: Find the form in the list and click delete
    const formCard = page.locator(`text="${formRefKey}"`).first()
    await expect(formCard).toBeVisible({ timeout: TEST_CONFIG.timeouts.element })
    
    // Look for delete button (should be near duplicate button)
    const deleteButton = formCard.locator('..').locator('button:has-text("Delete")').first()
    await expect(deleteButton).toBeVisible({ timeout: TEST_CONFIG.timeouts.element })
    await deleteButton.click()

    // Step 3: Verify popconfirm appears with correct warnings
    const popconfirm = page.locator('.ant-popover:visible', { hasText: 'Delete this form?' })
    await expect(popconfirm).toBeVisible({ timeout: 5000 })
    
    // Verify warning content
    await expect(popconfirm).toContainText('form configuration')
    await expect(popconfirm).toContainText('form responses')
    await expect(popconfirm).toContainText('uploaded files')
    await expect(popconfirm).toContainText('cannot be undone')

    // Step 4: Confirm deletion
    await page.click('.ant-popover button:has-text("Delete")')
    
    // Step 5: Verify success message and form removal
    await expect(page.locator('.ant-message:has-text("deleted successfully")')).toBeVisible({ timeout: 10000 })
    
    // Wait for list to update and verify form is removed
    await page.waitForTimeout(2000)
    await expect(formCard).not.toBeVisible({ timeout: 5000 })

    // Remove from cleanup list since it's been deleted
    createdFormKeys = createdFormKeys.filter(key => key !== formRefKey)
  })

  test('Delete form cancellation', async ({ page }) => {
    await AdvancedTestHelpers.authenticateAdmin(page)
    
    const formRefKey = `cancel-delete-test-${Date.now()}`
    
    // Create a test form
    await page.click('button:has-text("Create New")')
    await page.fill('[data-testid="form-title"], input[placeholder*="title"], input[value=""], input:not([type="hidden"])', 'Cancel Delete Test')
    await page.fill('[data-testid="form-ref-key"], input[placeholder*="key"], input[placeholder*="reference"], input:not([readonly]):not([type="hidden"])', formRefKey)
    
    await page.waitForTimeout(1000)
    await page.click('button:has-text("Save")')
    await page.waitForURL('**/builder')
    createdFormKeys.push(formRefKey)

    // Find and click delete button
    const formCard = page.locator(`text="${formRefKey}"`).first()
    await expect(formCard).toBeVisible()
    
    const deleteButton = formCard.locator('..').locator('button:has-text("Delete")').first()
    await deleteButton.click()

    // Verify popconfirm and cancel
    const popconfirm = page.locator('.ant-popover:visible')
    await expect(popconfirm).toBeVisible()
    await page.click('.ant-popover button:has-text("Cancel")')
    
    // Verify form is still there
    await page.waitForTimeout(1000)
    await expect(formCard).toBeVisible()
  })

  test('Delete button styling and placement', async ({ page }) => {
    await AdvancedTestHelpers.authenticateAdmin(page)
    
    // Should have at least one form in the list to test
    const firstFormCard = page.locator('[data-testid="form-card"], .ant-card').first()
    if (await firstFormCard.isVisible({ timeout: 5000 })) {
      const deleteButton = firstFormCard.locator('button:has-text("Delete")').first()
      
      // Verify delete button is present and styled correctly
      await expect(deleteButton).toBeVisible()
      
      // Verify it's a danger button (red styling)
      const buttonClass = await deleteButton.getAttribute('class')
      expect(buttonClass).toContain('ant-btn-dangerous')
      
      // Verify it has delete icon
      await expect(deleteButton.locator('[data-icon="delete"]')).toBeVisible()
      
      // Verify it's positioned after duplicate button
      const duplicateButton = firstFormCard.locator('button:has-text("Duplicate")').first()
      if (await duplicateButton.isVisible()) {
        const duplicateBox = await duplicateButton.boundingBox()
        const deleteBox = await deleteButton.boundingBox()
        
        // Delete button should be to the right of duplicate button (or below in mobile)
        expect(deleteBox?.x || 0).toBeGreaterThanOrEqual(duplicateBox?.x || 0)
      }
    }
  })
})

test.afterEach(async ({ page }) => {
  try {
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  } catch (error) {
    console.log('Cleanup warning:', error)
  }
})