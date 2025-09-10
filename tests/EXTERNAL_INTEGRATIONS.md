# External Integration Testing

This document explains how to test external integration endpoints that require third-party credentials.

## 🔐 Required Environment Variables

To test external integrations, you need to provide your own credentials. Add these to your `.env` file or set as environment variables:

### Slack Webhook Testing

```env
TEST_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### OpenAI API Testing

```env
TEST_OPENAI_API_KEY=sk-proj-your-openai-api-key
```

## 🧪 Running Tests

### Standard Test Suite (with integrations)

```bash
# Set your credentials first
export TEST_SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
export TEST_OPENAI_API_KEY="sk-proj-your-openai-api-key"

# Run tests
npm run test:api:standard
```

### What Gets Tested

#### Slack Integration (`/api/forms/test-slack`)

- ✅ Valid webhook URL test (sends actual test message)
- ✅ Missing webhook URL validation
- ✅ Authentication requirement

#### OpenAI Settings (`/api/settings/test`)

- ✅ Valid API key test (makes actual API call)
- ✅ Missing API key validation
- ✅ Invalid API key handling
- ✅ Authentication requirement

## ⚠️ Important Notes

1. **Costs**: OpenAI tests consume API credits (minimal ~$0.001 per test)
2. **Notifications**: Slack tests send actual messages to your channel
3. **Security**: Never commit these credentials to version control
4. **Optional**: Tests are skipped if credentials aren't provided

## 🔍 Test Output

### With Credentials:

```
══════════════════════════════════════════
SLACK INTEGRATION TESTS
══════════════════════════════════════════
✓ Valid Slack Webhook Test (234ms)
✓ Missing Slack Webhook URL (12ms)
✓ Unauthorized Slack Test (8ms)

══════════════════════════════════════════
OPENAI SETTINGS TESTS
══════════════════════════════════════════
✓ Valid OpenAI Configuration Test (1205ms)
✓ Missing OpenAI API Key (15ms)
✓ Invalid OpenAI API Key (423ms)
✓ Unauthorized Settings Test (12ms)
```

### Without Credentials:

```
══════════════════════════════════════════
SLACK INTEGRATION TESTS
══════════════════════════════════════════
⚠ Skipping Slack tests - No webhook URL provided
  Set TEST_SLACK_WEBHOOK_URL environment variable to test

══════════════════════════════════════════
OPENAI SETTINGS TESTS
══════════════════════════════════════════
⚠ Skipping OpenAI tests - No API key provided
  Set TEST_OPENAI_API_KEY environment variable to test
```

## 🛡️ Security Best Practices

1. **Use test webhooks/keys**: Don't use production credentials
2. **Environment variables**: Never hardcode credentials in test files
3. **Local testing**: These credentials should only exist in your local environment
4. **Gitignore**: Ensure `.env` files are in `.gitignore`

This approach ensures external integration testing while maintaining security and allowing users to provide their own credentials.
