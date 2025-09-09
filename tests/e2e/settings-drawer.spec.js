const { test, expect } = require('@playwright/test')

test.describe('Settings Drawer', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the home page
    await page.goto('http://localhost:3000')

    // Login first if needed
    const loginButton = await page.locator('button:has-text("Admin Login")')
    if (await loginButton.isVisible()) {
      await loginButton.click()
      await page.fill('input[type="password"]', 'test-admin-key-123')
      await page.click('button:has-text("Login")')
      await page.waitForSelector('text=Form Builder', { timeout: 10000 })
    }
  })

  test('should open settings drawer and test AI model selection', async ({ page }) => {
    console.log('🧪 Testing Settings Drawer AI Model Selection')

    // Look for settings button (could be in header or as a settings icon)
    const settingsButton = await page
      .locator(
        'button[data-testid="settings-button"], button:has-text("Settings"), [aria-label*="Settings"], [title*="Settings"]'
      )
      .first()

    if (await settingsButton.isVisible()) {
      console.log('✅ Found settings button')
      await settingsButton.click()
    } else {
      // Try looking for a gear icon or settings menu
      const gearIcon = await page
        .locator('svg[data-icon="setting"], .anticon-setting, button:has(.anticon-setting)')
        .first()
      if (await gearIcon.isVisible()) {
        console.log('✅ Found gear icon')
        await gearIcon.click()
      } else {
        console.log('❌ No settings button found, taking screenshot for debugging')
        await page.screenshot({ path: 'debug-no-settings-button.png' })
        throw new Error('Settings button not found')
      }
    }

    // Wait for settings drawer to open
    await page.waitForSelector('text=Model', { timeout: 5000 })
    console.log('✅ Settings drawer opened')

    // Take screenshot of the drawer
    await page.screenshot({ path: 'settings-drawer-opened.png' })

    // Find the AI model select dropdown
    const modelSelect = await page
      .locator(
        '[data-testid="ai-model-select"], .ant-select:has(+ :text("Select the model")), .ant-select'
      )
      .first()
    expect(modelSelect).toBeVisible()
    console.log('✅ Found AI model select dropdown')

    // Click on the select to open dropdown
    await modelSelect.click()
    await page.waitForTimeout(500) // Wait for dropdown animation

    // Take screenshot of open dropdown
    await page.screenshot({ path: 'settings-dropdown-opened.png' })

    // Check if all three models are available in the dropdown
    const modelOptions = await page.locator('.ant-select-item-option')
    const optionsCount = await modelOptions.count()
    console.log(`📊 Found ${optionsCount} model options`)

    // Get all option texts
    const optionTexts = []
    for (let i = 0; i < optionsCount; i++) {
      const text = await modelOptions.nth(i).textContent()
      optionTexts.push(text)
      console.log(`📝 Option ${i + 1}: "${text}"`)
    }

    // Verify we have the expected 3 models
    expect(optionsCount).toBe(3)
    expect(optionTexts).toContain('GPT-5 mini')
    expect(optionTexts).toContain('GPT-5 nano')
    expect(optionTexts).toContain('GPT-4o mini')

    // Try to select GPT-4o mini
    console.log('🎯 Attempting to select GPT-4o mini')
    const gpt4oOption = await page.locator('.ant-select-item-option:has-text("GPT-4o mini")')
    await gpt4oOption.click()

    // Wait for dropdown to close and verify selection
    await page.waitForTimeout(500)

    // Check if the selected value is displayed correctly
    const selectedValue = await page.locator('.ant-select-selection-item').textContent()
    console.log(`✅ Selected model: "${selectedValue}"`)
    expect(selectedValue).toBe('GPT-4o mini')

    // Try selecting GPT-5 nano
    console.log('🎯 Attempting to select GPT-5 nano')
    await modelSelect.click()
    await page.waitForTimeout(500)

    const gpt5nanoOption = await page.locator('.ant-select-item-option:has-text("GPT-5 nano")')
    await gpt5nanoOption.click()
    await page.waitForTimeout(500)

    const selectedValue2 = await page.locator('.ant-select-selection-item').textContent()
    console.log(`✅ Selected model: "${selectedValue2}"`)
    expect(selectedValue2).toBe('GPT-5 nano')

    // Test saving with API key (mock key for testing)
    console.log('🔑 Testing with API key')
    const apiKeyField = await page.locator(
      'textarea[placeholder*="API key"], textarea[placeholder*="Enter your API key"]'
    )
    await apiKeyField.fill('sk-test-mock-api-key-for-testing-only')

    // Check if Save Settings button becomes enabled
    const saveButton = await page.locator('button:has-text("Save Settings")')
    await expect(saveButton).toBeEnabled()
    console.log('✅ Save button is enabled with API key')

    console.log('🎉 Settings drawer AI model selection test completed successfully')
  })

  test('should handle model selection errors gracefully', async ({ page }) => {
    console.log('🧪 Testing Settings Drawer Error Handling')

    // Open settings drawer
    const settingsButton = await page
      .locator(
        'button[data-testid="settings-button"], button:has-text("Settings"), [aria-label*="Settings"], [title*="Settings"], svg[data-icon="setting"], .anticon-setting, button:has(.anticon-setting)'
      )
      .first()
    await settingsButton.click()

    // Wait for drawer to open
    await page.waitForSelector('text=Model', { timeout: 5000 })

    // Test that form validation works
    const saveButton = await page.locator('button:has-text("Save Settings")')
    await expect(saveButton).toBeDisabled() // Should be disabled without API key
    console.log('✅ Save button correctly disabled without API key')

    // Fill in an invalid/empty API key and try to enable
    const apiKeyField = await page.locator(
      'textarea[placeholder*="API key"], textarea[placeholder*="Enter your API key"]'
    )
    await apiKeyField.fill('   ') // Just spaces

    // Should still be disabled
    await expect(saveButton).toBeDisabled()
    console.log('✅ Save button correctly disabled with invalid API key')
  })
})
