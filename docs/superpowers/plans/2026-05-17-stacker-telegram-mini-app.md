# Stacker Telegram Mini App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Stacker from a chat-based Telegram bot into a Telegram Mini App: extract the existing game engine into pure functions, expose it via a REST API with `initData` HMAC auth, build a React+Vite SPA served by MMPS Express, shrink the bot to a launcher.

**Architecture:** One Node process, one deploy. `shared/stacker/session-engine.ts` (pure functions, no grammY). `shared/stacker-api/` (Express middleware + `/api/stacker/*` REST endpoints). `apps/stacker-web/` (Vite + React SPA, first npm workspace in MMPS). The bot in `features/stacker/` only sends `web_app` launch buttons.

**Tech Stack:** TypeScript 5.9, Node 24.x, Express 5, MongoDB (native driver), grammY (Telegram bot), Jest + ts-jest (backend tests), React 18, Vite 5, Tailwind 3, Framer Motion 11, Wouter (routing), react-syntax-highlighter, npm workspaces.

**Spec:** `docs/superpowers/specs/2026-05-16-stacker-telegram-mini-app-design.md`

---

## File Structure

### Backend changes inside `src/`

| Action | Path | Responsibility |
|---|---|---|
| Modify | `src/shared/stacker/types.ts` | Remove `Session.currentMessageId` field |
| Create | `src/shared/stacker/session-engine.ts` | Pure session engine — begin/grade/next/finalize/streak/hearts. No grammY imports. |
| Create | `src/shared/stacker/session-engine.spec.ts` | Unit tests for `computeNewStreak` + answer correctness helpers |
| Move | `src/features/stacker/seed-questions.ts` → `src/shared/stacker/seed-questions.ts` | Question data lives alongside the rest of the domain |
| Modify | `src/shared/stacker/mongo/questions.repository.ts` | Add `countByTopicAndLevel()` |
| Modify | `src/shared/stacker/index.ts` | Re-export session engine + seed-questions |
| Create | `src/shared/stacker-api/telegram-init-data.ts` | `verifyInitData()` HMAC verification |
| Create | `src/shared/stacker-api/telegram-init-data.spec.ts` | Crypto verification tests |
| Create | `src/shared/stacker-api/auth.middleware.ts` | Express middleware → attaches `req.stackerUser` |
| Create | `src/shared/stacker-api/dto.ts` | Zod schemas + DTO types for API responses |
| Create | `src/shared/stacker-api/stacker.api.controller.ts` | `registerStackerApiRoutes(app)` — all 6 endpoints |
| Create | `src/shared/stacker-api/index.ts` | Barrel |
| Modify | `src/features/stacker/stacker.config.ts` | Trim commands to START + PLAY; drop BOT_ACTIONS.TOPIC/LEVEL/ANSWER |
| Rename + shrink | `src/features/stacker/stacker.service.ts` → `launcher.service.ts` | Only `sendLauncher` + `sendStreakReminder` (both send `web_app` buttons) |
| Modify | `src/features/stacker/stacker.controller.ts` | Strip topic/level pickers, answer callback, text grader |
| Modify | `src/features/stacker/stacker-scheduler.service.ts` | Calls renamed launcher service |
| Modify | `src/features/stacker/stacker.init.ts` | Also calls `registerStackerApiRoutes(app)` + mounts SPA static dir |
| Delete | `src/features/stacker/seed-questions.ts` | Moved to shared |
| Modify | `src/index.ts` | Pass `app` to `initStacker(app)` |

### Frontend (new top-level)

| Action | Path | Responsibility |
|---|---|---|
| Modify | `package.json` | Add `workspaces: ["apps/*"]`; add scripts; wire build |
| Create | `apps/stacker-web/package.json` | `@mmps/stacker-web` workspace |
| Create | `apps/stacker-web/tsconfig.json` | TS config |
| Create | `apps/stacker-web/vite.config.ts` | base `/stacker/`, dev proxy `/api` → `:3000` |
| Create | `apps/stacker-web/tailwind.config.ts` | Tailwind setup |
| Create | `apps/stacker-web/postcss.config.js` | PostCSS for Tailwind |
| Create | `apps/stacker-web/index.html` | Entry HTML with Telegram WebApp script |
| Create | `apps/stacker-web/src/main.tsx` | React mount |
| Create | `apps/stacker-web/src/index.css` | Tailwind + Telegram theme CSS vars |
| Create | `apps/stacker-web/src/App.tsx` | Wouter router |
| Create | `apps/stacker-web/src/types.ts` | DTO types mirroring backend |
| Create | `apps/stacker-web/src/lib/telegram.ts` | `window.Telegram.WebApp` wrapper |
| Create | `apps/stacker-web/src/lib/api.ts` | `apiFetch` with initData header |
| Create | `apps/stacker-web/src/components/CodeBlock.tsx` | Syntax-highlighted code |
| Create | `apps/stacker-web/src/components/ProgressBar.tsx` | Round progress |
| Create | `apps/stacker-web/src/components/HeartsIndicator.tsx` | Hearts row |
| Create | `apps/stacker-web/src/components/XpNotification.tsx` | +XP toast |
| Create | `apps/stacker-web/src/components/OptionButton.tsx` | MC/code-output answer button |
| Create | `apps/stacker-web/src/components/FillInInput.tsx` | Text input for fill-in |
| Create | `apps/stacker-web/src/components/ExplanationPanel.tsx` | Why-it-was-wrong panel |
| Create | `apps/stacker-web/src/components/QuestionCard.tsx` | Renders any of 3 question types |
| Create | `apps/stacker-web/src/components/TopicCard.tsx` | Topic + level pills with counts |
| Create | `apps/stacker-web/src/components/SessionSummary.tsx` | Round-complete screen |
| Create | `apps/stacker-web/src/pages/TopicPickerPage.tsx` | `/` route |
| Create | `apps/stacker-web/src/pages/RoundPage.tsx` | `/round` route |
| Create | `apps/stacker-web/src/pages/SummaryPage.tsx` | `/summary` route |
| Create | `apps/stacker-web/src/pages/OutOfHeartsPage.tsx` | `/out-of-hearts` route |

---

## Task Execution Order

Phases run sequentially; tasks within a phase can be checkpointed and reviewed.

- **Phase 1 — Backend refactor (no behavior change):** Tasks 1-5
- **Phase 2 — API & Auth:** Tasks 6-10
- **Phase 3 — Bot slimming:** Tasks 11-14
- **Phase 4 — Frontend scaffold:** Tasks 15-18
- **Phase 5 — Frontend lib + types:** Tasks 19-20
- **Phase 6 — Components:** Tasks 21-25
- **Phase 7 — Pages + router:** Tasks 26-29
- **Phase 8 — Wiring + smoke test:** Tasks 30-32

---

## Phase 1 — Backend refactor

### Task 1: Move `seed-questions.ts` from features → shared

**Files:**
- Create: `src/shared/stacker/seed-questions.ts`
- Delete: `src/features/stacker/seed-questions.ts`
- Modify: `src/shared/stacker/index.ts`
- Modify: `src/features/stacker/stacker.init.ts:4` (import path)

- [ ] **Step 1: Copy the file to the new location**

Create `src/shared/stacker/seed-questions.ts` with this content (same as current `features/stacker/seed-questions.ts` but with internal imports adjusted):

```ts
import { Logger } from '@core/utils';
import { countQuestions, insertQuestions } from './mongo';
import { LEVELS, Question, QUESTION_TYPES, TOPICS } from './types';

const logger = new Logger('seed-questions');

const SEED_QUESTIONS: readonly Question[] = [
  {
    topic: TOPICS.JAVASCRIPT,
    level: LEVELS.INTERMEDIATE,
    type: QUESTION_TYPES.MULTIPLE_CHOICE,
    question: 'Which method returns a new array without mutating the original?',
    options: ['push', 'splice', 'map', 'sort'],
    correctOptionIndex: 2,
    explanation: '`map` returns a new array of the same length. `push` and `splice` mutate in place; `sort` mutates the array it is called on.',
    tags: ['arrays', 'immutability'],
  },
  {
    topic: TOPICS.JAVASCRIPT,
    level: LEVELS.INTERMEDIATE,
    type: QUESTION_TYPES.CODE_OUTPUT,
    question: 'What does this code print?',
    codeSnippet: 'console.log([1, 2, 3].map(Number.parseInt));',
    options: ['[1, 2, 3]', '[1, NaN, NaN]', '[NaN, NaN, NaN]', 'TypeError'],
    correctOptionIndex: 1,
    explanation: '`map` passes (value, index) to the callback. `parseInt("1", 0)` → 1; `parseInt("2", 1)` → NaN (radix 1 invalid); `parseInt("3", 2)` → NaN (3 not valid in base 2).',
    tags: ['parseInt', 'map', 'gotcha'],
  },
  {
    topic: TOPICS.JAVASCRIPT,
    level: LEVELS.INTERMEDIATE,
    type: QUESTION_TYPES.FILL_IN,
    question: 'What does `typeof null` return? (one word)',
    acceptedAnswers: ['object'],
    explanation: '`typeof null === "object"` — a historical bug from JavaScript’s first implementation that was never fixed for backwards compatibility.',
    tags: ['typeof', 'gotcha'],
  },
];

export async function seedQuestionsIfEmpty(): Promise<void> {
  const existing = await countQuestions();
  if (existing > 0) {
    logger.log(`Questions collection has ${existing} docs — skipping seed`);
    return;
  }
  await insertQuestions(SEED_QUESTIONS);
  logger.log(`Seeded ${SEED_QUESTIONS.length} starter questions`);
}
```

- [ ] **Step 2: Delete the old file**

Run: `rm src/features/stacker/seed-questions.ts`

- [ ] **Step 3: Export from shared barrel**

Modify `src/shared/stacker/index.ts` to:

```ts
export * from './mongo';
export * from './seed-questions';
export * from './types';
```

- [ ] **Step 4: Fix the import in stacker.init.ts**

In `src/features/stacker/stacker.init.ts`, change line 4 from:

```ts
import { seedQuestionsIfEmpty } from './seed-questions';
```

to (remove that line entirely — it's already available via `@shared/stacker`). Then change line 3 from:

```ts
import { DB_NAME } from '@shared/stacker';
```

to:

```ts
import { DB_NAME, seedQuestionsIfEmpty } from '@shared/stacker';
```

- [ ] **Step 5: Verify the build**

Run: `npm run build`
Expected: builds cleanly, no errors.

- [ ] **Step 6: Commit**

```bash
git add src/shared/stacker/seed-questions.ts src/shared/stacker/index.ts src/features/stacker/stacker.init.ts
git rm src/features/stacker/seed-questions.ts
git commit -m "refactor(stacker): move seed-questions into shared/stacker"
```

---

### Task 2: Remove `currentMessageId` from `Session` type

**Files:**
- Modify: `src/shared/stacker/types.ts:91`
- Modify: `src/features/stacker/stacker.service.ts` (any references — will be deleted in Phase 3, but make it build now)

- [ ] **Step 1: Remove the field from the Session type**

In `src/shared/stacker/types.ts`, in the `Session` type definition, delete line 91:

```ts
  readonly currentMessageId?: number;
```

The resulting Session type should have: `_id`, `chatId`, `topic`, `level`, `initialSize`, `queue`, `retakeQueue`, `currentQuestionId`, `correctCount`, `wrongCount`, `status`, `startedAt`, `endedAt`.

- [ ] **Step 2: Fix any compile errors in stacker.service.ts**

Run: `npx tsc --noEmit`

If TypeScript reports errors in `src/features/stacker/stacker.service.ts` about `currentMessageId`:

- In `gradeButtonAnswer`, change `session.currentMessageId !== messageId` to `false` (this whole method gets deleted in Phase 3 — keep it building for now)
- Wherever `currentMessageId` is set or read, comment out that line with `// TODO: deleted in Phase 3` until it's fully removed in Task 12

- [ ] **Step 3: Verify build still passes**

Run: `npm run build`
Expected: builds cleanly.

- [ ] **Step 4: Commit**

```bash
git add src/shared/stacker/types.ts src/features/stacker/stacker.service.ts
git commit -m "refactor(stacker): drop Session.currentMessageId — Mini App tracks client-side"
```

---

### Task 3: Add `countByTopicAndLevel` to questions repo

**Files:**
- Modify: `src/shared/stacker/mongo/questions.repository.ts`

- [ ] **Step 1: Add the function**

Append to `src/shared/stacker/mongo/questions.repository.ts`:

```ts
export type TopicLevelKey = `${Topic}:${Level}`;

export async function countByTopicAndLevel(): Promise<Record<TopicLevelKey, number>> {
  const rows = await getCollection()
    .aggregate<{ _id: { topic: Topic; level: Level }; count: number }>([
      { $group: { _id: { topic: '$topic', level: '$level' }, count: { $sum: 1 } } },
    ])
    .toArray();
  const out = {} as Record<TopicLevelKey, number>;
  for (const row of rows) {
    out[`${row._id.topic}:${row._id.level}` as TopicLevelKey] = row.count;
  }
  return out;
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add src/shared/stacker/mongo/questions.repository.ts
git commit -m "feat(stacker): add countByTopicAndLevel for topic picker UI"
```

---

### Task 4: Extract pure session engine

**Files:**
- Create: `src/shared/stacker/session-engine.ts`

This task extracts the *pure logic* from `stacker.service.ts` (the methods that don't call `bot.api.*`). The grammY-coupled methods stay in `stacker.service.ts` for now; they get deleted in Phase 3.

- [ ] **Step 1: Create the engine file**

Create `src/shared/stacker/session-engine.ts`:

```ts
import { ObjectId } from 'mongodb';
import { getDateString } from '@core/utils';
import {
  abandonActiveSessions,
  createSession,
  getActiveSession,
  getQuestionById,
  getStackerUser,
  logAnswer,
  sampleQuestions,
  updateSession,
  updateStackerUser,
  upsertStackerUser,
} from './mongo';
import {
  DAILY_HEARTS,
  Level,
  Question,
  QUESTION_TYPES,
  SESSION_SIZE,
  Session,
  StackerUser,
  Topic,
} from './types';

export const XP_PER_CORRECT = 20;

export type BeginSessionResult =
  | { ok: true; session: Session; user: StackerUser }
  | { ok: false; reason: 'out_of_hearts' | 'no_questions' };

export async function beginSession(
  chatId: number,
  telegramUserId: number,
  username: string | undefined,
  topic: Topic,
  level: Level,
): Promise<BeginSessionResult> {
  await abandonActiveSessions(chatId);
  const user = await ensureUserAndHearts(chatId, telegramUserId, username);
  if (user.heartsRemaining <= 0) return { ok: false, reason: 'out_of_hearts' };

  const questions = await sampleQuestions(topic, level, SESSION_SIZE);
  if (questions.length === 0) return { ok: false, reason: 'no_questions' };

  const queue = questions.map((q) => q._id!);
  const session = await createSession({
    chatId,
    topic,
    level,
    initialSize: queue.length,
    queue,
    retakeQueue: [],
    correctCount: 0,
    wrongCount: 0,
    status: 'active',
    startedAt: new Date(),
  });
  return { ok: true, session, user };
}

export type NextQuestionResult =
  | { complete: false; question: Question; session: Session;
      progress: { answered: number; remaining: number; total: number } }
  | { complete: true; session: Session };

export async function advanceToNextQuestion(session: Session): Promise<NextQuestionResult> {
  const queue = session.queue.slice();
  const retakeQueue = session.retakeQueue.slice();

  let nextId: ObjectId | undefined;
  if (queue.length > 0) nextId = queue.shift();
  else if (retakeQueue.length > 0) nextId = retakeQueue.shift();

  if (!nextId) return { complete: true, session };

  const question = await getQuestionById(nextId);
  if (!question) {
    await updateSession(session._id!, { queue, retakeQueue });
    return advanceToNextQuestion({ ...session, queue, retakeQueue });
  }

  await updateSession(session._id!, {
    queue, retakeQueue, currentQuestionId: question._id,
  });

  const answered = session.correctCount + session.wrongCount;
  const remaining = queue.length + retakeQueue.length + 1;
  const total = session.initialSize + session.wrongCount; // wrongs add to total length
  return {
    complete: false,
    question,
    session: { ...session, queue, retakeQueue, currentQuestionId: question._id },
    progress: { answered, remaining, total },
  };
}

export type GradeResult = {
  correct: boolean;
  session: Session;
  user: StackerUser;
  outOfHearts: boolean;
  explanation: string;
  correctOptionIndex?: number;
  correctAnswer?: string;
};

export async function gradeAnswer(params: {
  chatId: number;
  sessionId: ObjectId;
  questionId: ObjectId;
  selectedOption?: number;
  text?: string;
}): Promise<GradeResult | null> {
  const session = await getActiveSession(params.chatId);
  if (!session || !session._id!.equals(params.sessionId)) return null;
  if (!session.currentQuestionId || !session.currentQuestionId.equals(params.questionId)) return null;

  const question = await getQuestionById(params.questionId);
  if (!question) return null;

  const correct = isAnswerCorrect(question, params);
  await logAnswer(params.chatId, session._id!, question._id!, correct);

  const retakeQueue = correct ? session.retakeQueue.slice() : [...session.retakeQueue, question._id!];
  const correctCount = correct ? session.correctCount + 1 : session.correctCount;
  const wrongCount = correct ? session.wrongCount : session.wrongCount + 1;
  await updateSession(session._id!, { retakeQueue, correctCount, wrongCount });

  let user = (await getStackerUser(params.chatId))!;
  let outOfHearts = false;
  if (!correct) {
    const heartsLeft = Math.max(0, user.heartsRemaining - 1);
    await updateStackerUser(params.chatId, { heartsRemaining: heartsLeft });
    user = { ...user, heartsRemaining: heartsLeft };
    if (heartsLeft <= 0) {
      await updateSession(session._id!, { status: 'abandoned', endedAt: new Date() });
      outOfHearts = true;
    }
  }

  return {
    correct,
    session: { ...session, retakeQueue, correctCount, wrongCount, status: outOfHearts ? 'abandoned' : 'active' },
    user,
    outOfHearts,
    explanation: question.explanation,
    correctOptionIndex: question.type === QUESTION_TYPES.FILL_IN ? undefined : question.correctOptionIndex,
    correctAnswer: question.type === QUESTION_TYPES.FILL_IN ? question.acceptedAnswers[0] : undefined,
  };
}

export type FinalizeResult = {
  xpEarned: number;
  totalXp: number;
  newStreak: number;
  streakChanged: boolean;
};

export async function finalizeSession(chatId: number, session: Session): Promise<FinalizeResult> {
  await updateSession(session._id!, { status: 'completed', endedAt: new Date() });
  const user = await getStackerUser(chatId);
  const xpEarned = session.correctCount * XP_PER_CORRECT;
  const { newStreak, isNewDay } = computeNewStreak(user?.streakCount ?? 0, user?.lastPlayedAt);
  const totalXp = (user?.xp ?? 0) + xpEarned;
  await updateStackerUser(chatId, { xp: totalXp, streakCount: newStreak, lastPlayedAt: new Date() });
  return { xpEarned, totalXp, newStreak, streakChanged: isNewDay };
}

export async function ensureUserAndHearts(
  chatId: number,
  telegramUserId: number,
  username: string | undefined,
): Promise<StackerUser> {
  const user = await upsertStackerUser(chatId, telegramUserId, username);
  const todayStr = getDateString();
  const lastResetStr = user.heartsResetAt ? getDateString(user.heartsResetAt) : null;
  if (lastResetStr !== todayStr) {
    const now = new Date();
    await updateStackerUser(chatId, { heartsRemaining: DAILY_HEARTS, heartsResetAt: now });
    return { ...user, heartsRemaining: DAILY_HEARTS, heartsResetAt: now };
  }
  return user;
}

export function normalizeFillInAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/^[`'"]+|[`'"]+$/g, '').trim();
}

export function isFillInCorrect(input: string, acceptedAnswers: readonly string[]): boolean {
  const normalized = normalizeFillInAnswer(input);
  return acceptedAnswers.some((a) => normalizeFillInAnswer(a) === normalized);
}

export function isAnswerCorrect(
  question: Question,
  params: { selectedOption?: number; text?: string },
): boolean {
  if (question.type === QUESTION_TYPES.FILL_IN) {
    return params.text !== undefined && isFillInCorrect(params.text, question.acceptedAnswers);
  }
  return params.selectedOption === question.correctOptionIndex;
}

export function computeNewStreak(
  currentStreak: number,
  lastPlayedAt: Date | undefined,
): { newStreak: number; isNewDay: boolean } {
  if (!lastPlayedAt) return { newStreak: 1, isNewDay: true };
  const todayStr = getDateString();
  const lastStr = getDateString(lastPlayedAt);
  if (lastStr === todayStr) return { newStreak: currentStreak, isNewDay: false };
  const dayDiff = Math.round(
    (Date.parse(`${todayStr}T00:00:00Z`) - Date.parse(`${lastStr}T00:00:00Z`)) / 86_400_000,
  );
  if (dayDiff === 1) return { newStreak: currentStreak + 1, isNewDay: true };
  return { newStreak: 1, isNewDay: true };
}
```

- [ ] **Step 2: Export from shared barrel**

Modify `src/shared/stacker/index.ts` to also export the engine:

```ts
export * from './mongo';
export * from './seed-questions';
export * from './session-engine';
export * from './types';
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: clean build. `stacker.service.ts` still works (engine is in addition, not replacing yet).

- [ ] **Step 4: Commit**

```bash
git add src/shared/stacker/session-engine.ts src/shared/stacker/index.ts
git commit -m "feat(stacker): extract pure session engine for API reuse"
```

---

### Task 5: Test the engine's pure helpers

**Files:**
- Create: `src/shared/stacker/session-engine.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `src/shared/stacker/session-engine.spec.ts`:

```ts
import { computeNewStreak, isAnswerCorrect, isFillInCorrect, normalizeFillInAnswer } from './session-engine';
import { LEVELS, Question, QUESTION_TYPES, TOPICS } from './types';

describe('normalizeFillInAnswer()', () => {
  test.each([
    { input: 'Object', expected: 'object' },
    { input: '  object  ', expected: 'object' },
    { input: '"object"', expected: 'object' },
    { input: '`object`', expected: 'object' },
    { input: '"  Object  "', expected: 'object' },
  ])('normalizes $input → $expected', ({ input, expected }) => {
    expect(normalizeFillInAnswer(input)).toEqual(expected);
  });
});

describe('isFillInCorrect()', () => {
  it('matches case-insensitively', () => {
    expect(isFillInCorrect('OBJECT', ['object'])).toBe(true);
  });
  it('matches with surrounding quotes', () => {
    expect(isFillInCorrect('"object"', ['object'])).toBe(true);
  });
  it('returns false on mismatch', () => {
    expect(isFillInCorrect('string', ['object'])).toBe(false);
  });
  it('accepts any of multiple accepted answers', () => {
    expect(isFillInCorrect('nil', ['null', 'nil'])).toBe(true);
  });
});

describe('isAnswerCorrect()', () => {
  const mcQuestion: Question = {
    topic: TOPICS.JAVASCRIPT,
    level: LEVELS.BEGINNER,
    type: QUESTION_TYPES.MULTIPLE_CHOICE,
    question: 'q',
    options: ['a', 'b', 'c'],
    correctOptionIndex: 1,
    explanation: 'e',
  };
  const fillInQuestion: Question = {
    topic: TOPICS.JAVASCRIPT,
    level: LEVELS.BEGINNER,
    type: QUESTION_TYPES.FILL_IN,
    question: 'q',
    acceptedAnswers: ['object'],
    explanation: 'e',
  };

  it('MC correct when selectedOption matches', () => {
    expect(isAnswerCorrect(mcQuestion, { selectedOption: 1 })).toBe(true);
  });
  it('MC wrong on mismatch', () => {
    expect(isAnswerCorrect(mcQuestion, { selectedOption: 0 })).toBe(false);
  });
  it('MC wrong on missing selectedOption', () => {
    expect(isAnswerCorrect(mcQuestion, {})).toBe(false);
  });
  it('fill-in correct on text match', () => {
    expect(isAnswerCorrect(fillInQuestion, { text: 'object' })).toBe(true);
  });
  it('fill-in wrong on missing text', () => {
    expect(isAnswerCorrect(fillInQuestion, {})).toBe(false);
  });
});

describe('computeNewStreak()', () => {
  it('starts at 1 when no lastPlayedAt', () => {
    expect(computeNewStreak(0, undefined)).toEqual({ newStreak: 1, isNewDay: true });
  });
  it('keeps streak when last played today', () => {
    const today = new Date();
    expect(computeNewStreak(5, today)).toEqual({ newStreak: 5, isNewDay: false });
  });
  it('increments streak when last played yesterday', () => {
    const yesterday = new Date(Date.now() - 86_400_000);
    expect(computeNewStreak(5, yesterday)).toEqual({ newStreak: 6, isNewDay: true });
  });
  it('resets streak to 1 when gap > 1 day', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000);
    expect(computeNewStreak(10, threeDaysAgo)).toEqual({ newStreak: 1, isNewDay: true });
  });
});
```

- [ ] **Step 2: Run and verify pass**

Run: `npx jest src/shared/stacker/session-engine.spec.ts`
Expected: All tests PASS (the engine is already implemented in Task 4).

- [ ] **Step 3: Commit**

```bash
git add src/shared/stacker/session-engine.spec.ts
git commit -m "test(stacker): cover engine pure helpers"
```

---

## Phase 2 — API & Auth

### Task 6: Implement `verifyInitData` with tests

**Files:**
- Create: `src/shared/stacker-api/telegram-init-data.ts`
- Create: `src/shared/stacker-api/telegram-init-data.spec.ts`
- Create: `src/shared/stacker-api/index.ts`

- [ ] **Step 1: Write failing tests**

Create `src/shared/stacker-api/telegram-init-data.spec.ts`:

```ts
import crypto from 'node:crypto';
import { verifyInitData } from './telegram-init-data';

const BOT_TOKEN = '123456:test-token';

function signInitData(params: Record<string, string>, token: string): string {
  const sorted = Object.entries(params).sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = sorted.map(([k, v]) => `${k}=${v}`).join('\n');
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  return new URLSearchParams({ ...params, hash }).toString();
}

describe('verifyInitData()', () => {
  it('verifies a valid payload', () => {
    const initData = signInitData(
      {
        user: JSON.stringify({ id: 12345, username: 'testuser', first_name: 'Test' }),
        auth_date: String(Math.floor(Date.now() / 1000)),
        query_id: 'AAH123',
      },
      BOT_TOKEN,
    );
    const result = verifyInitData(initData, BOT_TOKEN);
    expect(result).toMatchObject({ telegramUserId: 12345, username: 'testuser', firstName: 'Test' });
  });

  it('rejects a tampered payload', () => {
    const valid = signInitData(
      { user: JSON.stringify({ id: 12345 }), auth_date: String(Math.floor(Date.now() / 1000)) },
      BOT_TOKEN,
    );
    const tampered = valid.replace('12345', '99999');
    expect(verifyInitData(tampered, BOT_TOKEN)).toBeNull();
  });

  it('rejects payload signed with wrong token', () => {
    const initData = signInitData(
      { user: JSON.stringify({ id: 12345 }), auth_date: String(Math.floor(Date.now() / 1000)) },
      'wrong:token',
    );
    expect(verifyInitData(initData, BOT_TOKEN)).toBeNull();
  });

  it('rejects payload older than 24h', () => {
    const oldDate = Math.floor(Date.now() / 1000) - 86_500;
    const initData = signInitData(
      { user: JSON.stringify({ id: 12345 }), auth_date: String(oldDate) },
      BOT_TOKEN,
    );
    expect(verifyInitData(initData, BOT_TOKEN)).toBeNull();
  });

  it('rejects payload missing hash', () => {
    expect(verifyInitData('user=abc&auth_date=123', BOT_TOKEN)).toBeNull();
  });

  it('rejects payload missing user', () => {
    const initData = signInitData(
      { auth_date: String(Math.floor(Date.now() / 1000)) },
      BOT_TOKEN,
    );
    expect(verifyInitData(initData, BOT_TOKEN)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL (module doesn't exist)**

Run: `npx jest src/shared/stacker-api/telegram-init-data.spec.ts`
Expected: FAIL — "Cannot find module './telegram-init-data'"

- [ ] **Step 3: Implement `verifyInitData`**

Create `src/shared/stacker-api/telegram-init-data.ts`:

```ts
import crypto from 'node:crypto';

const INIT_DATA_MAX_AGE_SEC = 86_400;

export type VerifiedInitData = {
  readonly telegramUserId: number;
  readonly username?: string;
  readonly firstName?: string;
  readonly authDate: number;
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

  if (computed.length !== hash.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(hash, 'hex'))) return null;

  const authDate = Number(params.get('auth_date'));
  if (!authDate || Date.now() / 1000 - authDate > INIT_DATA_MAX_AGE_SEC) return null;

  const userJson = params.get('user');
  if (!userJson) return null;
  let user: { id?: number; username?: string; first_name?: string };
  try {
    user = JSON.parse(userJson);
  } catch {
    return null;
  }
  if (!user.id) return null;

  return {
    telegramUserId: user.id,
    username: user.username,
    firstName: user.first_name,
    authDate,
  };
}
```

- [ ] **Step 4: Create barrel**

Create `src/shared/stacker-api/index.ts`:

```ts
export * from './telegram-init-data';
```

- [ ] **Step 5: Run tests — expect PASS**

Run: `npx jest src/shared/stacker-api/telegram-init-data.spec.ts`
Expected: All 6 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/shared/stacker-api/
git commit -m "feat(stacker-api): verify Telegram Mini App initData HMAC"
```

---

### Task 7: Auth middleware

**Files:**
- Create: `src/shared/stacker-api/auth.middleware.ts`
- Modify: `src/shared/stacker-api/index.ts`

- [ ] **Step 1: Create middleware**

Create `src/shared/stacker-api/auth.middleware.ts`:

```ts
import type { NextFunction, Request, Response } from 'express';
import { env } from 'node:process';
import { Logger } from '@core/utils';
import { upsertStackerUser } from '@shared/stacker';
import { verifyInitData } from './telegram-init-data';

const logger = new Logger('stackerAuthMiddleware');

export type StackerRequestUser = {
  readonly telegramUserId: number;
  readonly chatId: number;
  readonly username?: string;
};

declare module 'express-serve-static-core' {
  interface Request {
    stackerUser?: StackerRequestUser;
  }
}

export async function stackerAuthMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Dev escape hatch — only when explicitly enabled
  if (env.NODE_ENV !== 'production' && env.STACKER_DEV_AUTH === '1') {
    const devUserId = req.header('X-Stacker-Dev-User');
    if (devUserId) {
      const id = Number(devUserId);
      if (!Number.isFinite(id)) {
        res.status(400).json({ error: 'invalid_dev_user' });
        return;
      }
      await upsertStackerUser(id, id, 'devuser');
      req.stackerUser = { telegramUserId: id, chatId: id, username: 'devuser' };
      next();
      return;
    }
  }

  const initData = req.header('X-Telegram-Init-Data');
  if (!initData) {
    res.status(401).json({ error: 'missing_init_data' });
    return;
  }

  const botToken = env.STACKER_TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    logger.error('STACKER_TELEGRAM_BOT_TOKEN not configured');
    res.status(500).json({ error: 'bot_not_configured' });
    return;
  }

  const verified = verifyInitData(initData, botToken);
  if (!verified) {
    res.status(401).json({ error: 'invalid_init_data' });
    return;
  }

  const chatId = verified.telegramUserId;
  await upsertStackerUser(chatId, verified.telegramUserId, verified.username);
  req.stackerUser = { telegramUserId: verified.telegramUserId, chatId, username: verified.username };
  next();
}
```

- [ ] **Step 2: Export from barrel**

Modify `src/shared/stacker-api/index.ts` to:

```ts
export * from './auth.middleware';
export * from './telegram-init-data';
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add src/shared/stacker-api/auth.middleware.ts src/shared/stacker-api/index.ts
git commit -m "feat(stacker-api): add initData auth middleware with dev escape hatch"
```

---

### Task 8: DTO schemas

**Files:**
- Create: `src/shared/stacker-api/dto.ts`
- Modify: `src/shared/stacker-api/index.ts`

- [ ] **Step 1: Create DTOs**

Create `src/shared/stacker-api/dto.ts`:

```ts
import { z } from 'zod';
import type { Level, Topic } from '@shared/stacker';

// --- Request schemas ---

export const StartSessionBody = z.object({
  topic: z.string(),
  level: z.string(),
});
export type StartSessionBody = z.infer<typeof StartSessionBody>;

export const AnswerBody = z.object({
  questionId: z.string(),
  selectedOption: z.number().int().optional(),
  text: z.string().optional(),
});
export type AnswerBody = z.infer<typeof AnswerBody>;

// --- Response DTOs (UI-shaped; no Mongo internals) ---

export type MeResponse = {
  user: {
    telegramUserId: number;
    username?: string;
    xp: number;
    streakCount: number;
    heartsRemaining: number;
    heartsMax: number;
  };
  activeSession: { id: string; topic: Topic; level: Level } | null;
};

export type TopicsResponse = {
  topics: Array<{
    topic: Topic;
    label: string;
    levels: Array<{ level: Level; label: string; questionCount: number }>;
  }>;
};

export type StartSessionResponse =
  | { ok: true; sessionId: string; totalQuestions: number }
  | { ok: false; reason: 'out_of_hearts' | 'no_questions' };

export type QuestionDto =
  | { id: string; type: 'multiple_choice'; question: string; options: readonly string[] }
  | { id: string; type: 'code_output'; question: string; codeSnippet: string; options: readonly string[] }
  | { id: string; type: 'fill_in'; question: string; codeSnippet?: string };

export type NextQuestionResponse =
  | { complete: false; question: QuestionDto; progress: { answered: number; remaining: number; total: number } }
  | { complete: true };

export type AnswerResponse = {
  correct: boolean;
  correctOptionIndex?: number;
  correctAnswer?: string;
  explanation: string;
  heartsRemaining: number;
  outOfHearts: boolean;
};

export type AbandonResponse = { ok: true };
```

- [ ] **Step 2: Export from barrel**

Modify `src/shared/stacker-api/index.ts` to:

```ts
export * from './auth.middleware';
export * from './dto';
export * from './telegram-init-data';
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add src/shared/stacker-api/dto.ts src/shared/stacker-api/index.ts
git commit -m "feat(stacker-api): add DTO schemas for Mini App contract"
```

---

### Task 9: REST controller — all endpoints

**Files:**
- Create: `src/shared/stacker-api/stacker.api.controller.ts`
- Modify: `src/shared/stacker-api/index.ts`

- [ ] **Step 1: Implement the controller**

Create `src/shared/stacker-api/stacker.api.controller.ts`:

```ts
import type { Express, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { Logger } from '@core/utils';
import {
  advanceToNextQuestion,
  beginSession,
  countByTopicAndLevel,
  DAILY_HEARTS,
  finalizeSession,
  getActiveSession,
  getStackerUser,
  gradeAnswer,
  Level,
  LEVELS,
  abandonActiveSessions,
  QUESTION_TYPES,
  Topic,
  TOPICS,
} from '@shared/stacker';
import { stackerAuthMiddleware } from './auth.middleware';
import {
  AbandonResponse,
  AnswerBody,
  AnswerResponse,
  MeResponse,
  NextQuestionResponse,
  QuestionDto,
  StartSessionBody,
  StartSessionResponse,
  TopicsResponse,
} from './dto';

const logger = new Logger('StackerApiController');

const TOPIC_LABELS: Record<Topic, string> = {
  [TOPICS.JAVASCRIPT]: 'JavaScript',
  [TOPICS.TYPESCRIPT]: 'TypeScript',
  [TOPICS.NODE]: 'Node.js',
  [TOPICS.PYTHON]: 'Python',
  [TOPICS.ALGORITHMS]: 'Algorithms',
  [TOPICS.SQL]: 'SQL',
};

const LEVEL_LABELS: Record<Level, string> = {
  [LEVELS.BEGINNER]: 'Beginner',
  [LEVELS.INTERMEDIATE]: 'Intermediate',
  [LEVELS.ADVANCED]: 'Advanced',
};

function isValidTopic(v: string): v is Topic {
  return Object.values(TOPICS).includes(v as Topic);
}
function isValidLevel(v: string): v is Level {
  return Object.values(LEVELS).includes(v as Level);
}

function toQuestionDto(q: Awaited<ReturnType<typeof advanceToNextQuestion>> & { complete: false }): QuestionDto {
  const question = q.question;
  const id = question._id!.toHexString();
  if (question.type === QUESTION_TYPES.MULTIPLE_CHOICE) {
    return { id, type: 'multiple_choice', question: question.question, options: question.options };
  }
  if (question.type === QUESTION_TYPES.CODE_OUTPUT) {
    return { id, type: 'code_output', question: question.question, codeSnippet: question.codeSnippet, options: question.options };
  }
  return { id, type: 'fill_in', question: question.question, codeSnippet: question.codeSnippet };
}

export function registerStackerApiRoutes(app: Express): void {
  app.use('/api/stacker', stackerAuthMiddleware);

  // GET /api/stacker/me
  app.get('/api/stacker/me', async (req: Request, res: Response<MeResponse>) => {
    const { chatId } = req.stackerUser!;
    const user = await getStackerUser(chatId);
    const active = await getActiveSession(chatId);
    res.json({
      user: {
        telegramUserId: user!.telegramUserId,
        username: user!.username,
        xp: user!.xp,
        streakCount: user!.streakCount,
        heartsRemaining: user!.heartsRemaining,
        heartsMax: DAILY_HEARTS,
      },
      activeSession: active ? { id: active._id!.toHexString(), topic: active.topic, level: active.level } : null,
    });
  });

  // GET /api/stacker/topics
  app.get('/api/stacker/topics', async (_req: Request, res: Response<TopicsResponse>) => {
    const counts = await countByTopicAndLevel();
    res.json({
      topics: Object.values(TOPICS).map((topic) => ({
        topic,
        label: TOPIC_LABELS[topic],
        levels: Object.values(LEVELS).map((level) => ({
          level,
          label: LEVEL_LABELS[level],
          questionCount: counts[`${topic}:${level}`] ?? 0,
        })),
      })),
    });
  });

  // POST /api/stacker/sessions
  app.post('/api/stacker/sessions', async (req: Request, res: Response<StartSessionResponse>) => {
    const { chatId, telegramUserId, username } = req.stackerUser!;
    const parsed = StartSessionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ ok: false, reason: 'no_questions' });
      return;
    }
    if (!isValidTopic(parsed.data.topic) || !isValidLevel(parsed.data.level)) {
      res.status(400).json({ ok: false, reason: 'no_questions' });
      return;
    }
    const result = await beginSession(chatId, telegramUserId, username, parsed.data.topic, parsed.data.level);
    if (!result.ok) {
      res.json(result);
      return;
    }
    res.json({ ok: true, sessionId: result.session._id!.toHexString(), totalQuestions: result.session.initialSize });
  });

  // GET /api/stacker/sessions/:id/next
  app.get('/api/stacker/sessions/:id/next', async (req: Request, res: Response<NextQuestionResponse>) => {
    const { chatId } = req.stackerUser!;
    const sessionId = req.params.id;
    const session = await getActiveSession(chatId);
    if (!session || session._id!.toHexString() !== sessionId) {
      res.json({ complete: true });
      return;
    }
    const result = await advanceToNextQuestion(session);
    if (result.complete) {
      await finalizeSession(chatId, result.session);
      res.json({ complete: true });
      return;
    }
    res.json({ complete: false, question: toQuestionDto(result), progress: result.progress });
  });

  // POST /api/stacker/sessions/:id/answer
  app.post('/api/stacker/sessions/:id/answer', async (req: Request, res: Response<AnswerResponse | { error: string }>) => {
    const { chatId } = req.stackerUser!;
    const parsed = AnswerBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_body' });
      return;
    }
    const sessionId = new ObjectId(req.params.id);
    let questionId: ObjectId;
    try {
      questionId = new ObjectId(parsed.data.questionId);
    } catch {
      res.status(400).json({ error: 'invalid_question_id' });
      return;
    }
    const result = await gradeAnswer({
      chatId,
      sessionId,
      questionId,
      selectedOption: parsed.data.selectedOption,
      text: parsed.data.text,
    });
    if (!result) {
      res.status(409).json({ error: 'no_active_question' });
      return;
    }
    res.json({
      correct: result.correct,
      correctOptionIndex: result.correctOptionIndex,
      correctAnswer: result.correctAnswer,
      explanation: result.explanation,
      heartsRemaining: result.user.heartsRemaining,
      outOfHearts: result.outOfHearts,
    });
  });

  // POST /api/stacker/sessions/:id/abandon
  app.post('/api/stacker/sessions/:id/abandon', async (req: Request, res: Response<AbandonResponse>) => {
    const { chatId } = req.stackerUser!;
    await abandonActiveSessions(chatId);
    res.json({ ok: true });
  });

  logger.log('Stacker API routes registered at /api/stacker/*');
}
```

- [ ] **Step 2: Export from barrel**

Modify `src/shared/stacker-api/index.ts` to:

```ts
export * from './auth.middleware';
export * from './dto';
export * from './stacker.api.controller';
export * from './telegram-init-data';
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add src/shared/stacker-api/stacker.api.controller.ts src/shared/stacker-api/index.ts
git commit -m "feat(stacker-api): add REST endpoints (me, topics, sessions CRUD)"
```

---

### Task 10: Smoke test the API with dev auth

**Files:** No code changes — manual verification.

- [ ] **Step 1: Wire the API into Express temporarily for smoke test**

Add to `src/index.ts` immediately after `registerAuthRoutes(app);`:

```ts
import { registerStackerApiRoutes } from '@shared/stacker-api';
import { createMongoConnection as _ensureStackerDb } from '@core/mongo';
import { DB_NAME as STACKER_DB } from '@shared/stacker';

await _ensureStackerDb(STACKER_DB);
registerStackerApiRoutes(app);
```

(This is temporary scaffolding — Task 14 moves it into `stacker.init.ts` cleanly.)

- [ ] **Step 2: Start the server with dev auth**

Run: `STACKER_DEV_AUTH=1 STACKER_TELEGRAM_BOT_TOKEN=test npm run dev`

Wait for "Server is running on http://localhost:3000/".

- [ ] **Step 3: Hit `/api/stacker/me` and `/api/stacker/topics`**

Run in a separate terminal:

```bash
curl -s -H "X-Stacker-Dev-User: 999" http://localhost:3000/api/stacker/me | head -c 500
echo
curl -s -H "X-Stacker-Dev-User: 999" http://localhost:3000/api/stacker/topics | head -c 500
```

Expected: JSON responses. `/me` returns user object with xp=0, streakCount=0, heartsRemaining=3, activeSession=null. `/topics` returns 6 topics × 3 levels with question counts (mostly 0 except JS/intermediate which has 3 from seed).

- [ ] **Step 4: Revert the temporary wiring**

Revert the additions to `src/index.ts` from Step 1. Stop the dev server.

- [ ] **Step 5: Commit verification**

No code change to commit — proceed to Phase 3.

---

## Phase 3 — Bot slimming

### Task 11: Trim `stacker.config.ts`

**Files:**
- Modify: `src/features/stacker/stacker.config.ts`

- [ ] **Step 1: Replace contents**

Replace `src/features/stacker/stacker.config.ts` with:

```ts
import type { TelegramBotConfig } from '@services/telegram';

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'STACKER',
  name: 'Stacker 🧠',
  token: 'STACKER_TELEGRAM_BOT_TOKEN',
  commands: {
    START: { command: '/start', description: 'Start', hide: true },
    PLAY: { command: '/play', description: '🎯 Play Stacker' },
  },
};
```

(Removed: `BOT_ACTIONS` enum, `INLINE_KEYBOARD_SEPARATOR`, `TOPIC_LABELS`, `LEVEL_LABELS`, STATS + STOP commands. Labels now live in the API controller; actions are gone — the Mini App handles all interaction.)

- [ ] **Step 2: Verify build (will fail in service.ts and controller.ts — that's fine, next tasks fix them)**

Run: `npx tsc --noEmit`
Expected: errors in `stacker.service.ts` and `stacker.controller.ts` referencing removed exports. Those files are rewritten next.

- [ ] **Step 3: Do NOT commit yet — wait for Task 13**

---

### Task 12: Replace `stacker.service.ts` with `launcher.service.ts`

**Files:**
- Delete: `src/features/stacker/stacker.service.ts`
- Create: `src/features/stacker/launcher.service.ts`

- [ ] **Step 1: Create the launcher service**

Create `src/features/stacker/launcher.service.ts`:

```ts
import type { Bot } from 'grammy';
import { env } from 'node:process';
import { getDateString, Logger } from '@core/utils';
import { StackerUser } from '@shared/stacker';

export class StackerLauncherService {
  private readonly logger = new Logger(StackerLauncherService.name);

  constructor(private readonly bot: Bot) {}

  async sendLauncher(chatId: number, opts?: { intro?: string }): Promise<void> {
    const url = env.STACKER_MINI_APP_URL;
    if (!url) {
      this.logger.error('STACKER_MINI_APP_URL not configured');
      await this.bot.api.sendMessage(chatId, '⚙️ Stacker is being set up. Try again soon.');
      return;
    }
    const text = opts?.intro ?? '🎯 Tap below to start a round.';
    await this.bot.api.sendMessage(chatId, text, {
      reply_markup: { inline_keyboard: [[{ text: '🎯 Play Stacker', web_app: { url } }]] },
    });
  }

  async sendStreakReminder(user: StackerUser): Promise<void> {
    const todayStr = getDateString();
    const lastStr = user.lastPlayedAt ? getDateString(user.lastPlayedAt) : null;
    if (lastStr === todayStr) return;

    const dayDiff = lastStr
      ? Math.round((Date.parse(`${todayStr}T00:00:00Z`) - Date.parse(`${lastStr}T00:00:00Z`)) / 86_400_000)
      : Infinity;
    const streakIntact = dayDiff === 1 && user.streakCount > 0;

    const message = streakIntact
      ? `🔥 Your streak is *${user.streakCount} day${user.streakCount === 1 ? '' : 's'}* — don't break it!\n\nOne quick round to keep it alive?`
      : user.streakCount > 0
        ? `💔 Your *${user.streakCount}-day* streak ended.\n\nStart a fresh one with a quick round?`
        : '👋 Ready for a round of programming questions?\n\nBuild a streak by playing daily.';

    await this.bot.api.sendMessage(user.chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: env.STACKER_MINI_APP_URL
        ? { inline_keyboard: [[{ text: '🎯 Play now', web_app: { url: env.STACKER_MINI_APP_URL } }]] }
        : undefined,
    });
  }
}
```

- [ ] **Step 2: Delete the old service**

Run: `rm src/features/stacker/stacker.service.ts`

- [ ] **Step 3: Do NOT commit yet — wait for Task 13**

---

### Task 13: Rewrite `stacker.controller.ts`

**Files:**
- Modify: `src/features/stacker/stacker.controller.ts`

- [ ] **Step 1: Replace contents**

Replace `src/features/stacker/stacker.controller.ts` with:

```ts
import type { Bot, Context } from 'grammy';
import { Logger } from '@core/utils';
import { getMessageData } from '@services/telegram';
import { upsertStackerUser } from '@shared/stacker';
import { BOT_CONFIG } from './stacker.config';
import { StackerLauncherService } from './launcher.service';

export class StackerController {
  private readonly logger = new Logger(StackerController.name);

  constructor(
    private readonly launcher: StackerLauncherService,
    private readonly bot: Bot,
  ) {}

  init(): void {
    const { START, PLAY } = BOT_CONFIG.commands;
    this.bot.command(START.command.replace('/', ''), (ctx) => this.startHandler(ctx));
    this.bot.command(PLAY.command.replace('/', ''), (ctx) => this.playHandler(ctx));
  }

  private async startHandler(ctx: Context): Promise<void> {
    const { chatId, userDetails } = getMessageData(ctx);
    await upsertStackerUser(chatId, userDetails.telegramUserId, userDetails.username);
    const intro = [
      '👋 *Welcome to Stacker* — bite-sized programming practice.',
      '',
      '🎯 6 topics · 3 levels · 5 questions per round',
      '❤️ 3 hearts a day · 🔥 build a streak by playing daily',
      '',
      'Tap below to play.',
    ].join('\n');
    await this.launcher.sendLauncher(chatId, { intro });
  }

  private async playHandler(ctx: Context): Promise<void> {
    const { chatId } = getMessageData(ctx);
    await this.launcher.sendLauncher(chatId);
  }
}
```

- [ ] **Step 2: Update scheduler imports**

Modify `src/features/stacker/stacker-scheduler.service.ts`:

Change line 5 from:
```ts
import { StackerService } from './stacker.service';
```
to:
```ts
import { StackerLauncherService } from './launcher.service';
```

Change line 10's parameter type from `StackerService` to `StackerLauncherService`. Change line 22's `this.stackerService.sendStreakReminder` to `this.launcher.sendStreakReminder`. Rename the constructor param from `stackerService` to `launcher` throughout.

Final file should look like:

```ts
import cron from 'node-cron';
import { DEFAULT_TIMEZONE } from '@core/config';
import { getHourInTimezone, Logger } from '@core/utils';
import { findUsersForReminder } from '@shared/stacker';
import { StackerLauncherService } from './launcher.service';

export class StackerSchedulerService {
  private readonly logger = new Logger(StackerSchedulerService.name);

  constructor(private readonly launcher: StackerLauncherService) {}

  init(): void {
    cron.schedule('0 * * * *', () => this.handleHourlyReminders(), { timezone: DEFAULT_TIMEZONE });
  }

  private async handleHourlyReminders(): Promise<void> {
    try {
      const hour = getHourInTimezone(DEFAULT_TIMEZONE);
      const users = await findUsersForReminder(hour);
      if (users.length === 0) return;
      const results = await Promise.allSettled(users.map((user) => this.launcher.sendStreakReminder(user)));
      const failed = results.filter((r) => r.status === 'rejected').length;
      this.logger.log(`Sent streak reminders to ${users.length - failed}/${users.length} users at hour ${hour}`);
    } catch (err) {
      this.logger.error(`Failed hourly reminder run, ${err}`);
    }
  }
}
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: clean (errors from `stacker.init.ts` will remain — fixed in next task).

- [ ] **Step 4: Do NOT commit yet — wait for Task 14**

---

### Task 14: Update `stacker.init.ts` to register API + static SPA

**Files:**
- Modify: `src/features/stacker/stacker.init.ts`
- Modify: `src/features/stacker/index.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Update init to accept Express app**

Replace `src/features/stacker/stacker.init.ts` with:

```ts
import type { Express } from 'express';
import path from 'node:path';
import express from 'express';
import { env } from 'node:process';
import { createMongoConnection } from '@core/mongo';
import { Logger } from '@core/utils';
import { provideTelegramBot } from '@services/telegram';
import { DB_NAME, seedQuestionsIfEmpty } from '@shared/stacker';
import { registerStackerApiRoutes } from '@shared/stacker-api';
import { StackerLauncherService } from './launcher.service';
import { StackerSchedulerService } from './stacker-scheduler.service';
import { BOT_CONFIG } from './stacker.config';
import { StackerController } from './stacker.controller';

const logger = new Logger('initStacker');

export async function initStacker(app: Express): Promise<void> {
  await createMongoConnection(DB_NAME);
  await seedQuestionsIfEmpty();

  const bot = provideTelegramBot(BOT_CONFIG);
  const launcher = new StackerLauncherService(bot);
  const controller = new StackerController(launcher, bot);
  const scheduler = new StackerSchedulerService(launcher);

  controller.init();
  scheduler.init();

  registerStackerApiRoutes(app);

  // Serve Vite-built SPA at /stacker/*
  const spaDist = path.resolve('apps/stacker-web/dist');
  app.use('/stacker', express.static(spaDist));
  app.get('/stacker/*', (_req, res) => {
    res.sendFile(path.join(spaDist, 'index.html'));
  });
  logger.log(`Stacker SPA served from ${spaDist} at /stacker/*`);
}
```

- [ ] **Step 2: Update barrel**

Modify `src/features/stacker/index.ts`:

```ts
export { BOT_CONFIG } from './stacker.config';
export { initStacker } from './stacker.init';
```

- [ ] **Step 3: Update `src/index.ts` to pass `app` to `initStacker`**

In `src/index.ts`, find the line:

```ts
shouldInitBot(woltConfig) && (await initWolt());
```

Add an import near the existing feature imports (alphabetical):

```ts
import { initStacker, BOT_CONFIG as stackerConfig } from '@features/stacker';
```

And in the bot init block, add a new line in alphabetical position (between `langly` and `wolt`):

```ts
shouldInitBot(stackerConfig) && (await initStacker(app));
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: clean build.

- [ ] **Step 5: Commit Phase 3 changes**

```bash
git add src/features/stacker/ src/index.ts
git rm src/features/stacker/stacker.service.ts
git commit -m "refactor(stacker): shrink bot to Mini App launcher; register API + static SPA"
```

---

## Phase 4 — Frontend scaffold

### Task 15: Enable npm workspaces

**Files:**
- Modify: `package.json`
- Create: `apps/stacker-web/package.json`

- [ ] **Step 1: Add workspaces to root package.json**

In `/Users/guzi/Projects/mmps/package.json`, add `"workspaces": ["apps/*"],` immediately after the `"main"` line (after line 5). The result:

```json
{
  "name": "mmps",
  "version": "1.0.0",
  "description": "Express TypeScript application",
  "main": "dist/index.js",
  "workspaces": ["apps/*"],
  "type": "commonjs",
  ...
}
```

- [ ] **Step 2: Create the workspace package.json**

Create `apps/stacker-web/package.json`:

```json
{
  "name": "@mmps/stacker-web",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "framer-motion": "^11.5.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-syntax-highlighter": "^15.5.0",
    "wouter": "^3.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@types/react-syntax-highlighter": "^15.5.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.9.0",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 3: Install dependencies**

Run: `npm install`
Expected: installs workspace; creates `apps/stacker-web/node_modules` (or hoists to root).

- [ ] **Step 4: Verify root build still works**

Run: `npm run build`
Expected: clean build (frontend hasn't added code yet, just package).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json apps/stacker-web/package.json
git commit -m "chore: enable npm workspaces; add apps/stacker-web workspace"
```

---

### Task 16: Vite + TS config

**Files:**
- Create: `apps/stacker-web/vite.config.ts`
- Create: `apps/stacker-web/tsconfig.json`
- Create: `apps/stacker-web/tailwind.config.ts`
- Create: `apps/stacker-web/postcss.config.js`
- Create: `apps/stacker-web/index.html`

- [ ] **Step 1: Vite config**

Create `apps/stacker-web/vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/stacker/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
```

- [ ] **Step 2: TS config**

Create `apps/stacker-web/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "allowImportingTsExtensions": false,
    "noEmit": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Tailwind config**

Create `apps/stacker-web/tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 4: PostCSS config**

Create `apps/stacker-web/postcss.config.js`:

```js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

- [ ] **Step 5: Entry HTML**

Create `apps/stacker-web/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>Stacker</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Commit**

```bash
git add apps/stacker-web/vite.config.ts apps/stacker-web/tsconfig.json apps/stacker-web/tailwind.config.ts apps/stacker-web/postcss.config.js apps/stacker-web/index.html
git commit -m "chore(stacker-web): add Vite + TS + Tailwind config"
```

---

### Task 17: Root build wiring

**Files:**
- Modify: `package.json` (scripts)

- [ ] **Step 1: Add scripts**

Modify the `scripts` section of `/Users/guzi/Projects/mmps/package.json`. Change the existing `build` and add the stacker-web scripts:

```json
"scripts": {
  "build": "tsc && tsc-alias && npm run build:stacker-web",
  "build:stacker-web": "npm run build --workspace=@mmps/stacker-web",
  "dev:stacker-web": "npm run dev --workspace=@mmps/stacker-web",
  "start": "node dist/index.js",
  ...
}
```

(Keep everything else as-is.)

- [ ] **Step 2: Verify (will fail — no src yet)**

Run: `npm run build`
Expected: Backend TS build succeeds, frontend Vite build fails on "no src" — that's fine, next task adds it.

If the failure is in the backend, fix that first.

- [ ] **Step 3: Do NOT commit yet — wait for Task 18**

---

### Task 18: Minimal "hello" SPA to prove the toolchain

**Files:**
- Create: `apps/stacker-web/src/main.tsx`
- Create: `apps/stacker-web/src/App.tsx`
- Create: `apps/stacker-web/src/index.css`

- [ ] **Step 1: CSS**

Create `apps/stacker-web/src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: dark;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--tg-theme-bg-color, #0f172a);
  color: var(--tg-theme-text-color, #f1f5f9);
}
```

- [ ] **Step 2: Main entry**

Create `apps/stacker-web/src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 3: Placeholder App**

Create `apps/stacker-web/src/App.tsx`:

```tsx
export function App() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <h1 className="text-3xl font-bold">Stacker</h1>
    </div>
  );
}
```

- [ ] **Step 4: Run full build**

Run: `npm run build`
Expected: backend TS build passes; Vite build outputs `apps/stacker-web/dist/` with `index.html` + assets.

- [ ] **Step 5: Smoke test the served SPA**

Run: `npm start` (in one terminal)
Then in another: `curl -s http://localhost:3000/stacker/ | head -c 200`
Expected: HTML starts with `<!doctype html>` and references `/stacker/assets/...`. Stop the server.

(Note: this requires `STACKER_TELEGRAM_BOT_TOKEN` env var to be set for the bot to init. If you don't have one, temporarily set `LOCAL_ACTIVE_BOT_ID=NONE` to skip bot init and just test static serving.)

- [ ] **Step 6: Commit**

```bash
git add package.json apps/stacker-web/src/
git commit -m "feat(stacker-web): scaffold React+Vite SPA with placeholder App"
```

---

## Phase 5 — Frontend lib + types

### Task 19: Telegram WebApp wrapper + types

**Files:**
- Create: `apps/stacker-web/src/lib/telegram.ts`
- Create: `apps/stacker-web/src/types.ts`

- [ ] **Step 1: Telegram wrapper**

Create `apps/stacker-web/src/lib/telegram.ts`:

```ts
type ThemeParams = {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
};

type TelegramWebApp = {
  initData: string;
  themeParams: ThemeParams;
  colorScheme: 'light' | 'dark';
  ready: () => void;
  expand: () => void;
  close: () => void;
  HapticFeedback?: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy') => void;
    notificationOccurred: (type: 'success' | 'error' | 'warning') => void;
  };
  BackButton?: {
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export const tg: TelegramWebApp | undefined = window.Telegram?.WebApp;
export const initData = tg?.initData ?? '';
export const colorScheme = tg?.colorScheme ?? 'dark';

export function tgReady() { tg?.ready(); }
export function tgExpand() { tg?.expand(); }
export function tgClose() { tg?.close(); }
export function hapticLight() { tg?.HapticFeedback?.impactOccurred('light'); }
export function hapticSuccess() { tg?.HapticFeedback?.notificationOccurred('success'); }
export function hapticError() { tg?.HapticFeedback?.notificationOccurred('error'); }

export function showBackButton(onClick: () => void): () => void {
  tg?.BackButton?.onClick(onClick);
  tg?.BackButton?.show();
  return () => {
    tg?.BackButton?.offClick(onClick);
    tg?.BackButton?.hide();
  };
}
```

- [ ] **Step 2: Mirror backend DTOs**

Create `apps/stacker-web/src/types.ts`:

```ts
export type Topic = 'javascript' | 'typescript' | 'node' | 'python' | 'algorithms' | 'sql';
export type Level = 'beginner' | 'intermediate' | 'advanced';

export type MeResponse = {
  user: {
    telegramUserId: number;
    username?: string;
    xp: number;
    streakCount: number;
    heartsRemaining: number;
    heartsMax: number;
  };
  activeSession: { id: string; topic: Topic; level: Level } | null;
};

export type TopicsResponse = {
  topics: Array<{
    topic: Topic;
    label: string;
    levels: Array<{ level: Level; label: string; questionCount: number }>;
  }>;
};

export type StartSessionResponse =
  | { ok: true; sessionId: string; totalQuestions: number }
  | { ok: false; reason: 'out_of_hearts' | 'no_questions' };

export type QuestionDto =
  | { id: string; type: 'multiple_choice'; question: string; options: readonly string[] }
  | { id: string; type: 'code_output'; question: string; codeSnippet: string; options: readonly string[] }
  | { id: string; type: 'fill_in'; question: string; codeSnippet?: string };

export type NextQuestionResponse =
  | { complete: false; question: QuestionDto; progress: { answered: number; remaining: number; total: number } }
  | { complete: true };

export type AnswerResponse = {
  correct: boolean;
  correctOptionIndex?: number;
  correctAnswer?: string;
  explanation: string;
  heartsRemaining: number;
  outOfHearts: boolean;
};
```

- [ ] **Step 3: Verify Vite build**

Run: `npm run build:stacker-web`
Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add apps/stacker-web/src/lib/telegram.ts apps/stacker-web/src/types.ts
git commit -m "feat(stacker-web): add Telegram WebApp wrapper and DTO types"
```

---

### Task 20: API fetch wrapper

**Files:**
- Create: `apps/stacker-web/src/lib/api.ts`

- [ ] **Step 1: Implement**

Create `apps/stacker-web/src/lib/api.ts`:

```ts
import { initData } from './telegram';
import type {
  AnswerResponse,
  MeResponse,
  NextQuestionResponse,
  StartSessionResponse,
  TopicsResponse,
  Topic,
  Level,
} from '../types';

const DEV_USER_ID = import.meta.env.DEV ? import.meta.env.VITE_DEV_USER_ID : undefined;

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init?.headers as Record<string, string>) ?? {}),
  };
  if (initData) headers['X-Telegram-Init-Data'] = initData;
  else if (DEV_USER_ID) headers['X-Stacker-Dev-User'] = String(DEV_USER_ID);

  const res = await fetch(`/api${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status} ${path}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  me: () => apiFetch<MeResponse>('/stacker/me'),
  topics: () => apiFetch<TopicsResponse>('/stacker/topics'),
  startSession: (topic: Topic, level: Level) =>
    apiFetch<StartSessionResponse>('/stacker/sessions', {
      method: 'POST',
      body: JSON.stringify({ topic, level }),
    }),
  nextQuestion: (sessionId: string) =>
    apiFetch<NextQuestionResponse>(`/stacker/sessions/${sessionId}/next`),
  answer: (sessionId: string, body: { questionId: string; selectedOption?: number; text?: string }) =>
    apiFetch<AnswerResponse>(`/stacker/sessions/${sessionId}/answer`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  abandon: (sessionId: string) =>
    apiFetch<{ ok: true }>(`/stacker/sessions/${sessionId}/abandon`, { method: 'POST' }),
};
```

- [ ] **Step 2: Verify build**

Run: `npm run build:stacker-web`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add apps/stacker-web/src/lib/api.ts
git commit -m "feat(stacker-web): add typed API client with initData header"
```

---

## Phase 6 — Components

### Task 21: Primitive components (CodeBlock, ProgressBar, HeartsIndicator, XpNotification)

**Files:**
- Create: `apps/stacker-web/src/components/CodeBlock.tsx`
- Create: `apps/stacker-web/src/components/ProgressBar.tsx`
- Create: `apps/stacker-web/src/components/HeartsIndicator.tsx`
- Create: `apps/stacker-web/src/components/XpNotification.tsx`

- [ ] **Step 1: CodeBlock**

Create `apps/stacker-web/src/components/CodeBlock.tsx`:

```tsx
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

type Props = { code: string; language?: string };

export function CodeBlock({ code, language = 'javascript' }: Props) {
  return (
    <div className="rounded-lg overflow-hidden my-3 text-sm">
      <SyntaxHighlighter language={language} style={vscDarkPlus} customStyle={{ margin: 0, padding: '1rem' }}>
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
```

- [ ] **Step 2: ProgressBar**

Create `apps/stacker-web/src/components/ProgressBar.tsx`:

```tsx
type Props = { answered: number; total: number };

export function ProgressBar({ answered, total }: Props) {
  const pct = total === 0 ? 0 : Math.min(100, Math.round((answered / total) * 100));
  return (
    <div className="w-full">
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full bg-primary-500 transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
      <div className="text-xs text-gray-400 mt-1 text-center">
        {answered} / {total}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: HeartsIndicator**

Create `apps/stacker-web/src/components/HeartsIndicator.tsx`:

```tsx
import { motion } from 'framer-motion';

type Props = { remaining: number; max: number };

export function HeartsIndicator({ remaining, max }: Props) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < remaining;
        return (
          <motion.span
            key={i}
            animate={filled ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0.3 }}
            transition={{ duration: 0.3 }}
            className="text-xl"
          >
            {filled ? '❤️' : '🤍'}
          </motion.span>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: XpNotification**

Create `apps/stacker-web/src/components/XpNotification.tsx`:

```tsx
import { motion } from 'framer-motion';

type Props = { xp: number };

export function XpNotification({ xp }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-6 left-1/2 -translate-x-1/2 bg-primary-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50"
    >
      +{xp} XP
    </motion.div>
  );
}
```

- [ ] **Step 5: Verify**

Run: `npm run build:stacker-web`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add apps/stacker-web/src/components/
git commit -m "feat(stacker-web): add primitive components (CodeBlock, ProgressBar, Hearts, XP)"
```

---

### Task 22: OptionButton + FillInInput

**Files:**
- Create: `apps/stacker-web/src/components/OptionButton.tsx`
- Create: `apps/stacker-web/src/components/FillInInput.tsx`

- [ ] **Step 1: OptionButton**

Create `apps/stacker-web/src/components/OptionButton.tsx`:

```tsx
import { motion } from 'framer-motion';

type Props = {
  option: string;
  index: number;
  isSelected: boolean;
  isCorrect: boolean;
  isWrong: boolean;
  showResult: boolean;
  onClick: () => void;
  disabled: boolean;
};

export function OptionButton({ option, index, isSelected, isCorrect, isWrong, showResult, onClick, disabled }: Props) {
  const getStyles = () => {
    if (showResult) {
      if (isCorrect) return 'border-green-500 bg-green-500/10 text-green-300';
      if (isWrong) return 'border-red-500 bg-red-500/10 text-red-300';
      return 'border-gray-700 text-gray-500';
    }
    if (isSelected) return 'border-primary-500 bg-primary-500/10 text-white';
    return 'border-gray-700 hover:border-gray-600 text-gray-300';
  };

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.01 } : undefined}
      whileTap={!disabled ? { scale: 0.99 } : undefined}
      animate={isWrong ? { x: [0, -5, 5, -5, 5, 0] } : {}}
      transition={{ duration: 0.4 }}
      className={`w-full text-left p-4 rounded-xl border-2 transition-colors ${getStyles()} ${
        disabled ? 'cursor-default' : 'cursor-pointer'
      }`}
    >
      <span className="text-sm font-medium text-gray-500 mr-3">{String.fromCharCode(65 + index)}.</span>
      <span className="font-mono text-sm">{option}</span>
    </motion.button>
  );
}
```

- [ ] **Step 2: FillInInput**

Create `apps/stacker-web/src/components/FillInInput.tsx`:

```tsx
import { useState, FormEvent } from 'react';

type Props = {
  onSubmit: (text: string) => void;
  disabled: boolean;
};

export function FillInInput({ onSubmit, disabled }: Props) {
  const [value, setValue] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue('');
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
      <input
        type="text"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        placeholder="Type your answer…"
        className="flex-1 bg-gray-900 border-2 border-gray-700 rounded-xl px-4 py-3 text-white font-mono focus:border-primary-500 focus:outline-none disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white font-medium px-6 rounded-xl"
      >
        Submit
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Verify + commit**

Run: `npm run build:stacker-web`
Expected: clean.

```bash
git add apps/stacker-web/src/components/OptionButton.tsx apps/stacker-web/src/components/FillInInput.tsx
git commit -m "feat(stacker-web): add answer input components (OptionButton, FillInInput)"
```

---

### Task 23: ExplanationPanel

**Files:**
- Create: `apps/stacker-web/src/components/ExplanationPanel.tsx`

- [ ] **Step 1: Implement**

Create `apps/stacker-web/src/components/ExplanationPanel.tsx`:

```tsx
import { motion } from 'framer-motion';

type Props = { explanation: string; correctAnswer?: string };

export function ExplanationPanel({ explanation, correctAnswer }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
      className="mt-4 bg-gray-900 border border-gray-800 rounded-2xl p-4"
    >
      {correctAnswer && (
        <div className="text-sm text-gray-400 mb-2">
          Correct answer: <code className="text-green-300 bg-green-500/10 px-1.5 py-0.5 rounded">{correctAnswer}</code>
        </div>
      )}
      <div className="text-sm text-gray-300 leading-relaxed">{explanation}</div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Verify + commit**

```bash
git add apps/stacker-web/src/components/ExplanationPanel.tsx
git commit -m "feat(stacker-web): add ExplanationPanel"
```

---

### Task 24: QuestionCard (handles all 3 types)

**Files:**
- Create: `apps/stacker-web/src/components/QuestionCard.tsx`

- [ ] **Step 1: Implement**

Create `apps/stacker-web/src/components/QuestionCard.tsx`:

```tsx
import { motion } from 'framer-motion';
import type { QuestionDto, AnswerResponse } from '../types';
import { CodeBlock } from './CodeBlock';
import { OptionButton } from './OptionButton';
import { FillInInput } from './FillInInput';

type Props = {
  question: QuestionDto;
  selectedOption: number | null;
  answerResult: AnswerResponse | null;
  onSelectOption: (index: number) => void;
  onSubmitText: (text: string) => void;
  state: 'question' | 'result';
};

export function QuestionCard({ question, selectedOption, answerResult, onSelectOption, onSubmitText, state }: Props) {
  const shake = answerResult && !answerResult.correct ? { x: [0, -10, 10, -10, 10, 0] } : {};
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0, ...shake }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
      className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mt-6"
    >
      <h2 className="text-xl font-semibold text-white mb-4">{question.question}</h2>

      {question.type === 'code_output' && <CodeBlock code={question.codeSnippet} />}
      {question.type === 'fill_in' && question.codeSnippet && <CodeBlock code={question.codeSnippet} />}

      {(question.type === 'multiple_choice' || question.type === 'code_output') && (
        <div className="space-y-3 mt-6">
          {question.options.map((option, index) => (
            <OptionButton
              key={index}
              option={option}
              index={index}
              isSelected={selectedOption === index}
              isCorrect={answerResult?.correctOptionIndex === index}
              isWrong={state === 'result' && selectedOption === index && answerResult?.correct === false}
              showResult={state === 'result'}
              onClick={() => state === 'question' && onSelectOption(index)}
              disabled={state === 'result'}
            />
          ))}
        </div>
      )}

      {question.type === 'fill_in' && (
        <FillInInput onSubmit={onSubmitText} disabled={state === 'result'} />
      )}
    </motion.div>
  );
}
```

- [ ] **Step 2: Verify + commit**

```bash
git add apps/stacker-web/src/components/QuestionCard.tsx
git commit -m "feat(stacker-web): add QuestionCard (3 question types)"
```

---

### Task 25: TopicCard + SessionSummary

**Files:**
- Create: `apps/stacker-web/src/components/TopicCard.tsx`
- Create: `apps/stacker-web/src/components/SessionSummary.tsx`

- [ ] **Step 1: TopicCard**

Create `apps/stacker-web/src/components/TopicCard.tsx`:

```tsx
import type { Topic, Level } from '../types';

type Props = {
  topic: Topic;
  label: string;
  levels: Array<{ level: Level; label: string; questionCount: number }>;
  onPick: (topic: Topic, level: Level) => void;
};

export function TopicCard({ topic, label, levels, onPick }: Props) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
      <div className="text-white font-semibold mb-3">{label}</div>
      <div className="flex flex-wrap gap-2">
        {levels.map((lvl) => {
          const enabled = lvl.questionCount > 0;
          return (
            <button
              key={lvl.level}
              disabled={!enabled}
              onClick={() => onPick(topic, lvl.level)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                enabled
                  ? 'border-primary-500 text-primary-300 hover:bg-primary-500/10'
                  : 'border-gray-800 text-gray-600 cursor-not-allowed'
              }`}
            >
              {lvl.label} <span className="opacity-60 ml-1">{lvl.questionCount}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: SessionSummary**

Create `apps/stacker-web/src/components/SessionSummary.tsx`:

```tsx
import { motion } from 'framer-motion';
import { HeartsIndicator } from './HeartsIndicator';

type Props = {
  xpEarned: number;
  totalXp: number;
  streakCount: number;
  heartsRemaining: number;
  heartsMax: number;
  onPlayAgain: () => void;
};

export function SessionSummary({ xpEarned, totalXp, streakCount, heartsRemaining, heartsMax, onPlayAgain }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="max-w-md mx-auto mt-10 bg-gray-900 border border-gray-800 rounded-2xl p-6"
    >
      <h2 className="text-2xl font-bold text-center text-white mb-6">🏁 Round complete!</h2>
      <div className="space-y-4 mb-6">
        <Row label="XP earned this round" value={`+${xpEarned}`} />
        <Row label="Total XP" value={String(totalXp)} />
        <Row label="🔥 Streak" value={`${streakCount} day${streakCount === 1 ? '' : 's'}`} />
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Hearts left</span>
          <HeartsIndicator remaining={heartsRemaining} max={heartsMax} />
        </div>
      </div>
      <button
        onClick={onPlayAgain}
        className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-xl"
      >
        Play again
      </button>
    </motion.div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-400">{label}</span>
      <span className="text-white font-semibold">{value}</span>
    </div>
  );
}
```

- [ ] **Step 3: Verify + commit**

```bash
git add apps/stacker-web/src/components/TopicCard.tsx apps/stacker-web/src/components/SessionSummary.tsx
git commit -m "feat(stacker-web): add TopicCard and SessionSummary"
```

---

## Phase 7 — Pages + router

### Task 26: TopicPickerPage

**Files:**
- Create: `apps/stacker-web/src/pages/TopicPickerPage.tsx`

- [ ] **Step 1: Implement**

Create `apps/stacker-web/src/pages/TopicPickerPage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { api } from '../lib/api';
import type { MeResponse, TopicsResponse, Topic, Level } from '../types';
import { TopicCard } from '../components/TopicCard';
import { HeartsIndicator } from '../components/HeartsIndicator';
import { hapticLight } from '../lib/telegram';

export function TopicPickerPage() {
  const [, navigate] = useLocation();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [topics, setTopics] = useState<TopicsResponse | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.me(), api.topics()])
      .then(([m, t]) => {
        setMe(m);
        setTopics(t);
        if (m.activeSession) navigate('/round');
      })
      .catch((e: Error) => setError(e.message));
  }, [navigate]);

  async function start(topic: Topic, level: Level) {
    if (starting) return;
    hapticLight();
    setStarting(true);
    setError(null);
    try {
      const res = await api.startSession(topic, level);
      if (!res.ok) {
        if (res.reason === 'out_of_hearts') navigate('/out-of-hearts');
        else setError('No questions available for that combo.');
        setStarting(false);
        return;
      }
      navigate('/round');
    } catch (e) {
      setError((e as Error).message);
      setStarting(false);
    }
  }

  if (error) return <div className="p-6 text-red-400">{error}</div>;
  if (!me || !topics) return <div className="p-6 text-gray-400">Loading…</div>;

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs text-gray-400">XP</div>
          <div className="text-white font-semibold">{me.user.xp}</div>
        </div>
        <HeartsIndicator remaining={me.user.heartsRemaining} max={me.user.heartsMax} />
        <div className="text-right">
          <div className="text-xs text-gray-400">🔥 Streak</div>
          <div className="text-white font-semibold">{me.user.streakCount}</div>
        </div>
      </div>

      <h1 className="text-2xl font-bold text-white mb-4">Pick a topic</h1>
      <div className="space-y-3">
        {topics.topics.map((t) => (
          <TopicCard key={t.topic} topic={t.topic} label={t.label} levels={t.levels} onPick={start} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify + commit**

```bash
git add apps/stacker-web/src/pages/TopicPickerPage.tsx
git commit -m "feat(stacker-web): add TopicPickerPage"
```

---

### Task 27: RoundPage

**Files:**
- Create: `apps/stacker-web/src/pages/RoundPage.tsx`

- [ ] **Step 1: Implement**

Create `apps/stacker-web/src/pages/RoundPage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import type { AnswerResponse, NextQuestionResponse, QuestionDto } from '../types';
import { QuestionCard } from '../components/QuestionCard';
import { ProgressBar } from '../components/ProgressBar';
import { ExplanationPanel } from '../components/ExplanationPanel';
import { XpNotification } from '../components/XpNotification';
import { hapticError, hapticSuccess } from '../lib/telegram';

type PageState = 'loading' | 'question' | 'result';

export function RoundPage() {
  const [, navigate] = useLocation();
  const [state, setState] = useState<PageState>('loading');
  const [question, setQuestion] = useState<QuestionDto | null>(null);
  const [progress, setProgress] = useState({ answered: 0, remaining: 0, total: 0 });
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<AnswerResponse | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [xpToast, setXpToast] = useState<number | null>(null);

  useEffect(() => {
    api.me().then((m) => {
      if (!m.activeSession) {
        navigate('/');
        return;
      }
      setSessionId(m.activeSession.id);
      loadNext(m.activeSession.id);
    });
  }, [navigate]);

  async function loadNext(id: string) {
    setState('loading');
    const res: NextQuestionResponse = await api.nextQuestion(id);
    if (res.complete) {
      navigate('/summary');
      return;
    }
    setQuestion(res.question);
    setProgress(res.progress);
    setSelectedOption(null);
    setAnswerResult(null);
    setState('question');
  }

  async function submitOption(index: number) {
    if (!sessionId || !question || state !== 'question') return;
    setSelectedOption(index);
    const res = await api.answer(sessionId, { questionId: question.id, selectedOption: index });
    handleAnswerResult(res);
  }

  async function submitText(text: string) {
    if (!sessionId || !question || state !== 'question') return;
    const res = await api.answer(sessionId, { questionId: question.id, text });
    handleAnswerResult(res);
  }

  function handleAnswerResult(res: AnswerResponse) {
    setAnswerResult(res);
    setState('result');
    if (res.correct) {
      hapticSuccess();
      setXpToast(20);
      setTimeout(() => setXpToast(null), 1500);
    } else {
      hapticError();
    }
    if (res.outOfHearts) {
      setTimeout(() => navigate('/out-of-hearts'), 1500);
    }
  }

  if (state === 'loading' || !question) {
    return <div className="p-6 text-gray-400">Loading…</div>;
  }

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto">
      <ProgressBar answered={progress.answered} total={progress.total} />

      <AnimatePresence mode="wait">
        <QuestionCard
          key={question.id}
          question={question}
          selectedOption={selectedOption}
          answerResult={answerResult}
          onSelectOption={submitOption}
          onSubmitText={submitText}
          state={state === 'result' ? 'result' : 'question'}
        />
      </AnimatePresence>

      <AnimatePresence>
        {state === 'result' && answerResult && !answerResult.correct && (
          <ExplanationPanel explanation={answerResult.explanation} correctAnswer={answerResult.correctAnswer} />
        )}
      </AnimatePresence>

      {state === 'result' && !answerResult?.outOfHearts && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => sessionId && loadNext(sessionId)}
            className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-8 rounded-xl"
          >
            {answerResult?.correct ? 'Next question' : 'Continue'}
          </button>
        </div>
      )}

      <AnimatePresence>{xpToast !== null && <XpNotification xp={xpToast} />}</AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Verify + commit**

```bash
git add apps/stacker-web/src/pages/RoundPage.tsx
git commit -m "feat(stacker-web): add RoundPage"
```

---

### Task 28: SummaryPage + OutOfHeartsPage

**Files:**
- Create: `apps/stacker-web/src/pages/SummaryPage.tsx`
- Create: `apps/stacker-web/src/pages/OutOfHeartsPage.tsx`

- [ ] **Step 1: SummaryPage**

Create `apps/stacker-web/src/pages/SummaryPage.tsx`:

Note: The server already finalized the session and credited XP when `/next` returned `complete: true` (see backend Task 9). This page just reads the updated `/me` snapshot. We don't separately compute `xpEarned` here — instead we display a celebration with the user's totals.

```tsx
import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { api } from '../lib/api';
import type { MeResponse } from '../types';
import { SessionSummary } from '../components/SessionSummary';

export function SummaryPage() {
  const [, navigate] = useLocation();
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    api.me().then(setMe);
  }, []);

  if (!me) return <div className="p-6 text-gray-400">Loading…</div>;

  return (
    <SessionSummary
      xpEarned={0} // backend doesn't separately return last round's XP via /me; UI shows totals
      totalXp={me.user.xp}
      streakCount={me.user.streakCount}
      heartsRemaining={me.user.heartsRemaining}
      heartsMax={me.user.heartsMax}
      onPlayAgain={() => navigate('/')}
    />
  );
}
```

(Tradeoff: this page doesn't show per-round XP gained. If we wanted to, we'd need an additional endpoint that returns the last completed session's stats. Deferred — `totalXp` jumping up is enough signal for MVP.)

- [ ] **Step 2: OutOfHeartsPage**

Create `apps/stacker-web/src/pages/OutOfHeartsPage.tsx`:

```tsx
import { useLocation } from 'wouter';
import { tgClose } from '../lib/telegram';

export function OutOfHeartsPage() {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">💔</div>
        <h1 className="text-2xl font-bold text-white mb-3">Out of hearts</h1>
        <p className="text-gray-400 mb-6">
          You ran out of hearts. They refill on a new day — come back tomorrow.
        </p>
        <div className="space-y-2">
          <button
            onClick={() => navigate('/')}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-xl"
          >
            Back to topics
          </button>
          <button
            onClick={tgClose}
            className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-3 rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify + commit**

```bash
git add apps/stacker-web/src/pages/SummaryPage.tsx apps/stacker-web/src/pages/OutOfHeartsPage.tsx
git commit -m "feat(stacker-web): add SummaryPage and OutOfHeartsPage"
```

---

### Task 29: Router + App wiring

**Files:**
- Modify: `apps/stacker-web/src/App.tsx`
- Modify: `apps/stacker-web/src/main.tsx`

- [ ] **Step 1: Wire router**

Replace `apps/stacker-web/src/App.tsx`:

```tsx
import { Route, Switch, Router } from 'wouter';
import { TopicPickerPage } from './pages/TopicPickerPage';
import { RoundPage } from './pages/RoundPage';
import { SummaryPage } from './pages/SummaryPage';
import { OutOfHeartsPage } from './pages/OutOfHeartsPage';

export function App() {
  return (
    <Router base="/stacker">
      <Switch>
        <Route path="/" component={TopicPickerPage} />
        <Route path="/round" component={RoundPage} />
        <Route path="/summary" component={SummaryPage} />
        <Route path="/out-of-hearts" component={OutOfHeartsPage} />
        <Route>
          <div className="p-6 text-gray-400">Not found</div>
        </Route>
      </Switch>
    </Router>
  );
}
```

- [ ] **Step 2: Call `tg.ready()` on mount**

Replace `apps/stacker-web/src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { tgExpand, tgReady } from './lib/telegram';
import './index.css';

tgReady();
tgExpand();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 3: Full build**

Run: `npm run build`
Expected: backend + frontend both build clean.

- [ ] **Step 4: Commit**

```bash
git add apps/stacker-web/src/App.tsx apps/stacker-web/src/main.tsx
git commit -m "feat(stacker-web): wire router and Telegram WebApp init"
```

---

## Phase 8 — Wiring + smoke test

### Task 30: End-to-end dev mode smoke test

**Files:** No code changes — manual verification of the full stack.

- [ ] **Step 1: Start backend with dev auth**

Run in terminal A: `STACKER_DEV_AUTH=1 LOCAL_ACTIVE_BOT_ID=NONE STACKER_TELEGRAM_BOT_TOKEN=dummy npm run dev`

Setting `LOCAL_ACTIVE_BOT_ID=NONE` skips the bot init (which would fail without a real token) but lets the Stacker SPA + API still run if we *also* set the bot. Adjust: since `initStacker` is gated by `shouldInitBot`, when `LOCAL_ACTIVE_BOT_ID=STACKER` is set, the API will register. Use:

Run: `STACKER_DEV_AUTH=1 LOCAL_ACTIVE_BOT_ID=STACKER STACKER_TELEGRAM_BOT_TOKEN=<real-or-dummy-but-bot-init-may-fail-with-dummy> npm run dev`

If you don't have a real token, you'll need to use a placeholder and the bot's `bot.start()` may error — but the Express server stays up. Verify by hitting the API.

- [ ] **Step 2: Start the Vite dev server**

Run in terminal B: `VITE_DEV_USER_ID=999 npm run dev:stacker-web`

Open http://localhost:5173/stacker/

- [ ] **Step 3: Verify flow**

In the browser at http://localhost:5173/stacker/:

1. Page loads, shows "Pick a topic" with 6 topics. JS shows "3" count on Intermediate; others show 0.
2. Tap JavaScript → Intermediate. Round starts.
3. Question card appears. Answer correctly → green flash, XP toast, next button.
4. Answer wrong → shake, hearts decrement, explanation panel.
5. Complete all 5 questions (with re-takes) → SummaryPage shows updated XP.
6. From topic picker, tap any level with 0 questions — button should be disabled.

If any of these fails, debug and iterate.

- [ ] **Step 4: Stop servers**

No commit — verification step.

---

### Task 31: Production build smoke test (single process)

**Files:** No code changes.

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: produces `dist/` (backend) and `apps/stacker-web/dist/` (frontend).

- [ ] **Step 2: Start production server**

Run: `STACKER_DEV_AUTH=1 LOCAL_ACTIVE_BOT_ID=STACKER STACKER_TELEGRAM_BOT_TOKEN=dummy npm start`

(`dummy` will fail bot init but Express stays up.)

- [ ] **Step 3: Hit the SPA**

Run in another terminal:
```bash
curl -s http://localhost:3000/stacker/ | head -c 200
curl -s -H "X-Stacker-Dev-User: 999" http://localhost:3000/api/stacker/me
curl -s -H "X-Stacker-Dev-User: 999" http://localhost:3000/api/stacker/topics
```

Expected: SPA HTML; `/me` returns user JSON; `/topics` returns topics.

Open http://localhost:3000/stacker/ in a browser. With dev auth NOT enabled (the SPA can't inject the dev header without `VITE_DEV_USER_ID` baked in at build time), API calls will 401 — the SPA shows the error. This is correct behavior outside Telegram.

- [ ] **Step 4: Stop server**

No commit — verification step.

---

### Task 32: Wrap-up — README pointers and final commit

**Files:**
- Modify (or create): a brief README section explaining Mini App setup

- [ ] **Step 1: Add Mini App setup notes**

Add a section to `README.md` (create if missing). Locate the existing content first, then append at the end:

```markdown
## Stacker Mini App

The Stacker bot launches a Telegram Mini App webview. Production setup:

1. Deploy MMPS with `STACKER_TELEGRAM_BOT_TOKEN` and `STACKER_MINI_APP_URL=https://<host>/stacker/` in env.
2. In BotFather, configure the Stacker bot's Menu Button:
   - `/setmenubutton` → pick `@your_stacker_bot` → text `Play Stacker` → URL `https://<host>/stacker/`
3. Verify `https://<host>/stacker/` loads the SPA and `https://<host>/api/stacker/topics` returns JSON when called with a valid `X-Telegram-Init-Data` header.

Local dev:
- Terminal A: `STACKER_DEV_AUTH=1 LOCAL_ACTIVE_BOT_ID=STACKER STACKER_TELEGRAM_BOT_TOKEN=<token> npm run dev`
- Terminal B: `VITE_DEV_USER_ID=999 npm run dev:stacker-web`
- Open http://localhost:5173/stacker/
- For real device testing inside Telegram: `cloudflared tunnel --url http://localhost:3000` and set BotFather URL to the tunnel.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add Stacker Mini App setup notes"
```

- [ ] **Step 3: Final verification — all green**

Run: `npm run build && npx jest src/shared/stacker-api src/shared/stacker --passWithNoTests`
Expected: clean build + tests pass.

---

## Out-of-scope cleanup (do NOT do as part of this plan)

- Archive the sibling `/Users/guzi/Projects/stacker/` repo (outside MMPS — user's choice when/how).
- Add a global `setChatMenuButton` registration in the bot init — flagged as an open question in the spec; defer.
- Add `/stats` UI inside the Mini App — explicitly deferred per spec §12.
- Leaderboards — deferred.

---

## Self-Review Notes (post-write)

**Spec coverage:**
- §4 architecture → Phase 1-3 (backend), Phase 4-7 (frontend), Phase 8 (wiring)
- §5 file layout → All files appear in tasks; sibling repo archive noted as out-of-scope
- §6 REST API → Task 9 (all 6 endpoints)
- §7 auth/initData → Tasks 6-7 (with tests)
- §8 data model deltas → Tasks 2-3
- §9 frontend stack → Tasks 15-29
- §10 bot surface → Tasks 11-14
- §11 hosting/build → Tasks 17, 31
- §12 MVP cuts → respected (no leaderboards, no /stats, no snooze)
- §14 acceptance criteria → covered by smoke tests in Tasks 30-31

**Known accepted gaps:**
- SummaryPage shows `xpEarned=0` because `/me` doesn't return last-round XP separately. Total XP updates correctly; per-round display deferred. Documented inline in Task 28.
- Task 30 acknowledges that running with a dummy bot token will cause the bot init to throw — Express stays up because the failure is async after registration. If this is fragile, the executor can wrap `initStacker`'s bot init in a try/catch (small follow-up).
- Vite dev server (port 5173) talks to backend (port 3000) via proxy — `VITE_DEV_USER_ID` is the dev-auth bypass mechanism, gated by `import.meta.env.DEV`.
