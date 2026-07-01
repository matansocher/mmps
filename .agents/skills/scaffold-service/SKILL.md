---
name: scaffold-service
description: Scaffold a new external service integration under src/services following MMPS conventions
---

# /scaffold-service

Create a new external service integration (`src/services/{name}/`) that wraps a third-party API/SDK, following the shape of existing services like `alpha-vantage`, `twitter`, and `open-weather-map`.

Use this when the user says "integrate X", "add a service for X", "I want to scrape/fetch X", "wrap the X API".

## Inputs to gather (ask only if missing)

1. **Service name** — kebab-case dir (e.g. `alpha-vantage`, `yahoo-finance`).
2. **Provider details** — base URL or SDK package, auth method (API key? OAuth? none?), and which endpoints/operations are needed.
3. **Env var name** — follow the existing convention (e.g. `ALPHA_VANTAGE_API_KEY`, `YOUTUBE_API_KEY`). Read `node:process` `env`.
4. **Consumer** — is this for a chatbot AI tool, a bot feature, or a script? (Determines who calls it; the service itself stays consumer-agnostic.)

If an npm SDK is involved, install it with `npm install <pkg>` (only after confirming it's a real dependency change).

## Files to create

Model on `src/services/alpha-vantage/` (`api.ts` + `types.ts` + `index.ts`); add `constants.ts` only if there are shared constants.

### `src/services/{name}/types.ts`
```typescript
export type {Name}Response = {
  readonly id: string;
  // ... readonly fields, type not interface
};
```

### `src/services/{name}/constants.ts` (optional)
```typescript
export const BASE_URL = 'https://api.example.com';
```

### `src/services/{name}/api.ts` (or `{name}.service.ts` for stateful clients)
```typescript
import axios from 'axios';
import { env } from 'node:process';
import { {Name}Response } from '@services/{name}/types';

const baseURL = 'https://api.example.com';

export async function getSomething(param: string): Promise<{Name}Response | null> {
  const { data } = await axios.get(`${baseURL}/...`, {
    params: { apikey: env.{NAME}_API_KEY, param },
  });
  return data ?? null;
}
```
- Functions for stateless API calls; a class only if it holds state (e.g. token refresh — see `spotify`).
- `async/await`, never `.then()`.
- Validate config early: `if (!env.{NAME}_API_KEY) throw new Error('...');`

### `src/services/{name}/index.ts` (barrel)
```typescript
export { getSomething } from './api';
export type { {Name}Response } from './types';
```

## Wire-up & docs

1. **Env**: add the new var to `.env.example` (with a placeholder/comment).
2. **Path alias**: confirm `@services/{name}` resolves (covered by `@services/*` in `tsconfig.json` — no config change needed).
3. If the user wants it exposed to the chatbot, follow up with `/scaffold-ai-tool` to create the tool that calls these functions.

## Verify
- `npm run lint:fix` on changed files.
- `npx tsc --noEmit` (or `npm run build`) to confirm types/imports.
- Optionally write a tiny throwaway script or `*.spec.ts` to confirm a live call works (ask before hitting paid APIs).
- Report files created. Do NOT commit unless asked.

## Checklist
- [ ] `types.ts` uses `type` + `readonly`, no `interface`
- [ ] `api.ts`/`*.service.ts` uses `async/await`, `env` from `node:process`
- [ ] Early validation of required config
- [ ] Barrel `index.ts` with named exports (functions + `export type`)
- [ ] Env var added to `.env.example`
- [ ] Lint + typecheck pass
- [ ] Did not commit
