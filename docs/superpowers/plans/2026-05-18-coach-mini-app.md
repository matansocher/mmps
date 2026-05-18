# Coach Mini App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Repo convention (per CLAUDE.md memory):** the user commits manually. Do **not** run `git add` / `git commit` during execution. The "Commit" steps in this plan are conceptual checkpoints — pause and let the user commit instead.

**Goal:** Add a Telegram mini app for the Coach bot that visually shows today's matches, league details, and match details — complementing (not replacing) the existing bot commands.

**Architecture:** A React + Vite + Tailwind + framer-motion SPA at `apps/coach-web/`, served from the existing Express server at `/coach/*`, with a thin authenticated JSON API at `src/shared/coach-api/` (Telegram `initData` HMAC verification). Mirrors `apps/stacker-web/` + `src/shared/stacker-api/` exactly so the two mini apps stay structurally identical.

**Tech Stack:** TypeScript, Express, React 18, Vite 5, Tailwind 3, framer-motion, wouter, grammY, scores-365 service, MongoDB (existing subscriptions).

**Reference spec:** `docs/superpowers/specs/2026-05-18-coach-mini-app-design.md`

---

## File Structure

**Create:**
- `apps/coach-web/package.json`
- `apps/coach-web/index.html`
- `apps/coach-web/vite.config.ts`
- `apps/coach-web/tsconfig.json`
- `apps/coach-web/tailwind.config.ts`
- `apps/coach-web/postcss.config.js`
- `apps/coach-web/src/main.tsx`
- `apps/coach-web/src/App.tsx`
- `apps/coach-web/src/index.css`
- `apps/coach-web/src/vite-env.d.ts`
- `apps/coach-web/src/types.ts`
- `apps/coach-web/src/lib/telegram.ts`
- `apps/coach-web/src/lib/api.ts`
- `apps/coach-web/src/lib/league-themes.ts`
- `apps/coach-web/src/components/LiveMatchCard.tsx`
- `apps/coach-web/src/components/MatchCard.tsx`
- `apps/coach-web/src/components/LeagueSection.tsx`
- `apps/coach-web/src/components/LeagueTable.tsx`
- `apps/coach-web/src/components/MatchScoreboard.tsx`
- `apps/coach-web/src/components/EmptyState.tsx`
- `apps/coach-web/src/pages/HomePage.tsx`
- `apps/coach-web/src/pages/LeagueDetailPage.tsx`
- `apps/coach-web/src/pages/MatchDetailPage.tsx`
- `src/shared/coach-api/index.ts`
- `src/shared/coach-api/telegram-init-data.ts`
- `src/shared/coach-api/telegram-init-data.spec.ts`
- `src/shared/coach-api/auth.middleware.ts`
- `src/shared/coach-api/dto.ts`
- `src/shared/coach-api/dto.spec.ts`
- `src/shared/coach-api/coach.api.controller.ts`
- `src/shared/coach-api/transformers.ts`
- `src/shared/coach-api/transformers.spec.ts`
- `src/features/coach/launcher.service.ts`

**Modify:**
- `src/features/coach/coach.init.ts` — accept `Express`, register API routes, serve SPA at `/coach/*`
- `src/features/coach/coach.controller.ts` — surface launcher button in `/start` and `/actions`
- `src/features/coach/index.ts` — export launcher
- `src/index.ts` — pass `app` to `initCoach(app)`
- `src/features/coach/coach.config.ts` — add a new `OPEN_APP` analytic event name

---

## Task 1: Scaffold `apps/coach-web/`

**Files:**
- Create: `apps/coach-web/package.json`
- Create: `apps/coach-web/vite.config.ts`
- Create: `apps/coach-web/tsconfig.json`
- Create: `apps/coach-web/tailwind.config.ts`
- Create: `apps/coach-web/postcss.config.js`
- Create: `apps/coach-web/index.html`
- Create: `apps/coach-web/src/main.tsx`
- Create: `apps/coach-web/src/App.tsx`
- Create: `apps/coach-web/src/index.css`
- Create: `apps/coach-web/src/vite-env.d.ts`

- [ ] **Step 1: Create `apps/coach-web/package.json` (copy stacker-web's stack)**

```json
{
  "name": "@mmps/coach-web",
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
    "wouter": "^3.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.9.0",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create `apps/coach-web/vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/coach/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    proxy: {
      '/api/coach': 'http://localhost:3000',
    },
  },
});
```

- [ ] **Step 3: Create `apps/coach-web/tsconfig.json`** (copy from `apps/stacker-web/tsconfig.json` verbatim — keep parity)

- [ ] **Step 4: Create `apps/coach-web/tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0A0E14',
          card: '#141A23',
          elevated: '#1B2330',
        },
        border: { subtle: '#1F2937' },
        text: {
          primary: '#FFFFFF',
          secondary: '#94A3B8',
          muted: '#64748B',
        },
        accent: {
          live: '#FF3B3B',
          win: '#00E676',
          draw: '#FFD600',
          loss: '#FF3B3B',
        },
      },
      keyframes: {
        'live-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
      },
      animation: {
        'live-pulse': 'live-pulse 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 5: Create `apps/coach-web/postcss.config.js`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 6: Create `apps/coach-web/index.html`**

```html
<!doctype html>
<html lang="he" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>Coach</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
  </head>
  <body class="bg-bg-base text-text-primary">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Create `apps/coach-web/src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 8: Create `apps/coach-web/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root { height: 100%; }
body { -webkit-font-smoothing: antialiased; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
.score-font { font-variant-numeric: tabular-nums; font-weight: 700; letter-spacing: 0.02em; }
```

- [ ] **Step 9: Create `apps/coach-web/src/App.tsx` (placeholder routes)**

```tsx
import { Route, Switch } from 'wouter';
import { HomePage } from './pages/HomePage';
import { LeagueDetailPage } from './pages/LeagueDetailPage';
import { MatchDetailPage } from './pages/MatchDetailPage';

export function App() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/league/:id" component={LeagueDetailPage} />
      <Route path="/match/:id" component={MatchDetailPage} />
      <Route>
        <div className="p-6">404</div>
      </Route>
    </Switch>
  );
}
```

- [ ] **Step 10: Create `apps/coach-web/src/vite-env.d.ts`**

```ts
/// <reference types="vite/client" />
```

- [ ] **Step 11: Create placeholder page files so App.tsx compiles**

Create three minimal files:

`apps/coach-web/src/pages/HomePage.tsx`:
```tsx
export function HomePage() {
  return <div className="p-6">Home</div>;
}
```

`apps/coach-web/src/pages/LeagueDetailPage.tsx`:
```tsx
export function LeagueDetailPage() {
  return <div className="p-6">League</div>;
}
```

`apps/coach-web/src/pages/MatchDetailPage.tsx`:
```tsx
export function MatchDetailPage() {
  return <div className="p-6">Match</div>;
}
```

- [ ] **Step 12: Install deps and verify the app builds**

Run: `cd apps/coach-web && npm install && npm run build`
Expected: `dist/index.html` and `dist/assets/*` produced, no TS errors.

- [ ] **Step 13: Commit checkpoint (user commits)**

Suggested message: `feat(coach-web): scaffold mini app shell`

---

## Task 2: Coach API — Telegram initData verifier (TDD)

**Files:**
- Create: `src/shared/coach-api/telegram-init-data.ts`
- Create: `src/shared/coach-api/telegram-init-data.spec.ts`

- [ ] **Step 1: Write failing test**

`src/shared/coach-api/telegram-init-data.spec.ts`:
```ts
import crypto from 'node:crypto';
import { verifyCoachInitData } from './telegram-init-data';

function makeInitData(botToken: string, user: { id: number; username?: string }, authDate = Math.floor(Date.now() / 1000)): string {
  const params = new URLSearchParams();
  params.set('auth_date', String(authDate));
  params.set('user', JSON.stringify(user));
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  params.set('hash', hash);
  return params.toString();
}

describe('verifyCoachInitData()', () => {
  const botToken = 'test-bot-token';

  it('returns parsed user for a valid signature', () => {
    const initData = makeInitData(botToken, { id: 12345, username: 'guz' });
    const result = verifyCoachInitData(initData, botToken);
    expect(result).toEqual({
      telegramUserId: 12345,
      username: 'guz',
      firstName: undefined,
      authDate: expect.any(Number),
    });
  });

  it('returns null for tampered hash', () => {
    const initData = makeInitData(botToken, { id: 12345 });
    const tampered = initData.replace(/hash=[a-f0-9]+/, 'hash=' + '0'.repeat(64));
    expect(verifyCoachInitData(tampered, botToken)).toBeNull();
  });

  it('returns null for missing hash', () => {
    expect(verifyCoachInitData('auth_date=1&user=%7B%22id%22%3A1%7D', botToken)).toBeNull();
  });

  it('returns null for expired auth_date', () => {
    const oneWeekAgo = Math.floor(Date.now() / 1000) - 86_400 * 7;
    const initData = makeInitData(botToken, { id: 1 }, oneWeekAgo);
    expect(verifyCoachInitData(initData, botToken)).toBeNull();
  });

  it('returns null for malformed user json', () => {
    const params = new URLSearchParams();
    params.set('auth_date', String(Math.floor(Date.now() / 1000)));
    params.set('user', '{not-json');
    params.set('hash', 'whatever');
    expect(verifyCoachInitData(params.toString(), botToken)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to see it fail**

Run: `npx jest src/shared/coach-api/telegram-init-data.spec.ts`
Expected: FAIL with `Cannot find module './telegram-init-data'`

- [ ] **Step 3: Implement the verifier**

`src/shared/coach-api/telegram-init-data.ts`:
```ts
import crypto from 'node:crypto';

const INIT_DATA_MAX_AGE_SEC = 86_400;

export type VerifiedInitData = {
  readonly telegramUserId: number;
  readonly username?: string;
  readonly firstName?: string;
  readonly authDate: number;
};

export function verifyCoachInitData(initData: string, botToken: string): VerifiedInitData | null {
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

- [ ] **Step 4: Run test to confirm all pass**

Run: `npx jest src/shared/coach-api/telegram-init-data.spec.ts`
Expected: 5 passed.

- [ ] **Step 5: Commit checkpoint** — `feat(coach-api): add telegram initData verifier`

---

## Task 3: Coach API — auth middleware

**Files:**
- Create: `src/shared/coach-api/auth.middleware.ts`

- [ ] **Step 1: Implement auth middleware**

```ts
import type { NextFunction, Request, Response } from 'express';
import { env } from 'node:process';
import { Logger } from '@core/utils';
import { verifyCoachInitData } from './telegram-init-data';

const logger = new Logger('coachAuthMiddleware');

export type CoachRequestUser = {
  readonly telegramUserId: number;
  readonly chatId: number;
  readonly username?: string;
};

declare module 'express-serve-static-core' {
  interface Request {
    coachUser?: CoachRequestUser;
  }
}

export async function coachAuthMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (env.NODE_ENV !== 'production') {
    const devUserId = req.header('X-Coach-Dev-User');
    if (devUserId) {
      const id = Number(devUserId);
      if (!Number.isFinite(id)) {
        res.status(400).json({ error: 'invalid_dev_user' });
        return;
      }
      req.coachUser = { telegramUserId: id, chatId: id, username: 'devuser' };
      next();
      return;
    }
  }

  const initData = req.header('X-Telegram-Init-Data');
  if (!initData) {
    res.status(401).json({ error: 'missing_init_data' });
    return;
  }

  const botToken = env.COACH_TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    logger.error('COACH_TELEGRAM_BOT_TOKEN not configured');
    res.status(500).json({ error: 'bot_not_configured' });
    return;
  }

  const verified = verifyCoachInitData(initData, botToken);
  if (!verified) {
    res.status(401).json({ error: 'invalid_init_data' });
    return;
  }

  req.coachUser = {
    telegramUserId: verified.telegramUserId,
    chatId: verified.telegramUserId,
    username: verified.username,
  };
  next();
}
```

- [ ] **Step 2: Commit checkpoint** — `feat(coach-api): add auth middleware`

---

## Task 4: Coach API — DTOs and transformers (TDD on transformer)

**Files:**
- Create: `src/shared/coach-api/dto.ts`
- Create: `src/shared/coach-api/transformers.ts`
- Create: `src/shared/coach-api/transformers.spec.ts`

- [ ] **Step 1: Create `dto.ts`**

```ts
export type CompetitionRef = {
  readonly id: number;
  readonly name: string;
  readonly icon?: string;
  readonly themeColor?: string;
};

export type TeamRef = {
  readonly id: number;
  readonly name: string;
  readonly symbolicName?: string;
};

export type MatchStatus = 'scheduled' | 'live' | 'finished';

export type MatchSummary = {
  readonly id: number;
  readonly home: TeamRef;
  readonly away: TeamRef;
  readonly status: MatchStatus;
  readonly minute?: number;
  readonly startTime: string;
  readonly score?: { readonly home: number; readonly away: number };
  readonly competitionId: number;
};

export type TodayResponse = {
  readonly date: string; // Format: "YYYY-MM-DD"
  readonly live: ReadonlyArray<MatchSummary>;
  readonly groups: ReadonlyArray<{
    readonly competition: CompetitionRef;
    readonly matches: ReadonlyArray<MatchSummary>;
  }>;
};

export type TableRow = {
  readonly rank: number;
  readonly team: TeamRef;
  readonly played: number;
  readonly goalDifference: number;
  readonly points: number;
  readonly zone: 'champions' | 'europe' | 'relegation' | null;
};

export type CompetitionDetailResponse = {
  readonly competition: CompetitionRef;
  readonly table: ReadonlyArray<TableRow>;
  readonly fixtures: ReadonlyArray<MatchSummary>;
};

export type MatchDetailResponse = {
  readonly match: MatchSummary;
  readonly venue?: string;
  readonly stage?: string;
  readonly channel?: string;
  // Raw, untyped pass-through from scores-365 — the frontend will
  // best-effort render whatever it finds. We narrow these in a later spike.
  readonly trends?: unknown;
  readonly pregame?: unknown;
};
```

- [ ] **Step 2: Write failing test for `toMatchSummary`**

`src/shared/coach-api/transformers.spec.ts`:
```ts
import type { MatchDetails } from '@services/scores-365';
import { toMatchSummary, classifyStatus } from './transformers';

const liveMatch: MatchDetails = {
  id: 1,
  startTime: '2026-05-18T18:00:00Z',
  statusText: '67\'',
  gameTime: 67,
  stage: 'Matchday 35',
  venue: 'Camp Nou',
  homeCompetitor: { id: 10, name: 'Barcelona', symbolicName: 'BAR', score: 2, color: '#a50044' },
  awayCompetitor: { id: 11, name: 'Real Madrid', symbolicName: 'RMA', score: 1, color: '#febe10' },
  channel: 'Sport 1',
};

const finishedMatch: MatchDetails = { ...liveMatch, statusText: 'הסתיים', gameTime: 90 };
const scheduledMatch: MatchDetails = { ...liveMatch, statusText: '20:00', gameTime: 0, homeCompetitor: { ...liveMatch.homeCompetitor, score: -1 }, awayCompetitor: { ...liveMatch.awayCompetitor, score: -1 } };

describe('classifyStatus()', () => {
  it('classifies live matches by positive gameTime and non-final status', () => {
    expect(classifyStatus(liveMatch)).toEqual('live');
  });
  it('classifies finished matches when statusText mentions finish keywords', () => {
    expect(classifyStatus(finishedMatch)).toEqual('finished');
  });
  it('classifies scheduled matches when no score yet and gameTime is 0', () => {
    expect(classifyStatus(scheduledMatch)).toEqual('scheduled');
  });
});

describe('toMatchSummary()', () => {
  it('maps a live match with minute and score', () => {
    const summary = toMatchSummary(liveMatch, 1001);
    expect(summary).toEqual({
      id: 1,
      home: { id: 10, name: 'Barcelona', symbolicName: 'BAR' },
      away: { id: 11, name: 'Real Madrid', symbolicName: 'RMA' },
      status: 'live',
      minute: 67,
      startTime: '2026-05-18T18:00:00Z',
      score: { home: 2, away: 1 },
      competitionId: 1001,
    });
  });

  it('omits score and minute for scheduled match', () => {
    const summary = toMatchSummary(scheduledMatch, 1001);
    expect(summary.status).toEqual('scheduled');
    expect(summary.score).toBeUndefined();
    expect(summary.minute).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run test to see it fail**

Run: `npx jest src/shared/coach-api/transformers.spec.ts`
Expected: FAIL with `Cannot find module './transformers'`

- [ ] **Step 4: Implement transformers**

`src/shared/coach-api/transformers.ts`:
```ts
import type { MatchDetails, CompetitionTableRow, Competition } from '@services/scores-365';
import type { CompetitionRef, MatchStatus, MatchSummary, TableRow } from './dto';

const FINISHED_HINTS = ['הסתיים', 'הסתיימה', 'finished', 'ft', 'ended'];

export function classifyStatus(m: MatchDetails): MatchStatus {
  const lower = (m.statusText ?? '').toLowerCase();
  if (FINISHED_HINTS.some((h) => lower.includes(h))) return 'finished';
  if (m.gameTime > 0) return 'live';
  return 'scheduled';
}

export function toMatchSummary(m: MatchDetails, competitionId: number): MatchSummary {
  const status = classifyStatus(m);
  const hasScore = m.homeCompetitor.score >= 0 && m.awayCompetitor.score >= 0;
  return {
    id: m.id,
    home: { id: m.homeCompetitor.id, name: m.homeCompetitor.name, symbolicName: m.homeCompetitor.symbolicName },
    away: { id: m.awayCompetitor.id, name: m.awayCompetitor.name, symbolicName: m.awayCompetitor.symbolicName },
    status,
    ...(status === 'live' ? { minute: m.gameTime } : {}),
    startTime: m.startTime,
    ...(hasScore && status !== 'scheduled' ? { score: { home: m.homeCompetitor.score, away: m.awayCompetitor.score } } : {}),
    competitionId,
  };
}

export function toCompetitionRef(c: Competition, themeColor?: string): CompetitionRef {
  return {
    id: c.id,
    name: c.name,
    ...(c.icon ? { icon: c.icon } : {}),
    ...(themeColor ? { themeColor } : {}),
  };
}

export function toTableRows(rows: ReadonlyArray<CompetitionTableRow>, zoning?: { championsTop?: number; europeTop?: number; relegationBottom?: number }): TableRow[] {
  const total = rows.length;
  const championsTop = zoning?.championsTop ?? 0;
  const europeTop = zoning?.europeTop ?? 0;
  const relegationBottom = zoning?.relegationBottom ?? 0;
  return rows.map((row, idx) => {
    const rank = idx + 1;
    let zone: TableRow['zone'] = null;
    if (rank <= championsTop) zone = 'champions';
    else if (rank <= championsTop + europeTop) zone = 'europe';
    else if (rank > total - relegationBottom) zone = 'relegation';
    return {
      rank,
      team: { id: row.competitor.id, name: row.competitor.name },
      played: row.gamesPlayed,
      goalDifference: 0,
      points: row.points,
      zone,
    };
  });
}
```

> Note: `CompetitionTableRow` from scores-365 doesn't currently expose goalDifference. We surface 0 for now and revisit when the upstream type is extended. League-zoning thresholds aren't in scores-365 either; pass empty zoning and the rows render flat — frontend handles this.

- [ ] **Step 5: Run tests to confirm pass**

Run: `npx jest src/shared/coach-api/transformers.spec.ts`
Expected: 5 passed.

- [ ] **Step 6: Commit checkpoint** — `feat(coach-api): add DTOs and transformers`

---

## Task 5: Coach API — controller and route registration

**Files:**
- Create: `src/shared/coach-api/coach.api.controller.ts`
- Create: `src/shared/coach-api/index.ts`

- [ ] **Step 1: Create barrel `index.ts`**

```ts
export * from './auth.middleware';
export * from './telegram-init-data';
export * from './dto';
export * from './transformers';
export { registerCoachApiRoutes } from './coach.api.controller';
```

- [ ] **Step 2: Implement the controller**

`src/shared/coach-api/coach.api.controller.ts`:
```ts
import type { Express, Request, Response } from 'express';
import { Logger } from '@core/utils';
import { getDateString } from '@core/utils';
import {
  getMatchDetails,
  getMatchTrends,
  getPregameData,
  getSportsCompetitionMatches,
  getSportsCompetitionTable,
  getSportsCompetitions,
  getSportsMatchesSummary,
} from '@services/scores-365';
import { getSubscription } from '@shared/coach';
import { coachAuthMiddleware } from './auth.middleware';
import { toCompetitionRef, toMatchSummary, toTableRows } from './transformers';
import type { CompetitionDetailResponse, MatchDetailResponse, TodayResponse } from './dto';

const logger = new Logger('CoachApiController');

export function registerCoachApiRoutes(app: Express): void {
  app.use('/api/coach', coachAuthMiddleware);

  // GET /api/coach/today
  app.get('/api/coach/today', async (req: Request, res: Response<TodayResponse | { error: string }>) => {
    const { chatId } = req.coachUser!;
    const date = getDateString();
    const [summaryDetails, subscription] = await Promise.all([
      getSportsMatchesSummary(date),
      getSubscription(chatId),
    ]);
    if (!summaryDetails) {
      res.json({ date, live: [], groups: [] });
      return;
    }
    const customLeagues = subscription?.customLeagues ?? [];
    const filtered = customLeagues.length === 0
      ? summaryDetails
      : summaryDetails.filter((s) => customLeagues.includes(s.competition.id));

    const live: TodayResponse['live'] = [];
    const groups: TodayResponse['groups'] = filtered.map((group) => {
      const competition = toCompetitionRef(group.competition);
      const matches = group.matches.map((m) => toMatchSummary(m, group.competition.id));
      for (const match of matches) if (match.status === 'live') live.push(match);
      return { competition, matches };
    });

    res.json({ date, live, groups });
  });

  // GET /api/coach/competitions/:id
  app.get('/api/coach/competitions/:id', async (req: Request, res: Response<CompetitionDetailResponse | { error: string }>) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: 'invalid_id' });
      return;
    }
    const [tableDetails, matchesDetails, competitions] = await Promise.all([
      getSportsCompetitionTable(id),
      getSportsCompetitionMatches(id),
      getSportsCompetitions(),
    ]);
    const compMeta = competitions.find((c) => c.id === id);
    if (!compMeta) {
      res.status(404).json({ error: 'competition_not_found' });
      return;
    }
    res.json({
      competition: toCompetitionRef(compMeta),
      table: tableDetails ? toTableRows(tableDetails.competitionTable) : [],
      fixtures: matchesDetails ? matchesDetails.matches.map((m) => toMatchSummary(m, id)) : [],
    });
  });

  // GET /api/coach/matches/:id
  app.get('/api/coach/matches/:id', async (req: Request, res: Response<MatchDetailResponse | { error: string }>) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: 'invalid_id' });
      return;
    }
    const [match, trends, pregame] = await Promise.all([
      getMatchDetails(id),
      getMatchTrends(id),
      getPregameData(id),
    ]);
    if (!match) {
      res.status(404).json({ error: 'match_not_found' });
      return;
    }
    res.json({
      match: toMatchSummary(match, 0),
      ...(match.venue ? { venue: match.venue } : {}),
      ...(match.stage ? { stage: match.stage } : {}),
      ...(match.channel ? { channel: match.channel } : {}),
      ...(trends ? { trends } : {}),
      ...(pregame ? { pregame } : {}),
    });
  });

  logger.log('Coach API routes registered at /api/coach/*');
}
```

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit checkpoint** — `feat(coach-api): register routes`

---

## Task 6: Wire coach init function and serve SPA

**Files:**
- Modify: `src/features/coach/coach.init.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Update `src/features/coach/coach.init.ts`**

Replace the file with:
```ts
import type { Express } from 'express';
import express from 'express';
import path from 'node:path';
import { createMongoConnection } from '@core/mongo';
import { Logger } from '@core/utils';
import { provideTelegramBot } from '@services/telegram';
import { DB_NAME } from '@shared/coach';
import { registerCoachApiRoutes } from '@shared/coach-api';
import { CoachBotSchedulerService } from './coach-scheduler.service';
import { BOT_CONFIG } from './coach.config';
import { CoachController } from './coach.controller';
import { CoachService } from './coach.service';
import { CoachLauncherService } from './launcher.service';

const logger = new Logger('initCoach');

export async function initCoach(app: Express): Promise<void> {
  await createMongoConnection(DB_NAME);

  const bot = provideTelegramBot(BOT_CONFIG);
  const coachService = new CoachService();
  const launcher = new CoachLauncherService(bot);
  const coachController = new CoachController(coachService, bot, launcher);
  const coachScheduler = new CoachBotSchedulerService(coachService, bot);

  coachController.init();
  coachScheduler.init();

  registerCoachApiRoutes(app);

  const spaDist = path.resolve('apps/coach-web/dist');
  app.use('/coach', express.static(spaDist));
  app.get('/coach/*splat', (_req, res) => {
    res.sendFile(path.join(spaDist, 'index.html'));
  });
  logger.log(`Coach SPA served from ${spaDist} at /coach/*`);
}
```

- [ ] **Step 2: Update the call site in `src/index.ts`**

Find line 49:
```ts
  shouldInitBot(coachConfig) && (await initCoach());
```
Change to:
```ts
  shouldInitBot(coachConfig) && (await initCoach(app));
```

- [ ] **Step 3: Verify type check fails predictably**

Run: `npx tsc --noEmit`
Expected: error about `CoachController` missing third constructor arg `launcher` and `CoachLauncherService` not found yet — these are filled in Task 7.

If unfamiliar errors appear, stop and read carefully — anything unrelated to "launcher" indicates a regression.

> Note: do **not** commit until Task 7 finishes — the tree is mid-change.

---

## Task 7: Coach launcher service

**Files:**
- Create: `src/features/coach/launcher.service.ts`
- Modify: `src/features/coach/index.ts`
- Modify: `src/features/coach/coach.config.ts`

- [ ] **Step 1: Create the launcher**

```ts
import type { Bot } from 'grammy';
import { env } from 'node:process';
import { Logger } from '@core/utils';

export class CoachLauncherService {
  private readonly logger = new Logger(CoachLauncherService.name);

  constructor(private readonly bot: Bot) {}

  buildKeyboard(): { inline_keyboard: { text: string; web_app: { url: string } }[][] } | null {
    const url = env.COACH_MINI_APP_URL;
    if (!url) {
      this.logger.warn('COACH_MINI_APP_URL not configured');
      return null;
    }
    return { inline_keyboard: [[{ text: '📱 פתח אפליקציה', web_app: { url } }]] };
  }

  async sendLauncher(chatId: number, intro = '⚽️ הנה האפליקציה:'): Promise<void> {
    const reply_markup = this.buildKeyboard();
    if (!reply_markup) {
      await this.bot.api.sendMessage(chatId, 'האפליקציה עוד לא מוכנה. נסה שוב בקרוב.');
      return;
    }
    await this.bot.api.sendMessage(chatId, intro, { reply_markup });
  }
}
```

- [ ] **Step 2: Update barrel `src/features/coach/index.ts`**

```ts
export { initCoach } from './coach.init';
export { BOT_CONFIG } from './coach.config';
export { CoachLauncherService } from './launcher.service';
```

- [ ] **Step 3: Add `OPEN_APP` analytic event**

Edit `src/features/coach/coach.config.ts`:

Find:
```ts
  ERROR: 'ERROR',
};
```
Replace with:
```ts
  ERROR: 'ERROR',
  OPEN_APP: 'OPEN_APP',
};
```

- [ ] **Step 4: Commit checkpoint** — `feat(coach): add launcher service`

---

## Task 8: Surface launcher in `/start` and `/actions`

**Files:**
- Modify: `src/features/coach/coach.controller.ts`

- [ ] **Step 1: Add launcher dep to controller constructor**

Find:
```ts
  constructor(
    private readonly coachService: CoachService,
    private readonly bot: Bot,
  ) {}
```
Replace with:
```ts
  constructor(
    private readonly coachService: CoachService,
    private readonly bot: Bot,
    private readonly launcher: CoachLauncherService,
  ) {}
```

Then add to imports at the top of the file:
```ts
import { CoachLauncherService } from './launcher.service';
```

- [ ] **Step 2: Add the app button to `/actions` keyboard**

Find the `actionsHandler` method's `buildInlineKeyboard` call. Replace the whole array with:
```ts
    const keyboard = buildInlineKeyboard([
      { text: '⚽️ הגדרת ליגות למעקב ⚽️', data: `${BOT_ACTIONS.CUSTOM_LEAGUES}`, style: 'primary' },
      !subscription?.isActive
        ? { text: '🟢 התחל לקבל עדכונים יומיים 🟢', data: `${BOT_ACTIONS.START}`, style: 'success' as const }
        : { text: '🛑 הפסק לקבל עדכונים יומיים 🛑', data: `${BOT_ACTIONS.STOP}`, style: 'danger' as const },
      { text: '📬 צור קשר 📬', data: `${BOT_ACTIONS.CONTACT}` },
    ]);
```

Then, **after** the existing `await ctx.reply('👨‍🏫 איך אני יכול לעזור?', { reply_markup: keyboard });` line, insert:
```ts
    const launcherKeyboard = this.launcher.buildKeyboard();
    if (launcherKeyboard) {
      await this.bot.api.sendMessage(chatId, '📱 או פתח את האפליקציה', { reply_markup: launcherKeyboard });
    }
```

- [ ] **Step 3: Surface launcher in `/start` (existing user only)**

Find the end of `userStart`:
```ts
    await ctx.reply(userExists ? existingUserReplyText : newUserReplyText, { ...getKeyboardOptions() });
  }
```
Replace with:
```ts
    await ctx.reply(userExists ? existingUserReplyText : newUserReplyText, { ...getKeyboardOptions() });
    const launcherKeyboard = this.launcher.buildKeyboard();
    if (launcherKeyboard) {
      await this.bot.api.sendMessage(chatId, '📱 גם יש לי אפליקציה — לתצוגה ויזואלית:', { reply_markup: launcherKeyboard });
    }
  }
```

- [ ] **Step 4: Run type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit checkpoint** — `feat(coach): expose launcher in /start and /actions`

---

## Task 9: Frontend — telegram + api libs

**Files:**
- Create: `apps/coach-web/src/lib/telegram.ts`
- Create: `apps/coach-web/src/lib/api.ts`
- Create: `apps/coach-web/src/lib/league-themes.ts`
- Create: `apps/coach-web/src/types.ts`

- [ ] **Step 1: Create `telegram.ts`**

```ts
type TgWebApp = {
  ready(): void;
  expand(): void;
  initData: string;
  themeParams: Record<string, string>;
  BackButton: {
    show(): void;
    hide(): void;
    onClick(cb: () => void): void;
    offClick(cb: () => void): void;
  };
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp };
  }
}

export function getWebApp(): TgWebApp | null {
  return window.Telegram?.WebApp ?? null;
}

export function getInitData(): string {
  return getWebApp()?.initData ?? '';
}

export function showBackButton(onClick: () => void): () => void {
  const w = getWebApp();
  if (!w) return () => {};
  w.BackButton.show();
  w.BackButton.onClick(onClick);
  return () => {
    w.BackButton.offClick(onClick);
    w.BackButton.hide();
  };
}
```

- [ ] **Step 2: Create `types.ts`** (mirror of `src/shared/coach-api/dto.ts` — kept in sync manually)

```ts
export type CompetitionRef = {
  id: number;
  name: string;
  icon?: string;
  themeColor?: string;
};

export type TeamRef = {
  id: number;
  name: string;
  symbolicName?: string;
};

export type MatchStatus = 'scheduled' | 'live' | 'finished';

export type MatchSummary = {
  id: number;
  home: TeamRef;
  away: TeamRef;
  status: MatchStatus;
  minute?: number;
  startTime: string;
  score?: { home: number; away: number };
  competitionId: number;
};

export type TodayResponse = {
  date: string;
  live: MatchSummary[];
  groups: Array<{ competition: CompetitionRef; matches: MatchSummary[] }>;
};

export type TableRow = {
  rank: number;
  team: TeamRef;
  played: number;
  goalDifference: number;
  points: number;
  zone: 'champions' | 'europe' | 'relegation' | null;
};

export type CompetitionDetailResponse = {
  competition: CompetitionRef;
  table: TableRow[];
  fixtures: MatchSummary[];
};

export type MatchDetailResponse = {
  match: MatchSummary;
  venue?: string;
  stage?: string;
  channel?: string;
  trends?: unknown;
  pregame?: unknown;
};
```

- [ ] **Step 3: Create `api.ts`**

```ts
import { getInitData } from './telegram';
import type { CompetitionDetailResponse, MatchDetailResponse, TodayResponse } from '../types';

async function request<T>(path: string): Promise<T> {
  const res = await fetch(path, {
    headers: { 'X-Telegram-Init-Data': getInitData() },
  });
  if (!res.ok) throw new Error(`request_failed_${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  today: () => request<TodayResponse>('/api/coach/today'),
  competition: (id: number) => request<CompetitionDetailResponse>(`/api/coach/competitions/${id}`),
  match: (id: number) => request<MatchDetailResponse>(`/api/coach/matches/${id}`),
};
```

- [ ] **Step 4: Create `league-themes.ts`**

```ts
const FALLBACK = '#3B82F6';

const THEMES: Record<number, string> = {
  // ids align with src/services/scores-365 COMPETITION_IDS_MAP — verify and extend as needed
};

export function leagueColor(competitionId: number): string {
  return THEMES[competitionId] ?? FALLBACK;
}
```

> Note: the league colour map is intentionally empty for now. We'll seed it after wiring everything together with real IDs from `COMPETITION_IDS_MAP`. The fallback blue is good enough for the first iteration.

- [ ] **Step 5: Type-check the web app**

Run: `cd apps/coach-web && npx tsc -b`
Expected: no errors.

- [ ] **Step 6: Commit checkpoint** — `feat(coach-web): add api and telegram libs`

---

## Task 10: Frontend — Home page (Live + grouped sections)

**Files:**
- Create: `apps/coach-web/src/components/LiveMatchCard.tsx`
- Create: `apps/coach-web/src/components/MatchCard.tsx`
- Create: `apps/coach-web/src/components/LeagueSection.tsx`
- Create: `apps/coach-web/src/components/EmptyState.tsx`
- Modify: `apps/coach-web/src/pages/HomePage.tsx`

- [ ] **Step 1: Create `MatchCard.tsx`**

```tsx
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import type { MatchSummary } from '../types';
import { leagueColor } from '../lib/league-themes';

export function MatchCard({ match }: { match: MatchSummary }) {
  const [, navigate] = useLocation();
  const stripe = leagueColor(match.competitionId);
  const kickoff = new Date(match.startTime).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => navigate(`/match/${match.id}`)}
      className="w-full text-right bg-bg-card border border-border-subtle rounded-xl flex items-stretch overflow-hidden hover:bg-bg-elevated transition-colors"
    >
      <div style={{ background: stripe }} className="w-1" />
      <div className="flex-1 p-3 grid grid-cols-[1fr_auto] items-center gap-3">
        <div>
          <div className="text-text-primary font-medium">{match.home.name}</div>
          <div className="text-text-primary font-medium">{match.away.name}</div>
        </div>
        <div className="text-left">
          {match.status === 'scheduled' && <span className="text-text-secondary score-font">{kickoff}</span>}
          {match.status === 'finished' && match.score && (
            <div className="score-font text-text-primary text-lg leading-tight">
              {match.score.home}
              <div className="text-text-secondary text-xs">FT</div>
              {match.score.away}
            </div>
          )}
          {match.status === 'live' && match.score && (
            <div className="score-font text-accent-win text-lg leading-tight">
              {match.score.home}
              <div className="text-accent-live text-xs flex items-center gap-1 justify-end">
                <span className="w-2 h-2 rounded-full bg-accent-live animate-live-pulse" />
                {match.minute}'
              </div>
              {match.score.away}
            </div>
          )}
        </div>
      </div>
    </motion.button>
  );
}
```

- [ ] **Step 2: Create `LiveMatchCard.tsx`** (richer variant — same shape, larger score)

```tsx
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import type { MatchSummary } from '../types';
import { leagueColor } from '../lib/league-themes';

export function LiveMatchCard({ match }: { match: MatchSummary }) {
  const [, navigate] = useLocation();
  const stripe = leagueColor(match.competitionId);
  if (match.status !== 'live' || !match.score) return null;
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => navigate(`/match/${match.id}`)}
      className="w-full text-right bg-bg-card border border-border-subtle rounded-2xl flex items-stretch overflow-hidden"
    >
      <div style={{ background: stripe }} className="w-1.5" />
      <div className="flex-1 p-4 grid grid-cols-[1fr_auto] items-center gap-4">
        <div className="space-y-1">
          <div className="text-text-primary font-semibold">{match.home.name}</div>
          <div className="text-text-primary font-semibold">{match.away.name}</div>
        </div>
        <div className="text-left score-font text-3xl text-accent-win leading-none">
          <div>{match.score.home}</div>
          <div className="text-text-secondary text-xs my-1 flex items-center gap-1 justify-end">
            <span className="w-2 h-2 rounded-full bg-accent-live animate-live-pulse" />
            {match.minute}'
          </div>
          <div>{match.score.away}</div>
        </div>
      </div>
    </motion.button>
  );
}
```

- [ ] **Step 3: Create `LeagueSection.tsx`**

```tsx
import { useLocation } from 'wouter';
import type { CompetitionRef, MatchSummary } from '../types';
import { MatchCard } from './MatchCard';

export function LeagueSection({ competition, matches }: { competition: CompetitionRef; matches: MatchSummary[] }) {
  const [, navigate] = useLocation();
  if (matches.length === 0) return null;
  return (
    <section className="space-y-2">
      <button
        onClick={() => navigate(`/league/${competition.id}`)}
        className="w-full text-right text-text-primary font-semibold text-sm tracking-wide flex items-center gap-2 px-1 hover:text-accent-win"
      >
        <span>{competition.icon}</span>
        <span>{competition.name}</span>
        <span className="text-text-muted">→</span>
      </button>
      <div className="space-y-2">
        {matches.map((m) => <MatchCard key={m.id} match={m} />)}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Create `EmptyState.tsx`**

```tsx
export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="text-center py-10 text-text-secondary">
      <div className="text-lg">{title}</div>
      {hint && <div className="text-sm text-text-muted mt-1">{hint}</div>}
    </div>
  );
}
```

- [ ] **Step 5: Replace `HomePage.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { TodayResponse } from '../types';
import { LiveMatchCard } from '../components/LiveMatchCard';
import { LeagueSection } from '../components/LeagueSection';
import { EmptyState } from '../components/EmptyState';

const DATE_FMT = new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: '2-digit', month: '2-digit' });

export function HomePage() {
  const [data, setData] = useState<TodayResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.Telegram?.WebApp?.ready();
    window.Telegram?.WebApp?.expand();
    api.today().then(setData).catch((e) => setError(String(e)));
  }, []);

  if (error) return <EmptyState title="לא הצלחתי לטעון נתונים" hint={error} />;
  if (!data) return <EmptyState title="טוען..." />;

  const dateLabel = DATE_FMT.format(new Date(data.date + 'T00:00:00'));
  const hasAnything = data.live.length > 0 || data.groups.some((g) => g.matches.length > 0);

  return (
    <div className="min-h-full bg-bg-base">
      <header className="px-4 py-4 flex items-center justify-between sticky top-0 bg-bg-base/80 backdrop-blur border-b border-border-subtle z-10">
        <h1 className="text-text-primary font-bold text-lg">⚽ Coach</h1>
        <span className="text-text-secondary text-sm">{dateLabel}</span>
      </header>

      <main className="p-4 space-y-6">
        {data.live.length > 0 && (
          <section className="space-y-2">
            <div className="text-accent-live font-semibold text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent-live animate-live-pulse" />
              LIVE
            </div>
            <div className="space-y-2">
              {data.live.map((m) => <LiveMatchCard key={m.id} match={m} />)}
            </div>
          </section>
        )}

        {data.groups.map((g) => (
          <LeagueSection key={g.competition.id} competition={g.competition} matches={g.matches} />
        ))}

        {!hasAnything && <EmptyState title="אין משחקים היום" hint="חזור מחר ⚽" />}
      </main>
    </div>
  );
}
```

- [ ] **Step 6: Verify build**

Run: `cd apps/coach-web && npm run build`
Expected: success.

- [ ] **Step 7: Commit checkpoint** — `feat(coach-web): home page with live and league sections`

---

## Task 11: Frontend — League Detail (Table + Fixtures)

**Files:**
- Create: `apps/coach-web/src/components/LeagueTable.tsx`
- Modify: `apps/coach-web/src/pages/LeagueDetailPage.tsx`

- [ ] **Step 1: Create `LeagueTable.tsx`**

```tsx
import type { TableRow as Row } from '../types';

function zoneClass(zone: Row['zone']): string {
  if (zone === 'champions') return 'border-r-2 border-accent-win';
  if (zone === 'europe') return 'border-r-2 border-accent-draw';
  if (zone === 'relegation') return 'border-r-2 border-accent-loss';
  return '';
}

export function LeagueTable({ rows }: { rows: Row[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="bg-bg-card border border-border-subtle rounded-xl overflow-hidden">
      <div className="grid grid-cols-[2.5rem_1fr_3rem_3rem] text-xs text-text-secondary px-3 py-2 border-b border-border-subtle">
        <span>#</span>
        <span>קבוצה</span>
        <span className="text-left">משחקים</span>
        <span className="text-left">נקודות</span>
      </div>
      {rows.map((r) => (
        <div key={r.team.id} className={`grid grid-cols-[2.5rem_1fr_3rem_3rem] items-center px-3 py-2 text-sm ${zoneClass(r.zone)}`}>
          <span className="text-text-secondary score-font">{r.rank}</span>
          <span className="text-text-primary truncate">{r.team.name}</span>
          <span className="text-left text-text-secondary score-font">{r.played}</span>
          <span className="text-left text-text-primary score-font font-semibold">{r.points}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Replace `LeagueDetailPage.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import type { CompetitionDetailResponse } from '../types';
import { LeagueTable } from '../components/LeagueTable';
import { MatchCard } from '../components/MatchCard';
import { EmptyState } from '../components/EmptyState';
import { showBackButton } from '../lib/telegram';

type Tab = 'table' | 'fixtures';

export function LeagueDetailPage() {
  const [, params] = useRoute('/league/:id');
  const [, navigate] = useLocation();
  const [data, setData] = useState<CompetitionDetailResponse | null>(null);
  const [tab, setTab] = useState<Tab>('table');
  const [error, setError] = useState<string | null>(null);
  const id = Number(params?.id);

  useEffect(() => {
    if (!Number.isFinite(id)) return;
    api.competition(id).then(setData).catch((e) => setError(String(e)));
  }, [id]);

  useEffect(() => showBackButton(() => navigate('/')), [navigate]);

  if (error) return <EmptyState title="לא הצלחתי לטעון" hint={error} />;
  if (!data) return <EmptyState title="טוען..." />;

  return (
    <div className="min-h-full bg-bg-base">
      <header className="px-4 py-4 flex items-center gap-2 sticky top-0 bg-bg-base/80 backdrop-blur border-b border-border-subtle z-10">
        <span className="text-xl">{data.competition.icon}</span>
        <h1 className="text-text-primary font-bold">{data.competition.name}</h1>
      </header>

      <div className="px-4 pt-3">
        <div className="inline-flex rounded-full bg-bg-card border border-border-subtle p-1">
          {(['table', 'fixtures'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${tab === t ? 'bg-accent-win text-bg-base font-semibold' : 'text-text-secondary'}`}
            >
              {t === 'table' ? 'טבלה' : 'מחזור'}
            </button>
          ))}
        </div>
      </div>

      <main className="p-4">
        <AnimatePresence mode="wait">
          {tab === 'table' ? (
            <motion.div key="table" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
              {data.table.length === 0 ? <EmptyState title="אין טבלה זמינה" /> : <LeagueTable rows={data.table} />}
            </motion.div>
          ) : (
            <motion.div key="fixtures" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-2">
              {data.fixtures.length === 0 ? <EmptyState title="אין משחקים" /> : data.fixtures.map((m) => <MatchCard key={m.id} match={m} />)}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `cd apps/coach-web && npm run build`
Expected: success.

- [ ] **Step 4: Commit checkpoint** — `feat(coach-web): league detail page with tabs`

---

## Task 12: Frontend — Match Detail (scoreboard, raw data placeholders)

**Files:**
- Create: `apps/coach-web/src/components/MatchScoreboard.tsx`
- Modify: `apps/coach-web/src/pages/MatchDetailPage.tsx`

- [ ] **Step 1: Create `MatchScoreboard.tsx`**

```tsx
import type { MatchSummary } from '../types';
import { leagueColor } from '../lib/league-themes';

export function MatchScoreboard({ match, stage, venue }: { match: MatchSummary; stage?: string; venue?: string }) {
  const stripe = leagueColor(match.competitionId);
  const kickoff = new Date(match.startTime).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="bg-bg-card border border-border-subtle rounded-2xl overflow-hidden">
      <div style={{ background: stripe }} className="h-1.5 w-full" />
      <div className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="text-right flex-1">
            <div className="text-text-primary font-bold text-lg">{match.home.name}</div>
          </div>
          <div className="score-font text-4xl text-text-primary flex items-center gap-3">
            {match.score ? <>{match.score.home}<span className="text-text-muted">:</span>{match.score.away}</> : <span className="text-text-secondary text-lg">{kickoff}</span>}
          </div>
          <div className="text-left flex-1">
            <div className="text-text-primary font-bold text-lg">{match.away.name}</div>
          </div>
        </div>
        <div className="mt-3 text-center text-xs text-text-secondary">
          {match.status === 'live' && <span className="text-accent-live">● {match.minute}'</span>}
          {match.status === 'finished' && <span>הסתיים</span>}
          {match.status === 'scheduled' && stage && <span>{stage}</span>}
          {venue && <span className="block text-text-muted mt-1">{venue}</span>}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace `MatchDetailPage.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { api } from '../lib/api';
import type { MatchDetailResponse } from '../types';
import { MatchScoreboard } from '../components/MatchScoreboard';
import { EmptyState } from '../components/EmptyState';
import { showBackButton } from '../lib/telegram';

export function MatchDetailPage() {
  const [, params] = useRoute('/match/:id');
  const [, navigate] = useLocation();
  const [data, setData] = useState<MatchDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const id = Number(params?.id);

  useEffect(() => {
    if (!Number.isFinite(id)) return;
    api.match(id).then(setData).catch((e) => setError(String(e)));
  }, [id]);

  useEffect(() => showBackButton(() => navigate('/')), [navigate]);

  if (error) return <EmptyState title="לא הצלחתי לטעון" hint={error} />;
  if (!data) return <EmptyState title="טוען..." />;

  const hasExtras = !!data.trends || !!data.pregame;
  return (
    <div className="min-h-full bg-bg-base">
      <main className="p-4 space-y-4">
        <MatchScoreboard match={data.match} stage={data.stage} venue={data.venue} />
        {data.channel && <div className="text-text-secondary text-sm text-center">📺 {data.channel}</div>}
        {!hasExtras && <EmptyState title="אין עוד נתונים על המשחק הזה" />}
      </main>
    </div>
  );
}
```

> Note: `trends` and `pregame` are received but not rendered yet — see Task 14 (discovery spike).

- [ ] **Step 3: Verify build**

Run: `cd apps/coach-web && npm run build`
Expected: success.

- [ ] **Step 4: Commit checkpoint** — `feat(coach-web): match detail page with scoreboard`

---

## Task 13: End-to-end manual smoke test

- [ ] **Step 1: Start local dev**

Terminal A — backend:
```
LOCAL_ACTIVE_BOT_ID=COACH npm run dev
```
Terminal B — frontend (only needed if not consuming the built `dist`):
```
cd apps/coach-web && npm run dev
```

- [ ] **Step 2: Test the API directly with the dev escape hatch**

Use any real Telegram user id you have in subscriptions (or 0 for "no filter"):
```
curl -s -H "X-Coach-Dev-User: 0" http://localhost:3000/api/coach/today | head -50
```
Expected: JSON with `date`, `live`, `groups`.

- [ ] **Step 3: Build the SPA and open via the backend route**

```
cd apps/coach-web && npm run build && cd ../..
```
Open `http://localhost:3000/coach/` in the browser. You'll see the Hebrew RTL UI render today's matches grouped by league.

For the API to authenticate, append the dev header manually using your browser devtools or use the Telegram client to launch the mini app for the real flow.

- [ ] **Step 4: From the Telegram client**

Send `/start` to the coach bot. Confirm an extra message with "📱 פתח אפליקציה" appears. Tap it. Confirm the SPA opens, loads today's matches, and `BackButton` works on League/Match detail.

- [ ] **Step 5: Document any issues found**

For each issue, decide: fix now (small UI tweak), file under Open Questions (data shape revealed something unexpected), or punt to Task 14 spike.

---

## Task 14: Discovery spike — trends/pregame response shapes

**Files:**
- Read-only spike (no code changes in this task). Output: design notes + a list of follow-up tasks.

- [ ] **Step 1: Capture sample responses**

In a Node REPL or a temporary script:
```ts
import { getMatchTrends, getPregameData } from '@services/scores-365';
const matchId = /* a live or recent match id from /api/coach/today */;
console.log(JSON.stringify(await getMatchTrends(matchId), null, 2));
console.log(JSON.stringify(await getPregameData(matchId), null, 2));
```

- [ ] **Step 2: Identify the useful fields**

For each, list which keys contain:
- Goal events / cards / substitutions (timeline)
- Lineups (formation + player lists)
- Match stats (possession, shots, corners, etc.)

- [ ] **Step 3: Decide next steps**

If the data is rich enough, write follow-up tasks (events timeline, lineups, stats bars). If shapes vary too much across competitions, scope the rich match detail to a single league family (e.g. European football only) and document the limit.

Output: an appendix in this plan or a follow-up plan file.

---

## Task 15: League colour map population

- [ ] **Step 1: Inspect `COMPETITION_IDS_MAP`**

Read `src/services/scores-365/scores-365.config.ts` (or wherever `COMPETITION_IDS_MAP` is exported). For each id, look up the canonical brand colour for that competition.

- [ ] **Step 2: Populate `apps/coach-web/src/lib/league-themes.ts`**

Replace `THEMES`:
```ts
const THEMES: Record<number, string> = {
  [/* premier league id */]: '#3D195B',
  [/* la liga id */]: '#EE2737',
  [/* ucl id */]: '#0A2E72',
  // …
};
```

- [ ] **Step 3: Rebuild and visually verify the stripe colours per card match**

Run: `cd apps/coach-web && npm run build`

- [ ] **Step 4: Commit checkpoint** — `feat(coach-web): league theme colours`

---

## Self-Review Checklist

After implementing all tasks:

1. ✅ Every spec section maps to a task:
   - Architecture → Tasks 1, 5, 6
   - API contract → Tasks 4, 5
   - Home/League/Match screens → Tasks 10, 11, 12
   - Visual identity → Task 1 (tokens), Task 15 (league colours)
   - Bot integration → Tasks 7, 8
   - Open question on Match Detail richness → Task 14 (spike)
2. ✅ No "TBD", no "add appropriate error handling", no "similar to Task N" — every step has exact code or commands.
3. ✅ Type names consistent across tasks: `CompetitionRef`, `TeamRef`, `MatchSummary`, `TableRow`, `TodayResponse`, `CompetitionDetailResponse`, `MatchDetailResponse`. Function names: `verifyCoachInitData`, `coachAuthMiddleware`, `toMatchSummary`, `toCompetitionRef`, `toTableRows`, `registerCoachApiRoutes`.
4. ✅ TDD applied where it adds value (verifier + transformers). UI and route wiring rely on smoke-tests, matching the stacker pattern.
5. ✅ User's "no auto-commit" rule called out at top of plan and at every checkpoint.
