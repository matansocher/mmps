---
name: integration-research
description: Research an external website, API, tool, or service and produce an MMPS-specific feasibility + integration plan
---

# /integration-research

Investigate a third-party website, API, SDK, MCP, or platform the user is considering, and report whether/how it can be integrated into MMPS — with a concrete, convention-aware plan. This is research + planning only; it does NOT write feature code (hand off to `/scaffold-service` or `/scaffold-ai-tool` once the user approves).

Use this when the user says "look at this site/API and tell me what I'd need to do", "can I use X for this project?", "explore X, I want to add it", "investigate moving to X".

## Steps

### 1. Clarify the goal
Pin down what the user actually wants from the integration (e.g. "get tweets of specific users", "generate images", "host the app cheaper"). Note any hard constraints they mention (free tier, no paid API, must run on a schedule, etc.).

### 2. Research the target
- Fetch official docs / the site itself (use web fetch/search). Find: auth model, pricing/free-tier limits, rate limits, available endpoints/SDKs/MCP, data formats, and Terms-of-Service red flags (esp. for scraping).
- If it's an npm package or MCP, check it exists and is maintained.
- Prefer primary sources (official docs, the provider's API reference) over blog posts.

### 3. Assess fit against MMPS
Map the integration onto the repo's actual structure:
- **External API/SDK/scraper** → new `src/services/{name}/` (use `/scaffold-service`). Note the env var(s) needed.
- **Chatbot capability** → new tool in `src/shared/ai/tools/` (use `/scaffold-ai-tool`).
- **Scheduled behavior** → a `*-scheduler.service.ts` cron job in the relevant feature.
- **MCP server** → how it'd connect (see how `connectGithubMcp` is wired in `chatbot.init.ts`).
- **Infra/hosting** (e.g. Cloudflare, Grafana) → call out what changes in deploy/runtime, not app code.
Identify which existing service is the closest analog to copy.

### 4. Deliver the report
Output (in chat, or as an artifact in the session `files/` dir if long) with these sections:
1. **What it is** — 2-3 lines.
2. **Feasibility verdict** — ✅ recommended / ⚠️ possible with caveats / ❌ not worth it, plus the deciding factors (cost, ToS, rate limits, maintenance).
3. **Free / cheap path** — if the user wanted free, state whether it's actually achievable and how.
4. **Integration plan** — concrete MMPS file list: which `src/services/...`, `src/shared/ai/tools/...`, schedulers, env vars, and the closest existing pattern to copy.
5. **Risks / unknowns** — ToS, fragility (scraping), quota, anything needing the user's account/keys.
6. **Next step** — the exact follow-up skill/command to run if they approve.

## Rules
- Cite sources (URLs) for any pricing, limits, or capability claims — do not invent numbers.
- Respect ToS: flag scraping/automation that violates a provider's terms; offer official-API alternatives.
- Do NOT start building. End by asking the user if they want to proceed with the proposed plan.
- Keep secrets out of any output.
