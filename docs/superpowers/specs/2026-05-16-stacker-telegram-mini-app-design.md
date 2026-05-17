# Stacker — Telegram Mini App design

**Date:** 2026-05-16
**Branch context:** `matan/stacker` (MMPS chat-based bot already built; this spec transforms it)
**Sibling repo context:** `/Users/guzi/Projects/stacker/` (Next.js + NestJS + Postgres prototype; UI components will be ported, repo archived)

---

## 1. Summary

Stacker becomes a **Telegram Mini App** instead of a chat-based bot. Players still launch from the `@stacker_bot` chat, but tapping "Play" opens a polished React UI inside Telegram's webview. The bot itself shrinks to a launcher — welcome message + Mini App button + daily reminder. All quiz interaction (topic picking, question rendering, answer submission, summary) happens in the Mini App.

The game model the bot already implements stays intact: 6 topics × 3 levels, 3 question types (MC, code-output, fill-in), 5-question rounds, hearts (3/day, lazy reset), XP per correct answer, streaks, retake queue. Nothing in the gameplay design changes — only the surface.

Everything ships from a single MMPS Node process. The Mini App is a Vite+React SPA built into MMPS's existing Express server. The sibling `/Users/guzi/Projects/stacker/` repo is **archived** after porting its UI components; we keep nothing from its NestJS/Prisma/Postgres stack.

## 2. Goals

- Replace the chat-rendered quiz with a real UI (animations, code highlighting, snappy interactions) without leaving Telegram.
- Reuse the MMPS branch's full game engine (hearts, streaks, multi-type questions, retake queue) — no rewrite of mechanics.
- Reuse the sibling repo's polished React components — port them, don't reinvent.
- Keep MMPS conventions (grammY, MongoDB, plain TS, no NestJS, no Postgres).
- One process, one deploy.

## 3. Non-goals (MVP)

- Leaderboards. Deferred.
- Login outside Telegram (web-only access). Mini App is the only entry.
- Adaptive difficulty / spaced repetition beyond the in-session retake queue.
- Real-time multiplayer.
- Push notifications beyond the existing daily-reminder cron.
- Payments / hearts top-up. Hearts reset on a new day, period.

## 4. Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      Telegram (mobile/desktop)                    │
│                                                                    │
│  ┌────────────────────────┐         ┌────────────────────────┐   │
│  │   Stacker bot chat     │  taps   │  Mini App webview      │   │
│  │  (welcome + Play btn)  │ ──────► │  (React SPA, full UI)  │   │
│  └───────────┬────────────┘         └───────────┬────────────┘   │
└──────────────┼─────────────────────────────────┼─────────────────┘
               │ Telegram Bot API                │ HTTPS (initData in header)
               ▼                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                       MMPS Node process (Express)                 │
│                                                                    │
│  ┌──────────────────────┐   ┌────────────────────────────────┐   │
│  │ features/stacker     │   │ /stacker/*  (static SPA build) │   │
│  │  - launcher bot      │   │ /api/stacker/*  (REST)         │   │
│  │  - daily cron        │   │   └─ verifies initData on every│   │
│  │  - tiny grammY layer │   │      request                   │   │
│  └──────────┬───────────┘   └──────────────┬─────────────────┘   │
│             │                              │                      │
│             └────────────┬─────────────────┘                      │
│                          ▼                                        │
│            ┌──────────────────────────────┐                       │
│            │  shared/stacker              │                       │
│            │  - pure session engine       │ (no Telegram coupling)│
│            │  - Mongo repos               │                       │
│            └──────────────┬───────────────┘                       │
└─────────────────────────── │ ─────────────────────────────────────┘
                             ▼
                      MongoDB (Stacker db)
```

Three runtime jobs in one process:

1. **Bot launcher** (`features/stacker/`) — `/start`, `/play`, daily cron. Only sends Mini App launch buttons. No quiz rendering.
2. **REST API** (`/api/stacker/*`) — the Mini App's only backend. Verifies `initData` HMAC per request.
3. **Static SPA** (`/stacker/*`) — Vite build output served by Express.

Critical refactor: `shared/stacker/` becomes UI-agnostic. The session engine is pure (no `bot.api.sendMessage`). The REST controller calls it.

## 5. File layout

```
src/
├── features/stacker/
│   ├── stacker.config.ts              ← keep (trim BOT_ACTIONS to just PLAY; remove TOPIC/LEVEL/ANSWER;
│   │                                          trim commands to START + PLAY; remove STATS + STOP)
│   ├── stacker.controller.ts          ← shrink ~70% (drop topic/level pickers, answer callbacks, text grader)
│   ├── stacker.init.ts                ← keep; also registers REST routes + static SPA mount
│   ├── stacker-scheduler.service.ts   ← keep (daily cron now sends Mini App button)
│   ├── launcher.service.ts            ← RENAMED from stacker.service.ts; only "send Mini App button" methods
│   └── index.ts                       ← keep barrel
│
├── shared/stacker/
│   ├── types.ts                       ← keep as-is; remove Session.currentMessageId field (Mini App tracks its own state)
│   ├── seed-questions.ts              ← MOVED from features/stacker/
│   ├── session-engine.ts              ← NEW. Pure functions extracted from old stacker.service.ts:
│   │                                          beginSession, gradeAnswer, getNextQuestion,
│   │                                          finalizeSession, computeNewStreak,
│   │                                          ensureUserAndHearts, decrementHeart
│   │                                          (no grammY imports anywhere)
│   ├── mongo/
│   │   ├── constants.ts               ← keep
│   │   ├── users.repository.ts        ← keep
│   │   ├── questions.repository.ts    ← keep + add countByTopicAndLevel()
│   │   ├── sessions.repository.ts     ← keep (drop currentMessageId from Session)
│   │   ├── answers.repository.ts      ← keep
│   │   └── index.ts                   ← keep
│   └── index.ts                       ← keep barrel
│
├── shared/stacker-api/                ← NEW
│   ├── stacker.api.controller.ts      ← registerStackerApiRoutes(app)
│   ├── telegram-init-data.ts          ← verifyInitData(initData, botToken)
│   ├── auth.middleware.ts             ← Express middleware → attaches req.stackerUser
│   ├── dto.ts                         ← Zod schemas + UI-shaped DTOs
│   └── index.ts
│
└── index.ts                           ← register Stacker API + serve static SPA at /stacker
                                         (parallel to existing registerAuthRoutes)

apps/                                  ← NEW top-level dir (first npm workspace in MMPS)
└── stacker-web/                       ← NEW Vite + React + TS + Tailwind + Framer Motion
    ├── index.html
    ├── vite.config.ts                 ← base: '/stacker/', dev proxy /api → :3000
    ├── tailwind.config.ts
    ├── postcss.config.js
    ├── package.json                   ← workspace: "@mmps/stacker-web"
    ├── tsconfig.json
    └── src/
        ├── main.tsx
        ├── App.tsx                    ← router: / (picker), /round, /summary, /out-of-hearts
        ├── lib/
        │   ├── telegram.ts            ← thin wrapper over window.Telegram.WebApp
        │   └── api.ts                 ← fetch wrapper injecting initData header
        ├── pages/
        │   ├── TopicPickerPage.tsx
        │   ├── RoundPage.tsx
        │   ├── SummaryPage.tsx
        │   └── OutOfHeartsPage.tsx
        └── components/
            ├── QuestionCard.tsx       ← PORTED, expanded to 3 question types
            ├── OptionButton.tsx       ← PORTED as-is
            ├── ProgressBar.tsx        ← PORTED as-is
            ├── ExplanationPanel.tsx   ← PORTED as-is
            ├── XpNotification.tsx     ← PORTED as-is
            ├── SessionSummary.tsx     ← PORTED, add streak + hearts
            ├── CodeBlock.tsx          ← PORTED as-is
            ├── TopicCard.tsx          ← PORTED, add level pills + question counts
            ├── HeartsIndicator.tsx    ← NEW (animated decrement)
            └── FillInInput.tsx        ← NEW (text input for fill-in questions)

package.json                           ← add "workspaces": ["apps/*"]; add scripts:
                                          "dev:stacker-web": "vite --config apps/stacker-web/vite.config.ts"
                                          "build:stacker-web": "vite build --config apps/stacker-web/vite.config.ts"
                                          and wire build:stacker-web into the existing build step
```

Sibling `/Users/guzi/Projects/stacker/` repo: **archived** after components are ported. Not referenced at runtime.

## 6. REST API surface

All endpoints under `/api/stacker/*`. Every request requires `X-Telegram-Init-Data` header. Middleware verifies → attaches `req.stackerUser = { telegramUserId, chatId, username }`. No cookies, no JWTs.

| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/api/stacker/me`                  | Hydrate SPA on launch (user + active session if any) |
| `GET`  | `/api/stacker/topics`              | Topic + level menu with question counts |
| `POST` | `/api/stacker/sessions`            | Begin a round |
| `GET`  | `/api/stacker/sessions/:id/next`   | Fetch next question (or `complete: true`) |
| `POST` | `/api/stacker/sessions/:id/answer` | Submit answer, get verdict + explanation |
| `POST` | `/api/stacker/sessions/:id/abandon`| Player tapped "End round" |

### Request/response shapes

```ts
// GET /me
type MeResponse = {
  user: { telegramUserId: number; username?: string;
          xp: number; streakCount: number;
          heartsRemaining: number; heartsMax: number };
  activeSession: { id: string; topic: Topic; level: Level } | null;
};

// GET /topics
type TopicsResponse = {
  topics: Array<{
    topic: Topic; label: string;
    levels: Array<{ level: Level; label: string; questionCount: number }>;
  }>;
};

// POST /sessions
// body: { topic: Topic; level: Level }
type StartSessionResponse =
  | { ok: true; sessionId: string; totalQuestions: number }
  | { ok: false; reason: 'out_of_hearts' | 'no_questions' };

// GET /sessions/:id/next
type NextQuestionResponse =
  | { complete: false; question: QuestionDto;
      progress: { answered: number; remaining: number; total: number } }
  | { complete: true };

type QuestionDto =
  | { id: string; type: 'multiple_choice'; question: string; options: string[] }
  | { id: string; type: 'code_output';     question: string; codeSnippet: string; options: string[] }
  | { id: string; type: 'fill_in';         question: string; codeSnippet?: string };
// NOTE: correctOptionIndex / acceptedAnswers are NEVER sent to the client here

// POST /sessions/:id/answer
// body: { questionId: string; selectedOption?: number; text?: string }
type AnswerResponse = {
  correct: boolean;
  correctOptionIndex?: number;   // MC / code_output only
  correctAnswer?: string;        // fill_in only
  explanation: string;
  heartsRemaining: number;
  outOfHearts: boolean;          // if true, server already marked session abandoned
};

// POST /sessions/:id/abandon
type AbandonResponse = { ok: true };
```

### Server-enforced behavior

1. **One active session per chatId.** `POST /sessions` calls `abandonActiveSessions(chatId)` first.
2. **Out-of-hearts terminates server-side.** `AnswerResponse.outOfHearts: true` means session is already abandoned; SPA navigates to `OutOfHeartsPage`.
3. **`/next` after `complete: true` is idempotent.** SPA navigates to summary, which reads from `/me`.
4. **Server never trusts client XP, hearts, or session state.** All computed by the engine.
5. **Correct answers never appear in `/next`** — only in `/answer` responses.

### Not in MVP

No WebSockets/SSE (request/response is sufficient). No `/sessions/:id/summary` endpoint (the SPA reads updated totals from `/me`). No leaderboards. No per-question stats endpoint.

## 7. Auth — Telegram `initData` verification

The API trusts one thing: that the request came from a real Mini App session opened by a real Telegram user via the Stacker bot. No login, no JWT.

### Algorithm (canonical Telegram spec)

```ts
// shared/stacker-api/telegram-init-data.ts
import crypto from 'node:crypto';

const INIT_DATA_MAX_AGE_SEC = 86_400;

export type VerifiedInitData = {
  telegramUserId: number;
  username?: string;
  firstName?: string;
  authDate: number;
};

export function verifyInitData(initData: string, botToken: string): VerifiedInitData | null {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computed = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(hash, 'hex'))) return null;

  const authDate = Number(params.get('auth_date'));
  if (!authDate || Date.now() / 1000 - authDate > INIT_DATA_MAX_AGE_SEC) return null;

  const userJson = params.get('user');
  if (!userJson) return null;
  const user = JSON.parse(userJson) as { id: number; username?: string; first_name?: string };
  if (!user.id) return null;

  return { telegramUserId: user.id, username: user.username, firstName: user.first_name, authDate };
}
```

### Middleware

```ts
// shared/stacker-api/auth.middleware.ts
export async function stackerAuthMiddleware(req, res, next) {
  const initData = req.header('X-Telegram-Init-Data');
  if (!initData) return res.status(401).json({ error: 'missing_init_data' });

  const botToken = env.STACKER_TELEGRAM_BOT_TOKEN;
  if (!botToken) return res.status(500).json({ error: 'bot_not_configured' });

  const verified = verifyInitData(initData, botToken);
  if (!verified) return res.status(401).json({ error: 'invalid_init_data' });

  const chatId = verified.telegramUserId; // Mini App always launches from a private bot DM
  await upsertStackerUser(chatId, verified.telegramUserId, verified.username);
  req.stackerUser = { telegramUserId: verified.telegramUserId, chatId, username: verified.username };
  next();
}
```

Mounted as `app.use('/api/stacker', stackerAuthMiddleware)` before route registration.

### Client side

```ts
// apps/stacker-web/src/lib/api.ts
const initData = window.Telegram?.WebApp?.initData ?? '';
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': initData, ...init?.headers },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}
```

### Threat model

| Concern | Mitigation |
|---|---|
| Replay attack with stolen `initData` | 24h max age via `auth_date` check; HMAC tied to bot token |
| User impersonation via crafted `initData` | HMAC verifies; uncraftable without bot token |
| Reading correct answers from `/next` | Server omits correctness fields from `/next` payloads |
| XP/streak inflation by replaying `/answer` | Engine checks question is current for session; won't double-credit |
| Opening Mini App URL in a browser tab | `initData` is empty → 401 → SPA shows "Open in Telegram" screen |
| Bot token leakage | Already in `env`; never logged, never sent to client |

### Dev-mode escape hatch

When `NODE_ENV !== 'production' && env.STACKER_DEV_AUTH === '1'`, middleware accepts `X-Stacker-Dev-User=<telegramUserId>` to bypass HMAC. Lets you iterate the SPA in a normal browser. Gated by env flag — cannot ship to prod.

## 8. Data model deltas

Starting point: the current `matan/stacker` branch's schema in `shared/stacker/types.ts`. Almost everything stays.

### Keep unchanged

- `StackerUser` (chatId, telegramUserId, username, xp, streakCount, lastPlayedAt, heartsRemaining, heartsResetAt, notificationHour, notificationsEnabled, skillLevels, createdAt)
- `Question` discriminated union — all three variants (`multiple_choice`, `code_output`, `fill_in`)
- `AnswerLog` (chatId, sessionId, questionId, correct, answeredAt)
- All Mongo collection names + DB name (`Stacker`)
- All constants (`DAILY_HEARTS=3`, `SESSION_SIZE=5`, `DEFAULT_NOTIFICATION_HOUR=19`)

### Change

- `Session.currentMessageId?: number` — **DROP**. The Mini App tracks the current question in its own client state. The bot no longer sends per-question messages.
- `Session.currentQuestionId?: ObjectId` — **KEEP**. Server needs it to validate `/answer` requests target the active question.

### Add (one new repo method)

- `countByTopicAndLevel()` in `questions.repository.ts` — returns `Record<\`${Topic}:${Level}\`, number>` so `/api/stacker/topics` can show question counts and gray out empty buckets.

### Migration

None. Existing seed questions are already in MMPS format. If any user docs exist with `currentMessageId` set, leaving the field unused is harmless (Mongo schemaless). No data backfill.

## 9. Frontend stack & component port plan

### Stack choices

- **React 18** + TypeScript
- **Vite 5** (build + dev server with HMR)
- **Tailwind CSS 3** (sibling repo uses this; port utility classes verbatim)
- **Framer Motion 11** (already used by ported components)
- **Wouter** (or React Router) for the 4 routes — Wouter recommended for smaller bundle
- **No state management library** (`useState` + custom hooks; the SPA is small enough)
- **No data-fetching library** (`useEffect` + the `apiFetch` wrapper; ~6 endpoints, no caching needed in MVP)
- **`react-syntax-highlighter`** for code blocks (already used by sibling repo's `CodeBlock`)

### Telegram WebApp integration (`lib/telegram.ts`)

Thin wrapper over `window.Telegram.WebApp`:

```ts
export const tg = window.Telegram?.WebApp;
export const initData = tg?.initData ?? '';
export const themeParams = tg?.themeParams ?? {};
export const colorScheme = tg?.colorScheme ?? 'dark'; // 'light' | 'dark'

export function ready()       { tg?.ready(); }
export function expand()      { tg?.expand(); }
export function close()       { tg?.close(); }

export function hapticImpact(style: 'light' | 'medium' | 'heavy' = 'light') {
  tg?.HapticFeedback?.impactOccurred(style);
}
export function hapticSuccess() { tg?.HapticFeedback?.notificationOccurred('success'); }
export function hapticError()   { tg?.HapticFeedback?.notificationOccurred('error'); }

export function showBackButton(onClick: () => void) {
  tg?.BackButton?.onClick(onClick); tg?.BackButton?.show();
}
export function hideBackButton() { tg?.BackButton?.hide(); }
```

Hook `usePageLifecycle` in each page handles `BackButton` show/hide.

### Component port plan

| Component | Source | Action |
|---|---|---|
| `QuestionCard` | sibling | Expand discriminator to handle 3 question types (MC, code-output, fill-in). Code-output renders the snippet above options; fill-in renders `FillInInput` instead of `OptionButton` list. |
| `OptionButton` | sibling | Port as-is |
| `ProgressBar` | sibling | Port as-is |
| `ExplanationPanel` | sibling | Port as-is |
| `XpNotification` | sibling | Port as-is |
| `SessionSummary` | sibling | Add streak + hearts rows; pull data from `/me` after round completes |
| `CodeBlock` | sibling | Port as-is (`react-syntax-highlighter`) |
| `TopicCard` | sibling | Add level pills below topic name; show `questionCount` per level; gray out levels with 0 questions |
| `HeartsIndicator` | new | Row of 3 hearts (filled/empty), animated on decrement |
| `FillInInput` | new | Text input + "Submit" button; Enter submits; calls `POST /answer` with `text` |

All Tailwind classes from the sibling repo work as-is since both use Tailwind 3. Theme colors are pulled from `Telegram.WebApp.themeParams` and exposed as CSS vars so the SPA matches Telegram's light/dark mode automatically.

### Page flow

```
TopicPickerPage  (/)
  ├─ GET /me            → if activeSession exists, prompt "Resume?" or "End round?"
  ├─ GET /topics
  └─ tap topic+level    → POST /sessions → navigate to /round

RoundPage  (/round)
  ├─ GET /next                                  ← on mount + after each answer
  ├─ render QuestionCard for current question
  ├─ submit                                     → POST /answer
  │     ├─ correct=true  → XpNotification, "Next" button
  │     ├─ correct=false → ExplanationPanel + HeartsIndicator animation, "Next" button
  │     └─ outOfHearts=true → navigate to /out-of-hearts
  └─ GET /next returns complete=true → navigate to /summary

SummaryPage  (/summary)
  ├─ GET /me  (now has updated XP/streak/hearts)
  └─ render SessionSummary; "Play again" → navigate to /

OutOfHeartsPage  (/out-of-hearts)
  └─ "Come back tomorrow" + Telegram.WebApp.close()
```

## 10. Telegram bot surface

The bot is now a launcher. Almost all logic moves to the Mini App / API.

### Commands

| Command | Behavior |
|---|---|
| `/start` | `upsertStackerUser`, send welcome message with `web_app` button labeled "🎯 Play Stacker" → opens Mini App |
| `/play`  | Same as `/start` minus the welcome text — just the Mini App button |
| `/stop`  | **REMOVED** — round ending happens inside the Mini App |
| `/stats` | **REMOVED for MVP** — stats live inside the Mini App on the summary screen |

### Daily reminder cron

`stacker-scheduler.service.ts` keeps its existing cron (hourly tick, filters users by `notificationHour`). The message it sends changes:

- Same 3-tone copy as today (streak intact / streak broken / never played)
- The "Play now" button becomes a `web_app` button pointing at the Mini App URL

### Inline `web_app` button

```ts
const replyMarkup = {
  inline_keyboard: [[
    { text: '🎯 Play Stacker', web_app: { url: env.STACKER_MINI_APP_URL } },
  ]],
};
await this.bot.api.sendMessage(chatId, welcomeText, { reply_markup: replyMarkup });
```

`STACKER_MINI_APP_URL` is the public HTTPS URL where the SPA is served (e.g. `https://mmps.example.com/stacker/`). Must also be configured in BotFather → bot settings → Menu Button or via `setChatMenuButton` so a permanent "Play" menu button shows in the chat composer.

### `launcher.service.ts` (replaces `stacker.service.ts`)

```ts
export class StackerLauncherService {
  constructor(private readonly bot: Bot) {}

  async sendLauncher(chatId: number, opts?: { intro?: string }): Promise<void> {
    const text = opts?.intro ?? '🎯 Tap below to start a round.';
    await this.bot.api.sendMessage(chatId, text, {
      reply_markup: { inline_keyboard: [[
        { text: '🎯 Play Stacker', web_app: { url: env.STACKER_MINI_APP_URL } },
      ]] },
    });
  }

  async sendStreakReminder(user: StackerUser): Promise<void> {
    // existing 3-tone logic unchanged; reply_markup uses web_app button
  }
}
```

The old `beginSession`, `gradeButtonAnswer`, `gradeTextAnswer`, `applyAnswer`, `sendNextQuestion`, `finalizeSession`, `terminateOutOfHearts`, `renderQuestion`, `renderButtonResult`, `sendButtonQuestion`, `sendFillInQuestion` methods are **deleted from this class** and re-emerge as pure functions in `shared/stacker/session-engine.ts`.

## 11. Hosting & build

### Production

- Single `mmps` Node process. The Vite build of `apps/stacker-web/` outputs to `apps/stacker-web/dist/`.
- `src/index.ts` adds: `app.use('/stacker', express.static('apps/stacker-web/dist'))` and a catch-all `app.get('/stacker/*', (_req, res) => res.sendFile(path.resolve('apps/stacker-web/dist/index.html')))` for SPA routing.
- Heroku / current host's `npm run build` becomes `tsc && tsc-alias && npm run build:stacker-web`.
- `STACKER_MINI_APP_URL` in env points at `https://<your-host>/stacker/`.
- HTTPS is **required** for Telegram Mini Apps — `Procfile`/Heroku already provides it.

### Development

Two-process workflow:

```sh
# terminal 1 — MMPS API + bot
LOCAL_ACTIVE_BOT_ID=STACKER npm run dev

# terminal 2 — Vite dev server with HMR
npm run dev:stacker-web   # → http://localhost:5173
```

`vite.config.ts` proxies `/api/*` to `http://localhost:3000` so the SPA calls the local MMPS API. For real device testing inside Telegram, use `cloudflared tunnel --url http://localhost:3000` and point BotFather's Mini App URL at the tunnel.

### Workspaces setup

MMPS's root `package.json` adds:

```json
{
  "workspaces": ["apps/*"],
  "scripts": {
    "dev:stacker-web":   "npm run dev   --workspace=@mmps/stacker-web",
    "build:stacker-web": "npm run build --workspace=@mmps/stacker-web",
    "build":             "tsc && tsc-alias && npm run build:stacker-web"
  }
}
```

`apps/stacker-web/package.json` owns React/Vite/Tailwind/Framer deps so they don't pollute the MMPS root.

### Env vars added

| Name | Purpose |
|---|---|
| `STACKER_MINI_APP_URL` | Public HTTPS URL of the Mini App (e.g. `https://<host>/stacker/`) |
| `STACKER_DEV_AUTH`     | `"1"` to enable dev-mode `X-Stacker-Dev-User` bypass (non-prod only) |
| `STACKER_TELEGRAM_BOT_TOKEN` | Already exists |

## 12. MVP cuts & deferred work

### In MVP

- All 6 topics × 3 levels (existing seed data)
- All 3 question types (MC, code-output, fill-in)
- Hearts (3/day, lazy reset on first session of the day)
- XP per correct answer (20 XP)
- Streak (Jerusalem-timezone calendar days; only completed rounds count)
- Daily reminder cron (3-tone copy)
- Retake queue (wrong questions cycle back; round only ends when both queues empty)
- Out-of-hearts termination mid-round
- Mini App with Telegram theme + haptics + back button integration

### Deferred (not in MVP)

- **Leaderboards** (global, friends, weekly)
- **`/stats` command + dedicated stats screen** (XP graph, per-topic accuracy)
- **Settings UI** (toggle notifications, change reminder hour)
- **Profile / avatar from Telegram**
- **Daily / weekly challenges**
- **Question difficulty rating / spaced repetition beyond retake queue**
- **Sharing a round result back to a chat** (`switchInlineQuery`)
- **Sound effects / richer animations**
- **AI-generated question pipeline** (separate effort)
- **Offline support / PWA**

### Cuts from the existing branch (deleted, not deferred)

- All in-chat quiz rendering (`renderQuestion`, `renderButtonResult`, `sendButtonQuestion`, `sendFillInQuestion`)
- `/stop` command (round ending is in the Mini App)
- `BOT_ACTIONS.TOPIC`, `BOT_ACTIONS.LEVEL`, `BOT_ACTIONS.ANSWER`
- `Session.currentMessageId` field

## 13. Risks & open questions

| Risk | Mitigation |
|---|---|
| Mini App URL must be HTTPS — local dev requires tunneling | cloudflared tunnel in dev; document in README |
| First-time workspaces in MMPS — build pipeline / host might need tuning | Land workspaces in a precursor commit before adding the SPA; verify the existing build pipeline succeeds with workspaces enabled |
| Vite build adds ~10-20s to CI build time | Acceptable. If it bites, `vite build --mode=production` is fast enough; can later split SPA build into its own job. |
| Telegram clients on older mobile OSes may render webview inconsistently | Tailwind + standard React = wide compatibility. Test on iOS Telegram + Android Telegram before announcing. |
| `Telegram.WebApp.initData` empty in some launch paths (e.g. opened from a link, not bot button) | Middleware returns 401 → SPA shows "Open in Telegram" screen. No silent failure. |
| Bundle size — Framer + syntax highlighter aren't tiny | Lazy-load `react-syntax-highlighter` only on pages that render code. Target initial bundle < 200 KB gzipped. |

### Open questions for follow-up (not blocking the spec)

1. **Public production hostname?** Need it to set `STACKER_MINI_APP_URL` and configure BotFather. (`Procfile`/`Aptfile` suggest Heroku — confirm domain so the BotFather Mini App URL points at the right place from day one.)
2. **Do we want a Mini App "Menu Button" set globally via `setChatMenuButton`** so users can launch from the chat composer too, not just from `/play` replies? Recommended yes; trivial addition.
3. **Should the daily reminder offer "Snooze 1 hour"?** Cut from chat-bot version; same reason holds (1h snooze doesn't compose with hourly cron). Keep cut.

## 14. Acceptance criteria (for the eventual implementation plan)

The implementation is complete when:

1. `npm run build` succeeds end-to-end (TS + SPA build).
2. `LOCAL_ACTIVE_BOT_ID=STACKER npm run dev` boots the bot + API + serves the SPA at `http://localhost:3000/stacker/`.
3. `/start` in the bot sends a "🎯 Play Stacker" `web_app` button.
4. Tapping the button (via cloudflared tunnel) opens the Mini App inside Telegram and loads the topic picker.
5. Picking topic + level starts a round; the first question renders.
6. Correct MC answer: green flash, XP notification, "Next" advances.
7. Wrong MC answer: shake, correct answer revealed, explanation panel, heart decrements with animation, question re-queued.
8. Code-output and fill-in questions render and grade correctly.
9. Completing all questions (including the retake queue) navigates to summary with correct XP/streak/hearts totals.
10. Losing all 3 hearts mid-round navigates to OutOfHeartsPage; session is marked abandoned in Mongo; no XP awarded.
11. Daily reminder cron sends a `web_app` button instead of inline callback buttons.
12. Opening the Mini App URL in a normal browser tab returns 401 from the API; SPA shows "Open in Telegram" screen.
13. The sibling `/Users/guzi/Projects/stacker/` repo is referenced nowhere at runtime.
14. No `bot.api.sendMessage` calls remain in `shared/stacker/` (engine is pure).
