# Contributing

Guidelines for contributing to MMPS.

## Code of Conduct

Be respectful, inclusive, and constructive in all interactions.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR-USERNAME/mmps.git`
3. Create a feature branch: `git checkout -b feature/your-feature`
4. Install dependencies: `npm install`
5. Make your changes
6. Test: `npm test`
7. Push to your fork and submit a pull request

## Development Workflow

### Code Quality

```bash
# Format code
npm run format

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Run tests
npm test

# Watch tests
npm test:watch

# Build TypeScript
npm run build
```

### Commit Messages

Use imperative mood:

```bash
✅ git commit -m "Add reminder feature to chatbot"
❌ git commit -m "Added reminders"
```

### Branching Strategy

- `feature/...` - New features
- `fix/...` - Bug fixes
- `docs/...` - Documentation
- `refactor/...` - Code refactoring

## Code Standards

See [Code Style Guide](/architecture/code-style) for details.

Key points:
- Use `type`, never `interface`
- Mark properties as `readonly`
- Use named exports only
- Always use async/await
- No JSDoc comments

## Adding a New Feature

1. Create a feature branch
2. Write tests first (TDD)
3. Implement feature
4. Ensure all tests pass: `npm test`
5. Update documentation
6. Submit PR with description

## Adding a New Bot

Creating a new bot:

1. Copy existing bot structure to `features/{newbot}/`
2. Create required files:
   - `{bot}.init.ts` - Initialization
   - `{bot}.controller.ts` - Telegram handlers
   - `{bot}.service.ts` - Business logic
   - `{bot}.config.ts` - Configuration
   - `types.ts` - Type definitions
   - `index.ts` - Barrel exports
3. Add bot config to `main.ts`
4. Create corresponding MongoDB database entry
5. Add to documentation

## Testing

Write tests for new features:

```typescript
describe('MyFeature', () => {
  test('should do something', () => {
    expect(myFunction()).toEqual(expected);
  });

  test.each([
    { input: 1, expected: true },
    { input: 2, expected: false },
  ])('should handle $input', ({ input, expected }) => {
    expect(myFunction(input)).toEqual(expected);
  });
});
```

Run tests:

```bash
npm test              # Run all
npm test:watch       # Watch mode
npm test -- <file>   # Specific file
```

## Documentation

Update docs when:
- Adding features
- Changing architecture
- Modifying configuration
- Adding environment variables

Documentation lives in `/docs` with VitePress.

## Pull Request Process

1. Update documentation
2. Add tests for new features
3. Ensure all tests pass
4. Run `npm run lint:fix` and `npm run format`
5. Write clear PR description
6. Link related issues

## Questions?

- Open an issue for bugs
- Discuss in PR comments
- Check existing documentation
- Review similar code in codebase

## Next Steps

- [Testing Guide](/development/testing)
- [Architecture Overview](/architecture/overview)
- [Code Style](/architecture/code-style)
