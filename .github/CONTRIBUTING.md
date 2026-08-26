# Contributing to MMPS

Thanks for contributing. This file covers the mechanics: local setup, the checks that must pass, and how commits and releases work.

For coding conventions (types, imports, patterns, file layout) read **[`AGENTS.md`](../AGENTS.md)** — it is the canonical source and applies to humans and AI agents alike. Longer-form guides live on the [docs site](https://matansocher.github.io/mmps/).

## Prerequisites

- **Node.js 24.x** — the version is pinned in `.nvmrc`; run `nvm use` to match CI.
- **MongoDB** connection string (`MONGO_DB_URL`).
- A Telegram bot token for whichever bot you plan to run.

## Local setup

```bash
git clone https://github.com/matansocher/mmps
cd mmps
nvm use
npm install

cp .env.example .env
```

Fill in `.env` with at least:

- `MONGO_DB_URL`
- `LOCAL_ACTIVE_BOT_ID` — UPPERCASE bot id (`CHATBOT`, `CHILLI`, `COACH`, `LEARNER`, `WOLT`, `WORLDLY`)
- the matching `*_TELEGRAM_BOT_TOKEN`
- one of `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`

Then run a single bot:

```bash
npm run dev          # tsx watch — boots only LOCAL_ACTIVE_BOT_ID
npm run dev:debug    # same, with --inspect
```

In production all bots boot (`IS_PROD=true`); locally `LOCAL_ACTIVE_BOT_ID` selects exactly one. The `savings` web feature initializes regardless of bot selection.

Mini-apps are npm workspaces under `apps/` and run separately:

```bash
npm run dev:learner-web
npm run dev:savings-web
```

## Checks to run before opening a PR

CI runs these in order, so run the same locally:

```bash
npm run build          # tsc + tsc-alias + mini-app builds
npm run typecheck      # tsc --noEmit over src + tests
npm test               # Vitest unit specs (src/**/*.spec.ts)
npm run test:integration
npm run test:e2e       # grammY mock harness (test/e2e)
npm run lint           # ESLint over src, test, apps
```

Formatting is Prettier (200 char width, single quotes, semicolons, sorted imports):

```bash
npm run format         # write
npm run format:check   # verify
```

Docs live in `docs/` (VitePress): `npm run docs:dev`, `npm run docs:build`.

## Commit messages — Conventional Commits (enforced)

Commits are validated by **commitlint** (`@commitlint/config-conventional`) through a Husky `commit-msg` hook, and `semantic-release` derives version bumps and release notes from them. Non-conforming messages are rejected locally.

```
type(optional-scope): short imperative description
```

Types: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `build`, `ci`, `chore`, `style`, `revert`. Add `!` after the type/scope for a breaking change.

```bash
✅ git commit -m "feat(chatbot): add polymarket tool"
✅ git commit -m "fix(coach): correct match kickoff timezone"
❌ git commit -m "Added reminders"
```

Version impact: `fix` → patch, `feat` → minor, `!`/`BREAKING CHANGE` → major.

## Git hooks

Husky installs on `npm install` (`prepare` script):

- **`commit-msg`** — runs commitlint.
- **`pre-commit`** — when `package.json` or `package-lock.json` is staged, verifies the lockfile is in sync via `npm ci --dry-run --include=optional`. This catches the macOS-vs-Linux `optionalDependencies` drift ([npm/cli#4828](https://github.com/npm/cli/issues/4828)) before it breaks CI on Linux.

If the lockfile check fails:

```bash
rm -rf node_modules package-lock.json && npm install --include=optional
git add package-lock.json
```

Do not bypass hooks with `--no-verify`.

## Dependencies

`.npmrc` sets `include=optional`, so always install with optional dependencies included. Commit `package-lock.json` alongside any `package.json` change.

## Branching and pull requests

Branch off `main`:

- `feature/...` — new features
- `fix/...` — bug fixes
- `docs/...` — documentation
- `refactor/...` — refactoring

PRs are squash-merged, so **the PR title becomes the commit message — it must follow Conventional Commits** (same format as above). In the description, explain what changed and why, and note any new environment variables.

`main` is the release branch: a merge runs CI and then `semantic-release`, which tags, publishes GitHub release notes, and commits the version bump.

## AI-assisted workflows

Adding the **`implement`** label to an issue triggers `.github/workflows/implement.yml`, which runs Aider and opens an implementation PR. It is restricted to the repo owner and the companion app account, and its output still needs review before merging.

Project-local agent skills live in `.agents/skills/` (e.g. `review-style`, `planner`, `scaffold-ai-tool`, `scaffold-service`, `update-docs`) and are shared across agents — Copilot CLI reads `.agents/skills/` directly and Claude Code reaches it via the `.claude/skills` symlink. `CLAUDE.md`, `GEMINI.md`, and `.github/copilot-instructions.md` are symlinks to `AGENTS.md` — edit `AGENTS.md` only.

## Code conventions (short version)

Full detail in [`AGENTS.md`](../AGENTS.md). The rules most often missed:

- Use `type`, **never** `interface`; mark properties `readonly`.
- Named exports only — no default exports.
- `async`/`await` only — no `.then()` chains.
- No JSDoc; comment only non-obvious logic.
- Import Telegram helpers from `@services/telegram` (`@services/telegram-grammy` does not exist).
- Use path aliases (`@core/*`, `@features/*`, `@services/*`, `@shared/*`) instead of deep relative imports.
- Repository **functions**, not repository classes, for MongoDB access.
- Update the barrel `index.ts` when adding files.

Tests are `*.spec.ts` next to the source, with `describe()` grouping and `test.each()` for table-driven cases.

## Adding things

- **A chatbot AI tool** — create `src/shared/ai/tools/{name}/{name}.tool.ts` (Zod schema with `.describe()` on every field), export it from the tools barrel, and register it in `src/features/chatbot/agent/agent.ts`.
- **An external service** — create `src/services/{name}/` with `api.ts` (or `{name}.service.ts`), `types.ts`, optional `constants.ts`, and `index.ts`; document any new env var in `.env.example`.
- **A bot** — follow an existing `src/features/{bot}/` layout (`{bot}.init.ts`, `.controller.ts`, `.service.ts`, `.config.ts`, `types.ts`, `index.ts`), wire it into `src/index.ts`, and add it to the README table and the docs site.

Any new environment variable must be added to `.env.example`.
