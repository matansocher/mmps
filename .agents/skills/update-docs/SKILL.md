---
name: update-docs
description: Sync VitePress documentation with recent code changes
---

# /update-docs

Sync VitePress documentation with recent code changes.

## Instructions

1. **Determine what changed**: Run `git diff --name-only HEAD~1` (or a broader range if the user specifies). If the user points to a specific area, focus on that.

2. **Audit for accumulated drift** (docs often lag far behind a single commit). Cross-check these known drift-prone facts against the code before trusting any doc page:
   - **Bot list & count**: derive from the `shouldInitBot(...)` calls in `src/index.ts` — not from memory. Every bot should have a `docs/bots/{name}.md` page and a sidebar entry.
   - **Registered tool count/list**: count the `tools` array in `src/features/chatbot/agent/agent.ts` (directories under `src/shared/ai/tools/` may exist without being registered).
   - **Commands**: local dev is `LOCAL_ACTIVE_BOT_ID=<ID> npm run dev` with an UPPERCASE bot ID. There is no `npm run start:dev`.
   - **Env vars**: the Mongo connection var is `MONGO_DB_URL` (not `MONGO_URI`).
   - **Entry point**: `src/index.ts` (not `main.ts`).
   - **Telegram service**: `@services/telegram` (`@services/telegram-grammy` does not exist).
   - **DB names**: verify against each feature's `mongo/constants.ts` or init file — don't assume `{bot}-db`.

   A quick sweep: `grep -rn -iE "main\.ts|start:dev|MONGO_URI|telegram-grammy|[0-9]+ (bots|tools)" docs --include=*.md`

3. **Map changes to doc pages** using this guide:

   | Code area changed | Docs page to update |
   |-------------------|---------------------|
   | `src/features/{name}/` | `docs/bots/{name}.md` |
   | `src/shared/ai/tools/` | `docs/development/ai-tools.md` |
   | `src/services/{name}/` | Relevant architecture or service docs |
   | Architecture patterns, new patterns | `docs/architecture/*.md` |
   | Setup, config, env vars | `docs/guide/*.md`, `docs/deployment/*.md` |
   | `AGENTS.md` conventions (CLAUDE.md is a symlink) | `docs/architecture/*.md` or `docs/development/*.md` |
   | New/removed bot | `docs/bots/{name}.md`, `docs/bots/overview.md`, `docs/index.md`, `docs/architecture/overview.md`, sidebar |

4. **Read the existing doc pages** that need updating. Understand their current structure and style before making changes. For new bot pages, mirror the section layout of `docs/bots/coach.md` / `docs/bots/wolt.md` (Overview / Features / Configuration / Getting Started / Database / Scheduled Tasks / Next Steps).

5. **Update only what's needed**:
   - Add new sections for new features/tools/services
   - Update existing sections when behavior or APIs changed
   - Remove docs for deleted features
   - Keep the existing writing style and formatting consistent with the rest of the doc page
   - Document only what the code actually does — verify claims (commands, DB names, collections, cron schedules) against source

6. **Do NOT**:
   - Create new doc pages unless the change clearly requires one (e.g., a brand new bot)
   - Rewrite sections that weren't affected by the code change
   - Add speculative documentation for things not yet implemented
   - Change the VitePress config (`docs/.vitepress/`) unless sidebar entries are needed for new pages. When adding sidebar entries, update **both** `config.mjs` and `config.mts` — they duplicate each other and must stay in sync.

7. **Verify**: Run `npm run docs:build` and make sure it passes (it catches dead links).

8. **Report**: After updating, list which doc files were changed and summarize what was updated in each.
