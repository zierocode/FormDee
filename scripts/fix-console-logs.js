#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

// Files to update
const filesToUpdate = [
  'app/api/auth/google/logout/route.ts',
  'app/api/forms/export-responses/route.ts',
  'app/api/forms/route.ts',
  'app/api/forms/test-google-sheet/route.ts',
  'app/api/forms/validate-google-sheet/route.ts',
  'app/api/submit/route.ts',
  'lib/google-sheets-user.ts',
  'lib/google-sheets.ts',
]

// Process each file
filesToUpdate.forEach((filePath) => {
  const fullPath = path.join(process.cwd(), filePath)

  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${filePath}`)
    return
  }

  let content = fs.readFileSync(fullPath, 'utf8')
  let modified = false

  // Add logger import if not present and file uses console
  if (
    content.includes('console.') &&
    !content.includes('import { logger }') &&
    !content.includes("from '@/lib/logger'")
  ) {
    // Find the last import statement
    const importRegex = /^import .* from .*$/gm
    let lastImportMatch
    let match
    while ((match = importRegex.exec(content)) !== null) {
      lastImportMatch = match
    }

    if (lastImportMatch) {
      const insertPosition = lastImportMatch.index + lastImportMatch[0].length
      content =
        content.slice(0, insertPosition) +
        "\nimport { logger } from '@/lib/logger'" +
        content.slice(insertPosition)
      modified = true
    }
  }

  // Replace console.log with logger.info
  if (content.includes('console.log(')) {
    content = content.replace(/console\.log\(/g, 'logger.info(')
    modified = true
  }

  // Replace console.error with logger.error
  if (content.includes('console.error(')) {
    content = content.replace(/console\.error\(/g, 'logger.error(')
    modified = true
  }

  // Replace console.warn with logger.warn
  if (content.includes('console.warn(')) {
    content = content.replace(/console\.warn\(/g, 'logger.warn(')
    modified = true
  }

  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8')
    console.log(`✅ Updated: ${filePath}`)
  } else {
    console.log(`⏭️  Skipped: ${filePath} (no changes needed)`)
  }
})

console.log('\n✨ Done! All console statements have been replaced with logger.')
