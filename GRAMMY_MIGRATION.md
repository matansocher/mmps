# Migration Guide: node-telegram-bot-api to grammY

This document describes how to migrate a bot feature from `node-telegram-bot-api` to `grammY`. The langly bot was the first feature migrated and serves as the reference implementation.

---

## Table of Contents

1. [Overview](#overview)
2. [Service Layer: telegram-grammy](#service-layer-telegram-grammy)
3. [Step-by-Step Migration](#step-by-step-migration)
4. [API Mapping Reference](#api-mapping-reference)
5. [Migrated Files](#migrated-files)

---

## Overview

### What changed

- **Bot library**: `node-telegram-bot-api` (polling-based, callback style) replaced with `grammY` (middleware-based, context-driven)
- **Handler model**: Handlers receive a grammy `Context` (`ctx`) object instead of raw `Message` / `CallbackQuery` objects
- **API calls**: Direct bot API calls (`this.bot.sendMessage(...)`) replaced with context methods (`ctx.reply(...)`) in controllers, and `this.bot.api.*` in services
- **Inline keyboards**: Custom `getInlineKeyboardMarkup` utility replaced with grammy's `InlineKeyboard` builder via the `buildInlineKeyboard` helper
- **Types**: `node-telegram-bot-api` types (`Message`, `CallbackQuery`, `InlineKeyboardButton`) replaced with grammy/`@grammyjs/types` equivalents

### What stayed the same

- `TelegramBotConfig` type - identical structure in both services
- `UserDetails` type - identical structure in both services
- Overall architecture (controller -> service -> repository) is unchanged
- The `provideTelegramBot` factory pattern is preserved

---

## Service Layer: telegram-grammy

The `src/services/telegram-grammy/` folder provides grammy equivalents for the utilities from `src/services/telegram/`.

### File Structure

```
services/telegram-grammy/
├── utils/
│   ├── provide-telegram-bot.ts     # Bot factory (grammy Bot instead of TelegramBot)
│   ├── get-bot-token.ts            # Token resolution (unchanged logic)
│   ├── get-message-data.ts         # Extracts message data from grammy Context
│   ├── get-callback-query-data.ts  # Extracts callback query data from grammy Context
│   ├── build-inline-keyboard.ts    # Builds InlineKeyboard from a simple array
│   ├── message-loader.ts           # Loading state while processing (typing, reaction, loader message)
│   └── send-message.ts             # sendShortenedMessage - truncates to Telegram max length
├── constants.ts                    # BLOCKED_ERROR, TELEGRAM_MAX_MESSAGE_LENGTH
├── types.ts                        # TelegramBotConfig, UserDetails
└── index.ts                        # Barrel exports
```

### getMessageData

Replaces the old `getMessageData(message: Message)` from `@services/telegram`.

**Before (node-telegram-bot-api):**
```typescript
import { getMessageData } from '@services/telegram';

private async handler(message: Message): Promise<void> {
  const { chatId, userDetails, text } = getMessageData(message);
}
```

**After (grammY):**
```typescript
import { getMessageData } from '@services/telegram';

private async handler(ctx: Context): Promise<void> {
  const { chatId, userDetails, text } = getMessageData(ctx);
}
```

The function extracts the same fields (`chatId`, `messageId`, `userDetails`, `text`, `audio`, `video`, `photo`, `file`, `date`, `location`) but reads them from grammy's `Context` instead of a raw `Message` object. It checks both `ctx.message` and `ctx.editedMessage`.

### getCallbackQueryData

Replaces the old `getCallbackQueryData(callbackQuery: CallbackQuery)` from `@services/telegram`.

**Before:**
```typescript
import { getCallbackQueryData } from '@services/telegram';

private async handler(callbackQuery: CallbackQuery): Promise<void> {
  const { chatId, messageId, data, userDetails } = getCallbackQueryData(callbackQuery);
}
```

**After:**
```typescript
import { getCallbackQueryData } from '@services/telegram';

private async handler(ctx: Context): Promise<void> {
  const { chatId, messageId, data, userDetails } = getCallbackQueryData(ctx);
}
```

Returns the same fields (`chatId`, `messageId`, `callbackQueryId`, `data`, `userDetails`, `text`, `date`). Note: `replyMarkup` was removed since grammy handles it differently.

### buildInlineKeyboard

Replaces the old `getInlineKeyboardMarkup` utility from `@services/telegram`. Instead of building a raw `reply_markup` object, it uses grammy's `InlineKeyboard` builder class.

**Before:**
```typescript
import { getInlineKeyboardMarkup } from '@services/telegram';

const buttons = [
  { text: 'Option A', callback_data: 'action_a' },
  { text: 'Option B', callback_data: 'action_b' },
];
await this.bot.sendMessage(chatId, 'Choose:', { ...getInlineKeyboardMarkup(buttons) });
```

**After:**
```typescript
import { buildInlineKeyboard } from '@services/telegram';

const keyboard = buildInlineKeyboard([
  { text: 'Option A', data: 'action_a' },
  { text: 'Option B', data: 'action_b' },
]);
await ctx.reply('Choose:', { reply_markup: keyboard });
```

Key differences:
- Property is `data` instead of `callback_data`
- Returns an `InlineKeyboard` instance, passed as `{ reply_markup: keyboard }`
- Each button is placed on its own row by default
- Optional `columnsPerRow` parameter for multi-column layouts: `buildInlineKeyboard(buttons, 2)`

---

## Step-by-Step Migration

### 1. Update the config file

Change the `TelegramBotConfig` import from `@services/telegram` to `@services/telegram-grammy`.

```typescript
// Before
import { TelegramBotConfig } from '@services/telegram';

// After
import type { TelegramBotConfig } from '@services/telegram';
```

The type is identical - this is just changing the import source.

### 2. Update the controller

#### 2a. Update imports

```typescript
// Before
import { CallbackQuery, Message } from 'node-telegram-bot-api';
import { getCallbackQueryData, getInlineKeyboardMarkup, getMessageData } from '@services/telegram';
import { provideTelegramBot, UserDetails } from '@services/telegram';

// After
import type { Context } from 'grammy';
import { buildInlineKeyboard, getCallbackQueryData, getMessageData, provideTelegramBot, UserDetails } from '@services/telegram';
```

#### 2b. Update handler registrations

grammy uses `.command()` and `.on()` with a `ctx` callback. If the handlers were already registered this way, no changes needed. Otherwise:

```typescript
// Before (node-telegram-bot-api)
this.bot.onText(/\/start/, (msg) => this.startHandler(msg));
this.bot.on('callback_query', (query) => this.callbackQueryHandler(query));

// After (grammY)
this.bot.command('start', (ctx) => this.startHandler(ctx));
this.bot.on('callback_query', (ctx) => this.callbackQueryHandler(ctx));
```

#### 2c. Update handler signatures

All handlers receive `ctx: Context` instead of `message: Message` or `callbackQuery: CallbackQuery`.

```typescript
// Before
private async startHandler(message: Message): Promise<void> {
  const { chatId, userDetails } = getMessageData(message);
  await this.bot.sendMessage(chatId, welcomeMessage);
}

// After
private async startHandler(ctx: Context): Promise<void> {
  const { chatId, userDetails } = getMessageData(ctx);
  await ctx.reply(welcomeMessage);
}
```

#### 2d. Replace bot API calls with ctx methods

In controllers where `ctx` is available, always prefer `ctx.*` methods:

| Before (`this.bot.*` / `this.bot.api.*`) | After (`ctx.*`) |
|---|---|
| `this.bot.sendMessage(chatId, text, opts)` | `ctx.reply(text, opts)` |
| `this.bot.api.sendMessage(chatId, text, opts)` | `ctx.reply(text, opts)` |
| `this.bot.api.deleteMessage(chatId, messageId)` | `ctx.deleteMessage()` |
| `this.bot.api.sendChatAction(chatId, 'typing')` | `ctx.replyWithChatAction('typing')` |
| `this.bot.answerCallbackQuery(id, opts)` | `ctx.answerCallbackQuery(opts)` |

Note: `ctx.reply()` automatically sends to the current chat - no `chatId` parameter needed.

#### 2e. Pass ctx through to sub-handlers

Sub-handlers that previously received only `chatId` should now also receive `ctx` so they can use `ctx.reply()`:

```typescript
// Before
private async subscribeHandler(chatId: number, userDetails: UserDetails): Promise<void> {
  await createUserPreference(chatId);
  await this.bot.api.sendMessage(chatId, 'Subscribed!');
}

// After
private async subscribeHandler(ctx: Context, chatId: number, userDetails: UserDetails): Promise<void> {
  await createUserPreference(chatId);
  await ctx.reply('Subscribed!');
}
```

#### 2f. Replace inline keyboard creation

```typescript
// Before
const buttons = [
  { text: 'Subscribe', callback_data: 'subscribe' },
  { text: 'Settings', callback_data: 'settings' },
];
await this.bot.api.sendMessage(chatId, 'Menu:', { ...getInlineKeyboardMarkup(buttons) });

// After
const keyboard = buildInlineKeyboard([
  { text: 'Subscribe', data: 'subscribe' },
  { text: 'Settings', data: 'settings' },
]);
await ctx.reply('Menu:', { reply_markup: keyboard });
```

### 3. Update the service

Services that don't have access to `ctx` (e.g., called from schedulers) use `this.bot.api.*` instead of `this.bot.*`:

```typescript
// Before (node-telegram-bot-api)
await this.bot.sendMessage(chatId, text, opts);
await this.bot.editMessageText(text, { chat_id: chatId, message_id: messageId });
await this.bot.editMessageReplyMarkup(markup, { chat_id: chatId, message_id: messageId });
await this.bot.sendVoice(chatId, filePath, opts);

// After (grammY)
import { InputFile } from 'grammy';

await this.bot.api.sendMessage(chatId, text, opts);
await this.bot.api.editMessageText(chatId, messageId, text, opts);
await this.bot.api.editMessageReplyMarkup(chatId, messageId, opts);
await this.bot.api.sendVoice(chatId, new InputFile(filePath), opts);
```

Key differences in the grammy API methods:
- All methods are on `this.bot.api` (not directly on `this.bot`)
- `editMessageText` takes `(chatId, messageId, text, opts)` instead of `(text, { chat_id, message_id, ...opts })`
- `editMessageReplyMarkup` takes `(chatId, messageId, opts)` instead of `(markup, { chat_id, message_id })`
- **File sending** (`sendVoice`, `sendPhoto`, `sendDocument`, etc.): Raw file path strings are **not accepted** — wrap with `new InputFile(path)` from `grammy`

Also replace `getInlineKeyboardMarkup` with `buildInlineKeyboard` in services (same pattern as controllers).

---

## API Mapping Reference

### Bot Instance Methods

| node-telegram-bot-api | grammY (with ctx) | grammY (without ctx) |
|---|---|---|
| `bot.sendMessage(chatId, text, opts)` | `ctx.reply(text, opts)` | `bot.api.sendMessage(chatId, text, opts)` |
| `bot.sendChatAction(chatId, action)` | `ctx.replyWithChatAction(action)` | `bot.api.sendChatAction(chatId, action)` |
| `bot.deleteMessage(chatId, messageId)` | `ctx.deleteMessage()` | `bot.api.deleteMessage(chatId, messageId)` |
| `bot.answerCallbackQuery(id, opts)` | `ctx.answerCallbackQuery(opts)` | `bot.api.answerCallbackQuery(id, opts)` |
| `bot.editMessageText(text, { chat_id, message_id, ...opts })` | - | `bot.api.editMessageText(chatId, messageId, text, opts)` |
| `bot.editMessageReplyMarkup(markup, { chat_id, message_id })` | - | `bot.api.editMessageReplyMarkup(chatId, messageId, opts)` |
| `bot.sendVoice(chatId, path, opts)` | `ctx.replyWithVoice(new InputFile(path), opts)` | `bot.api.sendVoice(chatId, new InputFile(path), opts)` |
| `bot.sendPhoto(chatId, photo, opts)` | `ctx.replyWithPhoto(new InputFile(photo), opts)` | `bot.api.sendPhoto(chatId, new InputFile(photo), opts)` |

### Handler Registration

| node-telegram-bot-api | grammY |
|---|---|
| `bot.onText(/\/start/, (msg) => ...)` | `bot.command('start', (ctx) => ...)` |
| `bot.on('message', (msg) => ...)` | `bot.on('message', (ctx) => ...)` |
| `bot.on('callback_query', (query) => ...)` | `bot.on('callback_query', (ctx) => ...)` |

### Inline Keyboards

| node-telegram-bot-api | grammY |
|---|---|
| `{ text: 'Label', callback_data: 'value' }` | `{ text: 'Label', data: 'value' }` (with `buildInlineKeyboard`) |
| `getInlineKeyboardMarkup(buttons)` returns `{ reply_markup: {...} }` | `buildInlineKeyboard(buttons)` returns `InlineKeyboard` instance |
| Spread into options: `{ ...getInlineKeyboardMarkup(buttons) }` | Pass as `reply_markup`: `{ reply_markup: keyboard }` |

### Type Imports

| node-telegram-bot-api | grammY |
|---|---|
| `import { Message, CallbackQuery } from 'node-telegram-bot-api'` | `import type { Context } from 'grammy'` |
| `import { InlineKeyboardButton } from 'node-telegram-bot-api'` | `import type { InlineKeyboardButton } from '@grammyjs/types'` |

---

## Migrated Files

### Reference: langly bot

The langly bot was fully migrated. Use these files as a reference when migrating other bots:

| File | Changes |
|---|---|
| `features/langly/langly.config.ts` | Import `TelegramBotConfig` from `@services/telegram-grammy` |
| `features/langly/langly.controller.ts` | Full migration: `ctx` handlers, `ctx.reply()`, `buildInlineKeyboard`, `getMessageData(ctx)`, `getCallbackQueryData(ctx)` |
| `features/langly/langly.service.ts` | `this.bot.api.*` calls, `buildInlineKeyboard`, removed `@services/telegram` imports |

### Reference: coach bot

The coach bot was the second bot migrated. It also required porting shared utilities (`MessageLoader`, `sendShortenedMessage`, `BLOCKED_ERROR`) and moving `getTableTemplate` to `@core/utils`.

| File | Changes |
|---|---|
| `features/coach/coach.config.ts` | Import `TelegramBotConfig` from `@services/telegram-grammy` |
| `features/coach/coach.controller.ts` | Full migration: `ctx` handlers, `ctx.reply()`, `ctx.deleteMessage()`, `ctx.answerCallbackQuery()`, `buildInlineKeyboard` with `columnsPerRow`, `MessageLoader`, `getMessageData(ctx)`, `getCallbackQueryData(ctx)` |
| `features/coach/coach.service.ts` | Import `getTableTemplate` from `@core/utils` instead of `@services/telegram` |
| `features/coach/coach-scheduler.service.ts` | Import `BLOCKED_ERROR`, `provideTelegramBot`, `sendShortenedMessage` from `@services/telegram-grammy` |

### Shared code added during coach migration

| Utility | Location | Description |
|---|---|---|
| `buildInlineKeyboard` `columnsPerRow` param | `telegram-grammy/utils/build-inline-keyboard.ts` | Optional second parameter to place multiple buttons per row using `chunk()` |
| `MessageLoader` | `telegram-grammy/utils/message-loader.ts` | Shows typing action, reaction emoji, and delayed loader message while processing. Uses `bot.api.*` instead of raw axios |
| `sendShortenedMessage` | `telegram-grammy/utils/send-message.ts` | Truncates message to Telegram's max length before sending via `bot.api.sendMessage` |
| `BLOCKED_ERROR` | `telegram-grammy/constants.ts` | Error string constant for detecting blocked bots |
| `getTableTemplate` | `core/utils/get-table-template.ts` | Moved from `@services/telegram` - pure formatting function with no telegram dependency |

### Reference: worldly bot

| File | Changes |
|---|---|
| `features/worldly/worldly.config.ts` | Import `TelegramBotConfig` from `@services/telegram-grammy` |
| `features/worldly/worldly.controller.ts` | Full migration: `ctx` handlers, `ctx.reply()`, `ctx.deleteMessage()`, `buildInlineKeyboard`, `bot.api.editMessageReplyMarkup/editMessageCaption/editMessageText/setMessageReaction` (inline, no `reactToMessage` utility), `bot.catch()` for error handling |
| `features/worldly/worldly.service.ts` | `bot.api.sendPhoto` with `new InputFile(fs.createReadStream(...))`, `bot.api.sendMessage`, `buildInlineKeyboard`, `BLOCKED_ERROR` from `@services/telegram-grammy` |
| `features/worldly/worldly-scheduler.service.ts` | No changes needed (no `@services/telegram` imports) |

### Reference: magister bot

| File | Changes |
|---|---|
| `features/magister/magister.config.ts` | Import `TelegramBotConfig` from `@services/telegram-grammy` |
| `features/magister/magister.controller.ts` | Full migration: `ctx` handlers, `ctx.reply()`, `ctx.answerCallbackQuery()`, `MessageLoader` with `loadingAction: 'upload_voice'`, `removeItemFromInlineKeyboardMarkup`, `bot.api.setMessageReaction` (inline), `new InputFile()` for `sendVoice`, removed `getBotToken`/`botToken` |
| `features/magister/magister.service.ts` | `bot.api.sendMessage/editMessageReplyMarkup`, `buildInlineKeyboard`, `sendStyledMessage` from `@services/telegram-grammy`, renamed `getBotInlineKeyboardMarkup` to `getBotInlineKeyboard` |
| `features/magister/magister-scheduler.service.ts` | No changes needed (no `@services/telegram` imports) |

### Shared code added during worldly/magister migration

| Utility | Location | Description |
|---|---|---|
| `sendStyledMessage` | `telegram-grammy/utils/send-message.ts` | Sends with parse_mode, truncates to max length, falls back to plain text on error |
| `removeItemFromInlineKeyboardMarkup` | `telegram-grammy/utils/remove-item-from-inline-keyboard-markup.ts` | Filters out buttons matching a search query from an inline keyboard |
| `replyMarkup` field | `telegram-grammy/utils/get-callback-query-data.ts` | Added `replyMarkup` to `CallbackQueryData` type, extracted from callback query message |
| `loadingAction` option | `telegram-grammy/utils/message-loader.ts` | Optional `loadingAction` param for `MessageLoader` (defaults to `'typing'`, supports `'upload_voice'` etc.) |

### Reference: wolt bot

| File | Changes |
|---|---|
| `features/wolt/wolt.config.ts` | Import `TelegramBotConfig` from `@services/telegram-grammy` |
| `features/wolt/wolt.controller.ts` | Full migration: `ctx` handlers, `ctx.reply()`, `ctx.answerCallbackQuery()`, `buildInlineKeyboard`, `new InlineKeyboard().url()` for URL buttons, `new InlineKeyboard().text().row()` for pagination (replaces `getCustomInlineKeyboardMarkup`), `bot.api.editMessageReplyMarkup` |
| `features/wolt/wolt-scheduler.service.ts` | `provideTelegramBot` from `@services/telegram-grammy`, `bot.api.sendPhoto/sendMessage`, `new InlineKeyboard().url()` for URL buttons |

### Reference: chatbot bot

| File | Changes |
|---|---|
| `features/chatbot/chatbot.config.ts` | Import `TelegramBotConfig` from `@services/telegram-grammy` (already done) |
| `features/chatbot/chatbot.controller.ts` | Full migration: `ctx` handlers, `ctx.reply()`, `sendStyledMessage`, `MessageLoader` (no `botToken` param), `downloadFile` from `@services/telegram-grammy` (replaces `downloadAudio` and `bot.downloadFile`), `new InputFile()` for `sendVoice`/`sendPhoto`, removed `registerHandlers`/`TELEGRAM_EVENTS`/`TelegramEventHandler` pattern |
| `features/chatbot/chatbot-scheduler.service.ts` | `provideTelegramBot` from `@services/telegram-grammy` |
| `features/chatbot/schedulers/*.ts` (13 files) | `Bot` type from `grammy` (replaces `TelegramBot` from `node-telegram-bot-api`), `sendShortenedMessage` from `@services/telegram-grammy`, `bot.api.sendMessage/sendPhoto` (replaces `bot.sendMessage/sendPhoto`), `new InputFile()` for earthquake map photos |

### Migration status

| Bot | Status |
|---|---|
| langly | Migrated |
| coach | Migrated |
| worldly | Migrated |
| magister | Migrated |
| wolt | Migrated |
| chatbot | Migrated |
| striker | Pending |