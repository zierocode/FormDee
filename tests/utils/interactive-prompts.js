#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Interactive Prompts for Test Configuration
 * Handles user input for external integration testing
 */

const readline = require('readline')

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

class InteractivePrompts {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })
  }

  // Ask a yes/no question
  async askYesNo(question, defaultAnswer = 'n') {
    return new Promise((resolve) => {
      const defaultText = defaultAnswer.toLowerCase() === 'y' ? 'Y/n' : 'y/N'
      this.rl.question(`${question} (${defaultText}): `, (answer) => {
        const response = answer.trim().toLowerCase() || defaultAnswer.toLowerCase()
        resolve(response === 'y' || response === 'yes')
      })
    })
  }

  // Ask for text input
  async askText(question, defaultValue = '') {
    return new Promise((resolve) => {
      const prompt = defaultValue ? `${question} (default: ${defaultValue}): ` : `${question}: `
      this.rl.question(prompt, (answer) => {
        resolve(answer.trim() || defaultValue)
      })
    })
  }

  // Ask for secure text input (hide input for sensitive data)
  async askSecure(question) {
    return new Promise((resolve) => {
      // Save current stdin settings
      const stdin = process.stdin
      stdin.setRawMode(true)
      stdin.resume()
      stdin.setEncoding('utf8')

      process.stdout.write(`${question}: `)

      let input = ''
      stdin.on('data', (key) => {
        if (key === '\u0003') {
          // Ctrl+C
          process.exit()
        } else if (key === '\r' || key === '\n') {
          // Enter
          stdin.setRawMode(false)
          stdin.pause()
          process.stdout.write('\n')
          resolve(input)
        } else if (key === '\u0008' || key === '\u007f') {
          // Backspace
          if (input.length > 0) {
            input = input.slice(0, -1)
            process.stdout.write('\b \b')
          }
        } else {
          input += key
          process.stdout.write('*')
        }
      })
    })
  }

  // Close the readline interface
  close() {
    this.rl.close()
  }

  // Main prompt for external integration testing
  async promptForExternalIntegrations() {
    console.log(
      `\n${colors.bright}${colors.cyan}╔═══════════════════════════════════════════════════════════════╗${colors.reset}`
    )
    console.log(
      `${colors.bright}${colors.cyan}║  EXTERNAL INTEGRATION TESTING SETUP                          ║${colors.reset}`
    )
    console.log(
      `${colors.bright}${colors.cyan}╚═══════════════════════════════════════════════════════════════╝${colors.reset}\n`
    )

    console.log(
      `${colors.yellow}External integrations require third-party credentials.${colors.reset}`
    )
    console.log(
      `${colors.yellow}These tests will make real API calls and send notifications.${colors.reset}\n`
    )

    const wantExternalTests = await this.askYesNo(
      `${colors.bright}Do you want to test external integrations?${colors.reset}`,
      'n'
    )

    if (!wantExternalTests) {
      console.log(`${colors.green}✅ Skipping external integration tests.${colors.reset}`)
      console.log(
        `${colors.cyan}Running core tests without external dependencies.${colors.reset}\n`
      )
      return { skipExternal: true }
    }

    const credentials = {}

    // Ask about Slack webhook
    console.log(`\n${colors.bright}${colors.blue}📱 Slack Webhook Testing${colors.reset}`)
    console.log(`${colors.cyan}This will send a test message to your Slack channel.${colors.reset}`)

    const wantSlack = await this.askYesNo(
      `${colors.yellow}Test Slack webhook integration?${colors.reset}`,
      'n'
    )

    if (wantSlack) {
      console.log(`\n${colors.yellow}Please provide your Slack webhook URL:${colors.reset}`)
      console.log(
        `${colors.cyan}Format: https://hooks.slack.com/services/T.../B.../...${colors.reset}`
      )

      const slackUrl = await this.askText(`${colors.bright}Slack Webhook URL${colors.reset}`)

      if (slackUrl && slackUrl.startsWith('https://hooks.slack.com/')) {
        credentials.slackWebhook = slackUrl
        console.log(`${colors.green}✅ Slack webhook configured.${colors.reset}`)
      } else {
        console.log(
          `${colors.red}⚠️  Invalid Slack webhook URL format. Skipping Slack tests.${colors.reset}`
        )
      }
    }

    // Ask about OpenAI API
    console.log(`\n${colors.bright}${colors.magenta}🤖 OpenAI API Testing${colors.reset}`)
    console.log(`${colors.cyan}This will make a minimal API call (~$0.001 cost).${colors.reset}`)

    const wantOpenAI = await this.askYesNo(
      `${colors.yellow}Test OpenAI API integration?${colors.reset}`,
      'n'
    )

    if (wantOpenAI) {
      console.log(`\n${colors.yellow}Please provide your OpenAI API key:${colors.reset}`)
      console.log(`${colors.cyan}Format: sk-proj-... (will be hidden as you type)${colors.reset}`)

      const openaiKey = await this.askSecure(`${colors.bright}OpenAI API Key${colors.reset}`)

      if (openaiKey && openaiKey.startsWith('sk-')) {
        credentials.openaiKey = openaiKey
        console.log(`${colors.green}✅ OpenAI API key configured.${colors.reset}`)
      } else {
        console.log(
          `${colors.red}⚠️  Invalid OpenAI API key format. Skipping OpenAI tests.${colors.reset}`
        )
      }
    }

    // Save credentials temporarily
    if (credentials.slackWebhook || credentials.openaiKey) {
      this.setTestEnvironmentVars(credentials)

      console.log(
        `\n${colors.green}🔐 Credentials configured for this test session.${colors.reset}`
      )
      console.log(`${colors.cyan}External integration tests will be included.${colors.reset}\n`)
    }

    return credentials
  }

  // Set environment variables for test session
  setTestEnvironmentVars(credentials) {
    if (credentials.slackWebhook) {
      process.env.TEST_SLACK_WEBHOOK_URL = credentials.slackWebhook
    }

    if (credentials.openaiKey) {
      process.env.TEST_OPENAI_API_KEY = credentials.openaiKey
    }
  }

  // Display external integration summary
  displayIntegrationSummary(credentials) {
    const tests = []

    if (credentials.slackWebhook) {
      tests.push(`${colors.green}✅ Slack Integration (3 tests)${colors.reset}`)
    } else {
      tests.push(`${colors.yellow}⚠️  Slack Integration (skipped)${colors.reset}`)
    }

    if (credentials.openaiKey) {
      tests.push(`${colors.green}✅ OpenAI Integration (4 tests)${colors.reset}`)
    } else {
      tests.push(`${colors.yellow}⚠️  OpenAI Integration (skipped)${colors.reset}`)
    }

    console.log(`\n${colors.bright}${colors.blue}External Integration Status:${colors.reset}`)
    tests.forEach((test) => console.log(`  ${test}`))
    console.log('')
  }
}

module.exports = InteractivePrompts
