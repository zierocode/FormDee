const { test, expect } = require('@playwright/test')

test.describe('Save Form Button State Management', () => {
  let testFormRefKey

  test.beforeEach(async ({ page }) => {
    // Generate unique test form reference key
    testFormRefKey = `test-save-form-${Date.now()}`

    // Navigate to builder page and authenticate
    await page.goto('http://localhost:3000/builder')

    // Check if we need to authenticate
    const loginButton = await page.locator('button:has-text("Login")').first()
    if (await loginButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await loginButton.click()

      // Fill in admin key
      await page.fill('input[type="password"]', 'pir2092025')
      await page.click('button:has-text("Login")')
      await page.waitForURL('**/builder')
    }

    // Wait for the builder page to load
    await expect(page.locator('h4:has-text("Form Builder")')).toBeVisible()

    // Click "Create New" button
    await page.click('button:has-text("Create New")')

    // Wait for form creation interface
    await expect(page.locator('h4:has-text("New Form")')).toBeVisible()
  })

  test.afterEach(async ({ page }) => {
    // Clean up - navigate back and delete test form if it exists
    try {
      await page.goto('http://localhost:3000/builder')

      // Look for the test form and delete it
      const deleteButton = page.locator(`[data-testid="delete-${testFormRefKey}"]`)
      if (await deleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await deleteButton.click()
        await page.click('button:has-text("Yes")') // Confirm deletion
      }
    } catch (error) {
      console.log('Cleanup failed:', error.message)
    }
  })

  test('Save Form button should be disabled by default', async ({ page }) => {
    // Check that Save Form button is initially disabled
    const saveButton = page.locator('button:has-text("Save Form")')
    await expect(saveButton).toBeVisible()
    await expect(saveButton).toBeDisabled()

    console.log('✓ Save Form button is initially disabled')
  })

  test('Save Form button should enable after form changes', async ({ page }) => {
    // Initially disabled
    const saveButton = page.locator('button:has-text("Save Form")')
    await expect(saveButton).toBeDisabled()

    console.log('Step 1: Save Form button is initially disabled')

    // Fill in form title - this should make the form dirty
    const titleInput = page.locator('input[placeholder="Enter form title"]')
    await expect(titleInput).toBeVisible()
    await titleInput.fill('Test Form Title')

    console.log('Step 2: Filled in form title')

    // Fill in ref key - this should make the form dirty and valid
    const refKeyInput = page.locator('input[placeholder="Enter unique reference key"]')
    await expect(refKeyInput).toBeVisible()
    await refKeyInput.fill(testFormRefKey)

    console.log('Step 3: Filled in ref key')

    // Add a field to make the form complete
    const addFieldButton = page.locator('button:has-text("Add Field")')
    await expect(addFieldButton).toBeVisible()
    await addFieldButton.click()

    console.log('Step 4: Clicked Add Field')

    // Wait for the field editor to appear
    await expect(page.locator('div:has-text("Field Name")')).toBeVisible()

    // Fill in field details
    await page.fill('input[placeholder="e.g. first_name"]', 'test_field')
    await page.fill('input[placeholder="e.g. First Name"]', 'Test Field')

    console.log('Step 5: Filled in field details')

    // Wait a moment for React Hook Form to process the changes
    await page.waitForTimeout(500)

    // Check if Save Form button is now enabled
    const isEnabled = await saveButton.isEnabled()
    console.log('Step 6: Save Form button enabled status:', isEnabled)

    if (!isEnabled) {
      // Debug: Check form state by inspecting the React components
      const formState = await page.evaluate(() => {
        // Try to find any form state indicators
        const form = document.querySelector('form')
        const inputs = Array.from(document.querySelectorAll('input')).map((input) => ({
          name: input.name,
          value: input.value,
          placeholder: input.placeholder,
        }))

        return {
          formExists: !!form,
          inputCount: inputs.length,
          inputs: inputs,
        }
      })

      console.log('Form debug info:', JSON.stringify(formState, null, 2))

      // Try triggering change events manually
      await titleInput.dispatchEvent('input')
      await titleInput.dispatchEvent('change')
      await refKeyInput.dispatchEvent('input')
      await refKeyInput.dispatchEvent('change')

      console.log('Step 7: Dispatched manual change events')

      // Wait again
      await page.waitForTimeout(500)

      // Check again
      const isEnabledAfterManualTrigger = await saveButton.isEnabled()
      console.log(
        'Step 8: Save Form button enabled after manual trigger:',
        isEnabledAfterManualTrigger
      )
    }

    // The button should now be enabled
    await expect(saveButton).toBeEnabled({ timeout: 10000 })
  })

  test('Discard Changes button should be disabled by default and enable after changes', async ({
    page,
  }) => {
    // Check that Discard Changes button is initially disabled
    const discardButton = page.locator('button:has-text("Discard Changes")')
    await expect(discardButton).toBeVisible()
    await expect(discardButton).toBeDisabled()

    console.log('✓ Discard Changes button is initially disabled')

    // Make some changes to the form
    const titleInput = page.locator('input[placeholder="Enter form title"]')
    await titleInput.fill('Test Form Title')

    // Wait for React Hook Form to detect changes
    await page.waitForTimeout(500)

    // The Discard Changes button should now be enabled
    await expect(discardButton).toBeEnabled()

    console.log('✓ Discard Changes button is enabled after form changes')
  })

  test('Discard Changes button should show popconfirm with red icon', async ({ page }) => {
    // Make changes to enable the Discard Changes button
    const titleInput = page.locator('input[placeholder="Enter form title"]')
    await titleInput.fill('Test Form Title')

    // Wait for button to become enabled
    const discardButton = page.locator('button:has-text("Discard Changes")')
    await expect(discardButton).toBeEnabled()

    // Click the Discard Changes button to trigger popconfirm
    await discardButton.click()

    // Check that popconfirm appears
    await expect(page.locator('.ant-popconfirm')).toBeVisible()
    await expect(page.locator('text=Discard changes?')).toBeVisible()
    await expect(
      page.locator('text=Are you sure you want to discard all unsaved changes?')
    ).toBeVisible()

    // Check for the red question mark icon
    await expect(page.locator('.ant-popconfirm .anticon-question-circle')).toBeVisible()

    // Check that the "Yes, Discard" button has danger styling (red)
    const yesButton = page.locator('button:has-text("Yes, Discard")')
    await expect(yesButton).toBeVisible()
    await expect(yesButton).toHaveClass(/ant-btn-dangerous/)

    console.log('✓ Popconfirm shows with red icon and red "Yes, Discard" button')

    // Cancel the popconfirm
    await page.click('button:has-text("Cancel")')
    await expect(page.locator('.ant-popconfirm')).not.toBeVisible()
  })
})
