# Testing

Testing guide for MMPS.

## Overview

MMPS uses Vitest 4.x for testing. TypeScript runs natively via the Vite pipeline — no `ts-jest` setup required. Three suites live side by side:

- **Unit** — `src/**/*.spec.ts`, mini-app specs, and test-helper specs in `test/*.spec.ts`, run with `npm test`.
- **Integration** — `test/integration/**/*.spec.ts`, run with `npm run test:integration`.
- **E2E bot** — `test/e2e/**/*.spec.ts`, run with `npm run test:e2e` (uses the grammY mock harness in `test/e2e/harness/`).

## Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm test:watch

# Specific file
npm test -- chatbot.service.spec.ts

# With coverage
npm test -- --coverage
```

## Test Structure

Place test files alongside source code with `.spec.ts` suffix:

```
src/
├── features/
│   └── chatbot/
│       ├── chatbot.service.ts
│       └── chatbot.service.spec.ts
└── shared/
    └── utils/
        ├── string.utils.ts
        └── string.utils.spec.ts
```

## Writing Tests

### Basic Test

```typescript
describe('formatDate()', () => {
  test('should format date correctly', () => {
    const result = formatDate(new Date('2024-01-15'));
    expect(result).toEqual('2024-01-15');
  });
});
```

### Parameterized Tests

```typescript
describe('formatNumber()', () => {
  test.each([
    { input: 1000, expected: '1.0K' },
    { input: 1000000, expected: '1.0M' },
    { input: 1000000000, expected: '1.0B' },
  ])('should format $input to $expected', ({ input, expected }) => {
    expect(formatNumber(input)).toEqual(expected);
  });
});
```

### Async Tests

```typescript
describe('fetchUser()', () => {
  test('should fetch user by id', async () => {
    const user = await fetchUser(123);
    expect(user.id).toEqual(123);
  });
});
```

### Mocking

```typescript
import { vi } from 'vitest';

vi.mock('@services/openai/api');

describe('ChatbotService', () => {
  test('should call OpenAI API', async () => {
    const service = new ChatbotService();
    await service.processMessage('Hello');
    expect(openaiAPI).toHaveBeenCalled();
  });
});
```

### Expected Error Logs

Failure-path tests should assert expected application warnings and errors rather than print them as alarming CI output:

```typescript
import { expectLogs } from '@test/expect-logs';

it('should keep pending posts when Telegram fails', async () => {
  expectLogs('error', 'Failed to send digest message to chat 1: telegram down');
  // Set up the simulated failure, exercise the code, and assert recovery behavior.
});
```

Call `expectLogs` once per level inside the test, before exercising the failure. Pass every expected message in order, including repeats; use a narrowly scoped regular expression for dynamic values such as durations. The helper silences only matching calls, verifies their messages and counts when the test finishes, and restores the logger even if verification fails. Unexpected calls remain visible, and unexpected calls at the watched level also fail the test.

This helper spies on `Logger.prototype`, so use it in sequential tests, not concurrent tests. If a test calls `vi.resetModules()`, dynamically import the helper after that reset so it uses the same logger as the reloaded code. Do not silence the entire suite or change production logging to hide expected test errors.

## Best Practices

1. **Test behavior, not implementation**
   ```typescript
   // ✅ GOOD
   expect(result).toEqual(expected);
   
   // ❌ BAD
   expect(myFunction).toHaveBeenCalledWith(param);
   ```

2. **Use descriptive test names**
   ```typescript
   test('should return null when user not found', () => {});
   test('should throw error when API key is missing', () => {});
   ```

3. **Keep tests focused**
   ```typescript
   // One concept per test
   test('should validate email format', () => {
     expect(isValidEmail('test@example.com')).toBe(true);
   });
   ```

4. **Arrange-Act-Assert**
   ```typescript
   test('should create reminder', async () => {
     // Arrange
     const data = { text: 'Buy milk', time: '10:00' };
     
     // Act
     const result = await createReminder(data);
     
     // Assert
     expect(result._id).toBeDefined();
   });
   ```

## Coverage Goals

Aim for:
- ✅ 80%+ coverage overall
- ✅ 100% for critical paths (auth, payments)
- ✅ Services should be highly tested
- ⚠️ UI/controllers less critical

## Testing Services

```typescript
describe('ChatbotService', () => {
  let service: ChatbotService;

  beforeEach(() => {
    service = new ChatbotService();
  });

  test('should process message', async () => {
    const response = await service.processMessage('hello', 123);
    expect(response).toBeDefined();
  });
});
```

## Testing Repositories

```typescript
describe('Reminder Repository', () => {
  test('should create reminder', async () => {
    const data: CreateReminderData = {
      chatId: 123,
      text: 'Test',
      time: '10:00',
      timezone: 'UTC',
      status: 'pending',
    };
    
    const result = await createReminder(data);
    expect(result.insertedId).toBeDefined();
  });
});
```

## Debugging Tests

```bash
# Run tests with debugging enabled
node --inspect-brk node_modules/.bin/vitest run

# Then open chrome://inspect in Chrome
```

## Next Steps

- [Contributing Guide](/development/contributing)
- [Code Style](/architecture/code-style)
