# Interactive External Integration Testing

The test runner now includes interactive prompts for external integration testing, ensuring complete API coverage while maintaining security.

## 🎯 How It Works

When you run API tests (`api-standard` or `api-full`), the test runner will:

1. **Ask if you want external integration testing**
2. **Prompt for credentials only if you say yes**
3. **Securely handle sensitive data (hidden input)**
4. **Set temporary environment variables for the test session**
5. **Display what will be tested based on provided credentials**

## 🚀 Usage Examples

### Interactive Mode (Default)

```bash
# Will prompt you for external integration credentials
npm run test:api:full
```

**Flow:**

```
╔═══════════════════════════════════════════════════════════════╗
║  EXTERNAL INTEGRATION TESTING SETUP                          ║
╚═══════════════════════════════════════════════════════════════╝

External integrations require third-party credentials.
These tests will make real API calls and send notifications.

Do you want to test external integrations? (y/N): y

📱 Slack Webhook Testing
This will send a test message to your Slack channel.
Test Slack webhook integration? (y/N): y

Please provide your Slack webhook URL:
Format: https://hooks.slack.com/services/T.../B.../...
Slack Webhook URL: https://hooks.slack.com/services/...
✅ Slack webhook configured.

🤖 OpenAI API Testing
This will make a minimal API call (~$0.001 cost).
Test OpenAI API integration? (y/N): y

Please provide your OpenAI API key:
Format: sk-proj-... (will be hidden as you type)
OpenAI API Key: ****************
✅ OpenAI API key configured.

🔐 Credentials configured for this test session.
External integration tests will be included.

External Integration Status:
  ✅ Slack Integration (3 tests)
  ✅ OpenAI Integration (4 tests)
```

### Skip Prompts Mode

```bash
# Skip prompts, use only environment variables
npm run test:api:full --no-prompts
```

### Pre-set Environment Variables

```bash
# Set credentials via environment
export TEST_SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
export TEST_OPENAI_API_KEY="sk-proj-..."
npm run test:api:full --no-prompts
```

### CI/CD Mode

```bash
# Automatically skips prompts in CI environments
CI=true npm run test:api:full
```

## 📊 Test Coverage

| **Mode**                | **Standard Tests** | **External Tests** | **Total Coverage** |
| ----------------------- | ------------------ | ------------------ | ------------------ |
| **Without credentials** | 33/35              | 0/2                | 94.3%              |
| **With credentials**    | 33/35              | 2/2                | 100%               |

## 🔐 Security Features

- **Hidden Input**: API keys are masked with `*` during typing
- **Session Only**: Credentials are only set for the current test session
- **No Storage**: Never saved to files or permanent environment
- **Safe Defaults**: External tests are skipped by default
- **CI Detection**: Automatically skips prompts in automated environments

## 🧪 External Integration Tests

### Slack Webhook Tests (3 tests)

- ✅ Valid webhook test (sends real test message)
- ✅ Missing webhook URL validation
- ✅ Authentication requirement check

### OpenAI API Tests (4 tests)

- ✅ Valid API key test (makes real API call ~$0.001)
- ✅ Missing API key validation
- ✅ Invalid API key handling
- ✅ Authentication requirement check

## 🛡️ Safety Measures

1. **Minimal API Usage**: OpenAI test uses ~10 tokens (~$0.001)
2. **Test Notifications**: Slack sends clearly marked test messages
3. **Error Handling**: Invalid credentials gracefully skip tests
4. **Cleanup**: No persistent changes to your accounts
5. **Transparency**: Clear indication of what external calls are made

## 💡 Best Practices

- **Use test webhooks/keys**: Don't use production credentials
- **Check costs**: Understand your API pricing before testing
- **Review messages**: Check what test messages will be sent
- **Environment isolation**: Keep test credentials separate from production
- **Regular testing**: Run with credentials periodically to ensure full coverage

This approach ensures **100% API test coverage** while maintaining **security** and **user control** over external integrations.
