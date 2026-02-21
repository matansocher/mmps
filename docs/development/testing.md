# Testing

Testing guide for MMPS.

## Overview

MMPS uses Jest 30.x for testing with ts-jest for TypeScript support.

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
jest.mock('@services/openai/api');

describe('ChatbotService', () => {
  test('should call OpenAI API', async () => {
    const service = new ChatbotService();
    await service.processMessage('Hello');
    expect(openaiAPI).toHaveBeenCalled();
  });
});
```

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
node --inspect-brk node_modules/.bin/jest --runInBand

# Then open chrome://inspect in Chrome
```

## Next Steps

- [Contributing Guide](/development/contributing)
- [Code Style](/architecture/code-style)
