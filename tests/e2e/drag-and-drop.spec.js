const { test, expect } = require('@playwright/test')

test.describe('Field Drag and Drop with Undo/Redo', () => {
  let testFormRefKey

  test.beforeEach(async ({ page }) => {
    // Generate unique test form reference key
    testFormRefKey = `test-drag-drop-${Date.now()}`

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
    await expect(page.locator('h1')).toContainText('Form Builder')

    // Click "Create Form" button
    await page.click('button:has-text("Create Form")')

    // Fill in basic form details
    await page.fill('#refKey', testFormRefKey)
    await page.fill('#title', 'Drag Drop Test Form')
    await page.fill('#description', 'Testing drag and drop functionality')

    // Add multiple test fields for reordering
    await page.click('button:has-text("Add Field")')

    // Add first field
    await page.fill('input[placeholder*="label"]', 'First Name')
    await page.fill('input[placeholder*="key"]', 'first_name')
    await page.selectOption('select', 'text')
    await page.click('button:has-text("Save")')

    // Add second field
    await page.click('button:has-text("Add Field")')
    await page.fill('input[placeholder*="label"]', 'Last Name')
    await page.fill('input[placeholder*="key"]', 'last_name')
    await page.selectOption('select', 'text')
    await page.click('button:has-text("Save")')

    // Add third field
    await page.click('button:has-text("Add Field")')
    await page.fill('input[placeholder*="label"]', 'Email Address')
    await page.fill('input[placeholder*="key"]', 'email')
    await page.selectOption('select', 'email')
    await page.click('button:has-text("Save")')

    // Add fourth field
    await page.click('button:has-text("Add Field")')
    await page.fill('input[placeholder*="label"]', 'Phone Number')
    await page.fill('input[placeholder*="key"]', 'phone')
    await page.selectOption('select', 'text')
    await page.click('button:has-text("Save")')
  })

  test('should display drag handles for all fields', async ({ page }) => {
    // Wait for fields to be visible
    await expect(page.locator('li[draggable="true"]')).toHaveCount(4)

    // Check that each field has a drag handle (hamburger icon)
    const dragHandles = page.locator('svg').filter({ hasText: 'M4 8h16M4 16h16' })
    await expect(dragHandles).toHaveCount(4)

    // Verify fields are in expected initial order
    const fieldLabels = page.locator('li[draggable="true"] .font-medium')
    await expect(fieldLabels.nth(0)).toContainText('First Name')
    await expect(fieldLabels.nth(1)).toContainText('Last Name')
    await expect(fieldLabels.nth(2)).toContainText('Email Address')
    await expect(fieldLabels.nth(3)).toContainText('Phone Number')
  })

  test('should show visual feedback during drag operations', async ({ page }) => {
    const firstField = page.locator('li[draggable="true"]').first()
    const secondField = page.locator('li[draggable="true"]').nth(1)

    // Start drag operation
    await firstField.hover()
    await page.mouse.down()

    // Verify drag feedback styles are applied
    await expect(firstField).toHaveClass(/opacity-30/)
    await expect(firstField).toHaveClass(/scale-95/)

    // Move over another field to trigger drop zone indicator
    await secondField.hover()
    await expect(secondField).toHaveClass(/bg-blue-50/)
    await expect(secondField).toHaveClass(/border-blue-300/)

    // End drag operation
    await page.mouse.up()

    // Verify feedback styles are removed
    await expect(firstField).not.toHaveClass(/opacity-30/)
    await expect(secondField).not.toHaveClass(/bg-blue-50/)
  })

  test('should reorder fields by dragging and dropping', async ({ page }) => {
    // Get initial field order
    const fieldLabels = page.locator('li[draggable="true"] .font-medium')
    await expect(fieldLabels.nth(0)).toContainText('First Name')
    await expect(fieldLabels.nth(1)).toContainText('Last Name')
    await expect(fieldLabels.nth(2)).toContainText('Email Address')
    await expect(fieldLabels.nth(3)).toContainText('Phone Number')

    // Drag first field to third position
    const firstField = page.locator('li[draggable="true"]').first()
    const thirdField = page.locator('li[draggable="true"]').nth(2)

    await firstField.dragTo(thirdField)

    // Wait for reordering animation to complete
    await page.waitForTimeout(400)

    // Verify new field order
    const reorderedLabels = page.locator('li[draggable="true"] .font-medium')
    await expect(reorderedLabels.nth(0)).toContainText('Last Name')
    await expect(reorderedLabels.nth(1)).toContainText('Email Address')
    await expect(reorderedLabels.nth(2)).toContainText('First Name')
    await expect(reorderedLabels.nth(3)).toContainText('Phone Number')
  })

  test('should show drop zone indicators during drag', async ({ page }) => {
    const firstField = page.locator('li[draggable="true"]').first()
    const lastField = page.locator('li[draggable="true"]').last()

    // Start dragging first field
    const firstFieldBox = await firstField.boundingBox()
    const lastFieldBox = await lastField.boundingBox()

    await page.mouse.move(
      firstFieldBox.x + firstFieldBox.width / 2,
      firstFieldBox.y + firstFieldBox.height / 2
    )
    await page.mouse.down()

    // Move to last field position
    await page.mouse.move(
      lastFieldBox.x + lastFieldBox.width / 2,
      lastFieldBox.y + lastFieldBox.height / 2
    )

    // Check for drop zone indicator (blue line with dots)
    const dropIndicator = page.locator('.absolute.inset-x-0.bg-blue-500')
    await expect(dropIndicator).toBeVisible()

    // Check for animated dots on drop indicator
    const dropDots = page.locator('.absolute.w-2.h-2.bg-blue-500.animate-bounce')
    await expect(dropDots).toHaveCount(2)

    await page.mouse.up()
  })

  test('should show global drag overlay when dragging', async ({ page }) => {
    const firstField = page.locator('li[draggable="true"]').first()

    // Start drag operation
    await firstField.hover()
    await page.mouse.down()

    // Verify global drag overlay appears
    const dragOverlay = page.locator('.absolute.inset-0.pointer-events-none.z-10')
    await expect(dragOverlay).toBeVisible()

    // Verify overlay message
    await expect(page.locator('text=Drop to reorder field')).toBeVisible()

    // Verify overlay has proper styling
    const overlayBg = page.locator('.bg-blue-50.bg-opacity-20.border-dashed.border-blue-300')
    await expect(overlayBg).toBeVisible()

    await page.mouse.up()

    // Verify overlay disappears
    await expect(dragOverlay).not.toBeVisible()
  })

  test('should have functional undo button that reverses field reordering', async ({ page }) => {
    // Get initial field order
    const initialLabels = page.locator('li[draggable="true"] .font-medium')
    await expect(initialLabels.nth(0)).toContainText('First Name')
    await expect(initialLabels.nth(1)).toContainText('Last Name')

    // Perform drag and drop operation
    const firstField = page.locator('li[draggable="true"]').first()
    const thirdField = page.locator('li[draggable="true"]').nth(2)

    await firstField.dragTo(thirdField)
    await page.waitForTimeout(400)

    // Verify field was moved
    const movedLabels = page.locator('li[draggable="true"] .font-medium')
    await expect(movedLabels.nth(0)).toContainText('Last Name')
    await expect(movedLabels.nth(1)).toContainText('Email Address')
    await expect(movedLabels.nth(2)).toContainText('First Name')

    // Click undo button
    const undoButton = page.locator('button[title*="Undo"]')
    await expect(undoButton).toBeEnabled()
    await undoButton.click()

    // Wait for undo animation
    await page.waitForTimeout(500)

    // Verify field order was restored
    const restoredLabels = page.locator('li[draggable="true"] .font-medium')
    await expect(restoredLabels.nth(0)).toContainText('First Name')
    await expect(restoredLabels.nth(1)).toContainText('Last Name')
    await expect(restoredLabels.nth(2)).toContainText('Email Address')
  })

  test('should have functional redo button after undo', async ({ page }) => {
    // Perform drag operation
    const firstField = page.locator('li[draggable="true"]').first()
    const lastField = page.locator('li[draggable="true"]').last()

    await firstField.dragTo(lastField)
    await page.waitForTimeout(400)

    // Verify new order
    const movedLabels = page.locator('li[draggable="true"] .font-medium')
    await expect(movedLabels.nth(3)).toContainText('First Name')

    // Undo the change
    await page.locator('button[title*="Undo"]').click()
    await page.waitForTimeout(500)

    // Verify original order restored
    const undoneLabels = page.locator('li[draggable="true"] .font-medium')
    await expect(undoneLabels.nth(0)).toContainText('First Name')

    // Redo the change
    const redoButton = page.locator('button[title*="Redo"]')
    await expect(redoButton).toBeEnabled()
    await redoButton.click()
    await page.waitForTimeout(500)

    // Verify order is back to moved state
    const redoneLabels = page.locator('li[draggable="true"] .font-medium')
    await expect(redoneLabels.nth(3)).toContainText('First Name')
  })

  test('should disable undo button when no history available', async ({ page }) => {
    // Initially, undo should be disabled (no previous state)
    const undoButton = page.locator('button[title*="Undo"]')
    await expect(undoButton).toBeDisabled()

    // Perform a field reorder
    const firstField = page.locator('li[draggable="true"]').first()
    const secondField = page.locator('li[draggable="true"]').nth(1)
    await firstField.dragTo(secondField)
    await page.waitForTimeout(400)

    // Now undo should be enabled
    await expect(undoButton).toBeEnabled()

    // Use undo
    await undoButton.click()
    await page.waitForTimeout(500)

    // Undo should be disabled again (back to original state)
    await expect(undoButton).toBeDisabled()
  })

  test('should disable redo button when no future history available', async ({ page }) => {
    // Initially, redo should be disabled
    const redoButton = page.locator('button[title*="Redo"]')
    await expect(redoButton).toBeDisabled()

    // Perform and undo a field reorder
    const firstField = page.locator('li[draggable="true"]').first()
    const secondField = page.locator('li[draggable="true"]').nth(1)
    await firstField.dragTo(secondField)
    await page.waitForTimeout(400)

    await page.locator('button[title*="Undo"]').click()
    await page.waitForTimeout(500)

    // Now redo should be enabled
    await expect(redoButton).toBeEnabled()

    // Use redo
    await redoButton.click()
    await page.waitForTimeout(500)

    // Redo should be disabled again (no future state)
    await expect(redoButton).toBeDisabled()
  })

  test('should show animation feedback during undo/redo operations', async ({ page }) => {
    // Perform drag operation
    const firstField = page.locator('li[draggable="true"]').first()
    const secondField = page.locator('li[draggable="true"]').nth(1)
    await firstField.dragTo(secondField)
    await page.waitForTimeout(400)

    // Trigger undo and check for animation classes
    await page.locator('button[title*="Undo"]').click()

    // During undo animation, fields should have enhanced transition duration
    const fieldItems = page.locator('li[draggable="true"]')
    await expect(fieldItems.first()).toHaveClass(/duration-500/)

    // Fields should have undo animation styling
    await expect(fieldItems.first()).toHaveClass(/bg-blue-50/)

    await page.waitForTimeout(500)

    // Animation styling should be removed after completion
    await expect(fieldItems.first()).not.toHaveClass(/bg-blue-50/)
  })

  test('should handle multiple consecutive drag operations with proper undo/redo', async ({
    page,
  }) => {
    const fields = page.locator('li[draggable="true"]')

    // Perform first drag: move first field to end
    await fields.nth(0).dragTo(fields.nth(3))
    await page.waitForTimeout(400)

    // Verify first move
    let labels = page.locator('li[draggable="true"] .font-medium')
    await expect(labels.nth(3)).toContainText('First Name')

    // Perform second drag: move what is now first (Last Name) to third position
    await fields.nth(0).dragTo(fields.nth(2))
    await page.waitForTimeout(400)

    // Verify second move
    labels = page.locator('li[draggable="true"] .font-medium')
    await expect(labels.nth(0)).toContainText('Email Address')
    await expect(labels.nth(2)).toContainText('Last Name')

    // Undo second operation
    await page.locator('button[title*="Undo"]').click()
    await page.waitForTimeout(500)

    // Should restore to state after first drag
    labels = page.locator('li[draggable="true"] .font-medium')
    await expect(labels.nth(0)).toContainText('Last Name')
    await expect(labels.nth(3)).toContainText('First Name')

    // Undo first operation
    await page.locator('button[title*="Undo"]').click()
    await page.waitForTimeout(500)

    // Should restore to original order
    labels = page.locator('li[draggable="true"] .font-medium')
    await expect(labels.nth(0)).toContainText('First Name')
    await expect(labels.nth(1)).toContainText('Last Name')
    await expect(labels.nth(2)).toContainText('Email Address')
    await expect(labels.nth(3)).toContainText('Phone Number')
  })

  test('should preserve field functionality after reordering', async ({ page }) => {
    // Reorder fields
    const firstField = page.locator('li[draggable="true"]').first()
    const lastField = page.locator('li[draggable="true"]').last()
    await firstField.dragTo(lastField)
    await page.waitForTimeout(400)

    // Verify edit and remove buttons still work for reordered field
    const reorderedField = page.locator('li[draggable="true"]').last()
    await expect(reorderedField).toContainText('First Name')

    // Click edit button
    const editButton = reorderedField.locator('button[title*="Edit"]')
    await editButton.click()

    // Verify edit form appears
    await expect(page.locator('h4:has-text("Edit: First Name")')).toBeVisible()

    // Cancel edit
    await page.locator('button:has-text("Cancel")').click()

    // Test remove functionality
    const removeButton = reorderedField.locator('button[title*="Remove"]')
    await removeButton.click()

    // Verify field was removed
    await expect(page.locator('li[draggable="true"]')).toHaveCount(3)
    await expect(page.locator('text=First Name')).not.toBeVisible()
  })

  // Cleanup after tests
  test.afterEach(async ({ page }) => {
    try {
      // Try to delete the test form if it was created
      if (testFormRefKey) {
        await page.evaluate(async (refKey) => {
          try {
            await fetch('/api/forms', {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify({ refKey }),
            })
          } catch (e) {
            console.log('Cleanup error:', e.message)
          }
        }, testFormRefKey)
      }
    } catch (error) {
      console.log('Test cleanup failed:', error.message)
    }
  })
})
