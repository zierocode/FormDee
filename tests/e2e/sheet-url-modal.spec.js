const { test, expect } = require('@playwright/test');

test.describe('Configure Response Sheet Modal', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to builder page and authenticate
    await page.goto('/builder');
    
    // Check if we need to authenticate
    const loginButton = await page.locator('button:has-text("Login")').first();
    if (await loginButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await loginButton.click();
      
      // Fill in admin key
      await page.fill('input[type="password"]', 'pir2092025');
      await page.click('button:has-text("Login")');
      await page.waitForURL('/builder');
    }
    
    // Wait for the builder page to load
    await expect(page.locator('h1')).toContainText('Form Builder');
  });

  test('should handle Google Sheets URL pasting correctly', async ({ page }) => {
    const testUrl = 'https://docs.google.com/spreadsheets/d/1nw64BTzTPMAsC4al3K0AvxWHwcpcxp9gj-jLsQIv_Kw/edit?gid=593947007#gid=593947007';
    
    // Click "Create Form" button
    await page.click('button:has-text("Create Form")');
    
    // Fill in form details
    await page.fill('input[placeholder*="unique reference"]', 'test-form-' + Date.now());
    await page.fill('input[placeholder*="title"]', 'Test Form');
    await page.fill('textarea[placeholder*="description"]', 'Test form description');
    
    // Click "Configure Response Sheet" button
    await page.click('button:has-text("Configure Response Sheet")');
    
    // Wait for modal to appear
    await expect(page.locator('text=Configure Response Sheet')).toBeVisible();
    
    // Test URL input field
    const urlInput = page.locator('input[placeholder*="Google Sheets URL"]');
    await expect(urlInput).toBeVisible();
    
    // Test typing URL character by character
    await urlInput.fill('');
    await urlInput.type(testUrl, { delay: 50 });
    
    // Verify URL is in the input field
    await expect(urlInput).toHaveValue(testUrl);
    
    // Test pasting URL (simulate paste)
    await urlInput.fill('');
    await urlInput.fill(testUrl);
    
    // Verify URL is still in the input field after "paste"
    await expect(urlInput).toHaveValue(testUrl);
    
    // Verify no premature error appears
    const errorMessage = page.locator('text=Please enter a valid Google Sheets URL or ID');
    await expect(errorMessage).not.toBeVisible();
    
    // Click validate button
    await page.click('button:has-text("Validate")');
    
    // Wait for validation to complete
    await expect(page.locator('text=✓ Spreadsheet validated successfully')).toBeVisible({ timeout: 10000 });
    
    // Verify sheet dropdown appears
    const sheetSelect = page.locator('select, [role="combobox"]').last();
    await expect(sheetSelect).toBeVisible();
    
    // Verify sheets are loaded
    await expect(page.locator('text=Select a sheet')).toBeVisible();
  });

  test('should handle manual validation correctly', async ({ page }) => {
    const testUrl = 'https://docs.google.com/spreadsheets/d/1nw64BTzTPMAsC4al3K0AvxWHwcpcxp9gj-jLsQIv_Kw/edit';
    
    // Click "Create Form" button
    await page.click('button:has-text("Create Form")');
    
    // Fill in form details
    await page.fill('input[placeholder*="unique reference"]', 'test-manual-' + Date.now());
    await page.fill('input[placeholder*="title"]', 'Test Manual Validation');
    
    // Click "Configure Response Sheet" button
    await page.click('button:has-text("Configure Response Sheet")');
    
    // Wait for modal to appear
    await expect(page.locator('text=Configure Response Sheet')).toBeVisible();
    
    // Enter URL without auto-validation
    const urlInput = page.locator('input[placeholder*="Google Sheets URL"]');
    await urlInput.fill(testUrl);
    
    // Verify no auto-validation happens (no success or error message)
    await page.waitForTimeout(2000); // Wait to ensure no auto-validation
    await expect(page.locator('text=✓ Spreadsheet validated successfully')).not.toBeVisible();
    await expect(page.locator('text=Please enter a valid Google Sheets URL or ID')).not.toBeVisible();
    
    // Manually click validate
    await page.click('button:has-text("Validate")');
    
    // Should now show success
    await expect(page.locator('text=✓ Spreadsheet validated successfully')).toBeVisible({ timeout: 10000 });
  });

  test('should show error for invalid URL only on manual validation', async ({ page }) => {
    const invalidUrl = 'invalid-url';
    
    // Click "Create Form" button
    await page.click('button:has-text("Create Form")');
    
    // Fill in form details
    await page.fill('input[placeholder*="unique reference"]', 'test-invalid-' + Date.now());
    await page.fill('input[placeholder*="title"]', 'Test Invalid URL');
    
    // Click "Configure Response Sheet" button
    await page.click('button:has-text("Configure Response Sheet")');
    
    // Wait for modal to appear
    await expect(page.locator('text=Configure Response Sheet')).toBeVisible();
    
    // Enter invalid URL
    const urlInput = page.locator('input[placeholder*="Google Sheets URL"]');
    await urlInput.fill(invalidUrl);
    
    // Wait to ensure no auto-validation error appears
    await page.waitForTimeout(2000);
    await expect(page.locator('text=Please enter a valid Google Sheets URL or ID')).not.toBeVisible();
    
    // Manually click validate - should show error
    await page.click('button:has-text("Validate")');
    
    // Should show error for invalid URL
    await expect(page.locator('text=Please enter a valid Google Sheets URL or ID')).toBeVisible();
  });

  test('should display timing notice for new sheets', async ({ page }) => {
    // Click "Create Form" button
    await page.click('button:has-text("Create Form")');
    
    // Fill in form details
    await page.fill('input[placeholder*="unique reference"]', 'test-timing-' + Date.now());
    await page.fill('input[placeholder*="title"]', 'Test Timing Notice');
    
    // Click "Configure Response Sheet" button
    await page.click('button:has-text("Configure Response Sheet")');
    
    // Wait for modal to appear
    await expect(page.locator('text=Configure Response Sheet')).toBeVisible();
    
    // Verify timing notice is displayed
    await expect(page.locator('text=New/Rename sheets may take 2-5 minutes to appear')).toBeVisible();
  });
});