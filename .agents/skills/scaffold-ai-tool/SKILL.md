---
name: scaffold-ai-tool
description: Scaffold a new chatbot AI tool (Zod schema, runner, barrel export, agent registration) following MMPS conventions
---

# /scaffold-ai-tool

Create a new LangGraph tool for the chatbot agent end-to-end from a short description, wiring it through every place MMPS expects.

Use this when the user says things like "add a tool that…", "I want the chatbot to be able to…", "create an AI tool for…".

## Inputs to gather (ask only if missing)

1. **Tool name** — kebab-case dir + camelCase export (e.g. `flights` → `flightsTool`). Infer from the request when obvious.
2. **What it does** — the capability and the data source. If it needs an external API/service that doesn't exist yet, STOP and tell the user the service layer should be built first (point them at `/scaffold-service`); a tool should call a service, not embed raw HTTP/business logic.
3. **Parameters** — the inputs the model must provide. Decide which are required vs optional, and whether a single `action` enum is appropriate (the codebase favors one tool with an `action` enum over many tiny tools — see `polymarket`, `gmail`, `spotify`).

## Steps

### 1. Create the tool file
`src/shared/ai/tools/{name}/{name}.tool.ts`, modeled on `src/shared/ai/tools/crypto/crypto.tool.ts`:

```typescript
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { /* service fns */ } from '@services/{service}'; // or @shared/...

const schema = z.object({
  // Every field MUST have .describe(). Mark optionals with .optional().
  action: z.enum(['...', '...']).describe('Action to perform'),
  query: z.string().min(1).describe('...'),
});

async function runner({ action, query }: z.infer<typeof schema>) {
  switch (action) {
    // delegate to service/shared functions; keep business logic OUT of the tool
  }
}

export const {name}Tool = tool(runner, {
  name: '{name}',
  description: 'Short description the model uses to decide when to call this',
  schema,
});
```

Rules: `type` not `interface`; named exports only; `async/await` not `.then()`; `env` from `node:process` if needed; no JSDoc.

### 2. Barrel export
Add to `src/shared/ai/tools/index.ts`:
```typescript
export { {name}Tool } from './{name}/{name}.tool';
```
Confirm the tool is re-exported from `@shared/ai` (the chatbot imports tools from there).

### 3. Register in the agent
Edit `src/features/chatbot/agent/agent.ts`:
- Add `{name}Tool` to the import from `@shared/ai` (keep alphabetical order).
- Add `{name}Tool` to the `tools` array inside `agent()`.
- Add a capability line/section to `AGENT_PROMPT` describing when to use it and any natural-language variations (match the style of existing tools like Polymarket/Spotify). Update `AGENT_DESCRIPTION` if the new capability is significant.

### 4. Verify
- `npm run lint:fix` on the changed files.
- `npx tsc --noEmit` (or `npm run build`) to confirm types/imports resolve.
- Report the files created/edited. Do NOT commit unless the user asks.

## Checklist before finishing
- [ ] Tool file created with Zod `.describe()` on every field
- [ ] Business logic lives in a service/shared module, not the tool
- [ ] Barrel export added in `tools/index.ts`
- [ ] Imported + added to `tools` array in `agent.ts`
- [ ] `AGENT_PROMPT` (and `AGENT_DESCRIPTION` if needed) updated
- [ ] Lint + typecheck pass
- [ ] Did not commit
