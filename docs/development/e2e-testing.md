# Bot E2E Testing

The bot E2E suite exercises a real grammY `Bot` instance end-to-end — handlers, middleware, the hydrate plugin, command parsing, callback query routing — without ever touching the network. It lives under `test/e2e/` and runs via `npm run test:e2e`.

## How it works

The harness in `test/e2e/harness/` provides four small pieces:

1. **`createTestBot(botConfig)`** — constructs a `Bot` with a fake token and a pre-set `botInfo`, so grammY skips its lazy `getMe` call. The hydrate middleware is applied just like in production. A mock transport is attached to `bot.api.config`.
2. **`createMockTransport(bot)`** — a grammY API transformer that records every outgoing call (`{method, payload, timestamp}`) and returns a synthetic response. `sendMessage`-family methods get a fake `Message` so chained `.message_id` access works; `deleteMessage`, `answerCallbackQuery`, `setMessageReaction`, and `sendChatAction` return `true`. No HTTP request is ever made.
3. **`buildTextMessageUpdate({text, chatId?, userId?, ...})`** and **`buildCallbackQueryUpdate({data, ...})`** — synthesize valid `Update` objects with auto-incrementing IDs. Slash-prefixed text gets a `bot_command` entity automatically (without it, `bot.command()` will not fire).
4. **`simulateUpdate(testBot, update)`** — calls `bot.handleUpdate(update)` and returns just the calls captured during that update.

## Writing a spec

Each spec wires up the real controller against stub services and the harness bot:

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BOT_CONFIG } from '@src/features/coach/coach.config';
import { CoachController } from '@src/features/coach/coach.controller';
import { CoachLauncherService } from '@src/features/coach/launcher.service';
import { buildTextMessageUpdate, createTestBot, resetUpdateBuilderCounters, simulateUpdate, type TestBot } from './harness';

vi.mock('@services/notifier', () => ({ notify: vi.fn() }));

describe('CoachController E2E', () => {
  let testBot: TestBot;

  beforeEach(() => {
    resetUpdateBuilderCounters();
    testBot = createTestBot(BOT_CONFIG);
    const launcher = new CoachLauncherService(testBot.bot);
    const controller = new CoachController(coachServiceStub, testBot.bot, launcher);
    controller.init();
  });

  it('greets a new user with the long welcome', async () => {
    await simulateUpdate(testBot, buildTextMessageUpdate({ text: '/start' }));
    const sent = testBot.transport.callsByMethod('sendMessage');
    expect(sent[0].payload.text).toContain('שלום');
  });
});
```

## Inspecting captured calls

The `transport` object exposes a few helpers:

- `transport.calls` — all calls captured so far, oldest first
- `transport.callsByMethod('sendMessage')` — filter by Telegram method name
- `transport.textsSent()` — convenience: the `text` payload of every `sendMessage`
- `transport.lastCall()` — most recent capture
- `transport.clear()` — drop all captured calls (call between phases of a longer test)

## What to mock

Anything the controller imports as a top-level binding — repositories from `@shared/*`, the `notify` helper, external API wrappers — should be replaced with `vi.mock(...)`. Use `vi.hoisted(() => ...)` to share `vi.fn()` instances between the mock factory and assertions. Services that the controller receives through its constructor can simply be passed as plain stub objects.

## Gotchas

- **`MessageLoader` timers.** `MessageLoader` defers its loader-text `sendMessage` by 3 seconds. Controller tests that finish synchronously do not need to mock this — the action callback completes first and the timer is cleared. If you specifically want to assert loader behavior, switch to `vi.useFakeTimers()`.
- **Slash commands need `bot_command` entities.** The text-update builder adds them automatically for any message starting with `/`. If you build an update manually, do the same or `bot.command()` will silently not match.
- **Memoization.** The harness intentionally does not use `provideTelegramBot` — each test gets a fresh bot. Do not import the production singleton inside specs.
