# Adding Features

Guide to adding new features to MMPS.

## Feature Development Workflow

### 1. Plan
- Identify which bot/service needs the feature
- Design the feature API
- Write tests first (TDD)

### 2. Implement
- Create service layer
- Create controller layer (if Telegram)
- Implement business logic

### 3. Test
- Write unit tests
- Test locally with bot
- Verify error handling

### 4. Document
- Update code documentation
- Add examples
- Update VitePress docs

### 5. Deploy
- Merge to main
- Deploy to production
- Monitor for issues

## Adding Bot Commands

```typescript
// features/chatbot/chatbot.controller.ts
private async myCommandHandler(ctx: Context): Promise<void> {
  const { chatId, text } = getMessageData(ctx);
  const response = await this.chatbotService.myNewFeature(text, chatId);
  await ctx.reply(response);
}

init(): void {
  this.bot.command('mycommand', (ctx) => this.myCommandHandler(ctx));
}
```

## Adding AI Tools

1. Create tool file: `shared/ai/tools/{name}/{name}.tool.ts`
2. Define Zod schema
3. Implement tool function
4. Add to chatbot agent
5. Test with bot

See [AI Tools](/development/ai-tools) for details.

## Adding Database Models

1. Define type in `types.ts`
2. Create repository functions
3. Add database indexes (if needed)
4. Test with MongoDB

## Adding External Service

1. Create service in `services/`
2. Define types
3. Implement API calls
4. Add error handling
5. Test integration

## Next Steps

- [Testing Guide](/development/testing)
- [Contributing](/development/contributing)
- [AI Tools](/development/ai-tools)
