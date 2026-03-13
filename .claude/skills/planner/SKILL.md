---
name: planner
description: Plan new MMPS features by exploring the codebase and producing a structured implementation plan that follows project conventions
---

# /planner

Plan a new feature or enhancement by exploring the codebase and producing an actionable implementation plan that follows MMPS project conventions.

## Instructions

### Phase 1 — Understand the Request

1. Read the user's description of what they want to build.
2. Classify the work into one or more categories:
   - **New bot feature** — new directory under `src/features/{name}/`
   - **New shared module** — new directory under `src/shared/{name}/`
   - **New AI tool** — new tool under `src/shared/ai/tools/{name}/`
   - **New external service** — new directory under `src/services/{name}/`
   - **Enhancement** — changes to existing feature, shared, or service code
   - **Scheduler** — new or modified cron-based scheduled task
3. Identify which existing bot(s) the feature belongs to (chatbot, coach, langly, magister, wolt, worldly) or whether it requires a new bot.

### Phase 2 — Explore the Codebase

Use the Agent tool with Explore subagents or direct file reads. Read actual files — do not guess.

1. **Similar features**: Find the most similar existing feature under `src/features/` or `src/shared/` and read its init, controller, service, and type files.
2. **Relevant services**: Check `src/services/` for external integrations the feature will need. Read their `api.ts` or `*.service.ts`.
3. **Relevant shared modules**: Check `src/shared/` for reusable logic (AI tools, reminders, etc.).
4. **Database**: If persistence is needed, find how similar features set up mongo collections — DB_NAME export, repository functions, connection init.
5. **AI integration**: If the feature involves AI tools, read `src/features/chatbot/agent/agent.ts` for tool registration and an existing tool (e.g., `src/shared/ai/tools/weather/`) for the Zod schema + runner pattern.
6. **Entry point**: Read `src/main.ts` or `src/index.ts` to understand how bots are conditionally initialized with `shouldInitBot`.

### Phase 3 — Identify Components

Build a table of every component the feature needs:

| Component | Status | Path |
|-----------|--------|------|
| Types | new/modify | `src/features/{name}/types.ts` |
| Config | new/modify | `src/features/{name}/{name}.config.ts` |
| Controller | new/modify | `src/features/{name}/{name}.controller.ts` |
| Service | new/modify | `src/features/{name}/{name}.service.ts` |
| Scheduler | new/modify | `src/features/{name}/{name}-scheduler.service.ts` |
| Init | new/modify | `src/features/{name}/{name}.init.ts` |
| Barrel export | new/modify | `src/features/{name}/index.ts` |
| Mongo repository | new/modify | `src/features/{name}/mongo/{name}.repository.ts` |
| AI tool | new/modify | `src/shared/ai/tools/{name}/{name}.tool.ts` |
| External service | new/modify | `src/services/{name}/api.ts` |
| Main entry | modify | `src/main.ts` or `src/index.ts` |

Remove rows that don't apply.

### Phase 4 — Ask Verification Questions

Ask the user **one round** of concise, numbered questions to confirm:

- Scope assumptions (e.g., "I'm assuming this only applies to the chatbot bot — correct?")
- Data model decisions (e.g., "Should this entity have a `priority` field?")
- Integration choices (e.g., "Should this use the existing weather-api service or a new provider?")
- Whether a scheduler is needed and at what frequency
- Whether new environment variables or API keys are required

Wait for answers before proceeding to Phase 5.

### Phase 5 — Produce the Implementation Plan

Output a structured plan with these sections:

**5.1 Overview** — One paragraph: what will be built and which architectural layers are involved.

**5.2 Files to Create** — For each new file:
- Path (full from project root)
- Purpose (one line)
- Key contents (types, functions, methods to implement)
- Reference file to follow (a real existing file with similar pattern)

**5.3 Files to Modify** — For each existing file:
- Path
- What to change (specific additions/modifications)

**5.4 Type Definitions** — The main types to create, using `type` with `readonly` properties. Show actual type signatures.

**5.5 Data Flow** — Numbered sequence: trigger → controller → service → repository/API → response.

**5.6 Dependencies** — New npm packages, environment variables, external APIs (if any).

**5.7 Implementation Order** — Dependency-aware numbered steps:
1. Types and config (no dependencies)
2. External service or repository (data layer)
3. Service (business logic)
4. Controller (depends on service)
5. Scheduler (depends on service, if applicable)
6. Init function (wires everything)
7. Main entry point registration
8. AI tool registration (if applicable)
9. Barrel exports and index updates

**5.8 Testing** — Which components need `*.spec.ts` files and what to test.

## Rules

- Follow all CLAUDE.md conventions: `type` not `interface`, named exports, async/await, `readonly` properties, no JSDoc.
- Reference a real existing file as the pattern to follow for each new file — never describe patterns abstractly.
- Use grammY patterns via `@services/telegram-grammy` for Telegram interactions.
- Use the agent descriptor pattern and Zod-based tool definitions for AI features.
- Do NOT produce implementation code — only the plan.
