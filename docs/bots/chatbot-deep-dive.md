# Chatbot — Deep Dive

A single-agent, tool-using Telegram AI assistant built on **LangChain / LangGraph**, with durable MongoDB memory, conversation summarization, and per-turn token/cost observability.

This page goes deeper than the [Chatbot overview](/bots/chatbot) — it explains the AI concepts, the LangGraph runtime, and the design tradeoffs behind the feature, so you can reason about (or explain) it end-to-end.

## 1. What it is (30-second version)

The **chatbot** is one of six Telegram bots in the `mmps` monorepo. It's a **conversational AI assistant** that users message on Telegram. Under the hood it's a **ReAct agent** (Reason + Act) that can call **31 tools** — weather, Gmail, Google Calendar, reminders, sports predictions, Spotify, GitHub automation, Polymarket, and more.

Key engineering properties:

- **Durable memory** — conversation state persists in MongoDB across restarts/deploys (LangGraph checkpointer), keyed per user.
- **Bounded context** — old turns are compressed into a running summary instead of being dropped (summarization middleware).
- **Observability** — every turn's token usage and USD cost is metered and stored, with a weekly report DM'd to the owner.
- **Multimodal** — accepts text, photos (vision analysis), and voice/audio (transcription).
- **Proactive** — 15+ cron schedulers push nightly summaries, football predictions, reminders, earthquake alerts, etc.

## 2. AI/LLM concepts glossary

| Term | What it means (and how it shows up here) |
|------|------------------------------------------|
| **LLM** | Large Language Model. Here: OpenAI `gpt-4.1-mini` via `ChatOpenAI`, `temperature: 0.2` (low = more deterministic). |
| **Agent** | An LLM that decides *which action to take next* in a loop, rather than emitting one answer. It can call tools, read results, and iterate. |
| **ReAct** | *Reasoning + Acting* pattern: the model interleaves "thought → tool call → observation → thought…" until it can answer. This is exactly what `createAgent()` builds. |
| **Tool / function calling** | Structured functions the LLM can invoke. The model outputs a JSON tool call; the runtime executes the real code and feeds the result back. Defined with `tool()` + a **Zod** schema. |
| **LangChain** | Framework for composing LLM apps (models, tools, prompts, callbacks, structured output). |
| **LangGraph** | LangChain's **stateful graph runtime**. An agent is a compiled state graph of nodes (LLM node, tool node) with edges. Enables loops, persistence (checkpointers), and middleware. |
| **Checkpointer** | Persists graph state after each step, keyed by `thread_id`. Enables durable, resumable conversations. Here: `MongoDBSaver`. |
| **Thread** | An isolated conversation identity. Here `thread_id = chatId` (a Telegram user ⇒ their own memory). |
| **Context window** | Max tokens the model can attend to. Grows with history — hence summarization to stay under budget. |
| **Token** | Sub-word unit of text; billing + context are measured in tokens. Tracked as `tokensIn`/`tokensOut`. |
| **System prompt** | Instructions that define the agent's role/behavior, prepended to every call. Here a very large prompt describing each tool + guidelines. |
| **Structured output** | Forcing the LLM to return schema-valid JSON via `withStructuredOutput(zodSchema)`. |
| **Callback handler** | Hooks into the LangChain run lifecycle (LLM start/end, tool start/end/error) for logging, metering, streaming. |
| **Middleware** | Logic injected into the agent graph — here `summarizationMiddleware` compresses history inside the loop. |
| **Recursion limit** | Cap on agent loop iterations (default 100) to prevent infinite tool-calling loops. |
| **Temperature** | Sampling randomness. Low (0.2) → focused, repeatable; high → creative, varied. |

## 3. Architecture & file map

The feature lives in `src/features/chatbot/` and follows the repo's **Controller → Service → Agent** layering plus shared AI infrastructure in `src/shared/ai/`.

| File | Responsibility |
|------|----------------|
| `chatbot.init.ts` | Manual DI wiring. Opens Mongo connections, builds the checkpointer, creates service/controller/scheduler, registers routes + SPA, boots the bot. |
| `chatbot.controller.ts` | grammY handlers: `/start /help /app /exercise`, text, photo, audio. Wraps calls in `MessageLoader` (reaction + typing + loader). |
| `chatbot.service.ts` | The brain. Builds the model, summarization middleware, and agent service; `processMessage()` is the single entry point. |
| `agent/agent.ts` | The **AgentDescriptor**: name, giant system prompt, and the array of 31 tools. |
| `agent/factory.ts` | `createAgentService()` — calls LangChain `createAgent()` and wraps the compiled graph. |
| `agent/service.ts` | `AiService` — thin wrapper over the compiled graph: `invoke`/`stream`/`getState`, builds `RunnableConfig` (thread_id, callbacks, recursion limit). |
| `agent/checkpointer.ts` | `createChatbotCheckpointer()` — Mongo-backed persistence, db `Chatbot`, 30-day TTL. |
| `chatbot-scheduler.service.ts` | 15+ cron jobs (node-cron) for proactive messages. |
| `schedulers/*.ts` | Individual scheduled tasks (daily summary, football, reminders, usage report…). |
| `chatbot.config.ts` | Bot config, summarization thresholds, usage kill-switch, summary prompt. |
| `utils.ts` | `formatAgentResponse()` — extracts the final message + tool results from the graph output. |
| `shared/ai/utils/` | `ToolCallbackHandler`, `UsageCallbackHandler`, model pricing. |
| `shared/ai/usage/` | Usage record type, Mongo repo (`usage` collection, 90-day TTL), aggregation. |

**Message path:**

```
Telegram → ChatbotController (grammY) → MessageLoader
        → ChatbotService.processMessage()
            → AiService.invoke()
                → LangGraph ReAct agent (model + tools + summarization middleware)
                    ↕ MongoDBSaver checkpointer (per thread_id)
            → formatAgentResponse()  +  recordModelUsage()
        → sendRichMessage() back to Telegram
```

## 4. The ReAct agent & LangGraph runtime

The whole "brain" is created by one LangChain call in `factory.ts`:

```ts
const reactAgent = createAgent({
  model,                    // ChatOpenAI (gpt-4.1-mini)
  tools,                    // 31 Zod-schema tools
  systemPrompt: descriptor.prompt,
  checkpointer,             // MongoDBSaver — durable state
  middleware,               // [summarizationMiddleware]
});
return new AiService(reactAgent.graph, { name, callbacks });
```

`createAgent()` compiles a **LangGraph state graph** implementing the ReAct loop:

1. **Agent (LLM) node** — the model reads the message history + system prompt and either answers or emits tool calls.
2. **Conditional edge** — if there are tool calls → go to the tool node; otherwise → END.
3. **Tool node** — executes the requested tool(s), appends their outputs as `ToolMessage`s, loops back to the LLM node.

The graph's shared state is `MessageState = { messages: BaseMessage[] }` — an append-only list of Human/AI/Tool/System messages. This loop repeats until the model produces a final answer or hits the `recursionLimit` (100).

::: tip Why LangGraph over plain function-calling?
Because you get **persistence, resumability, middleware injection, and loop control for free**. The "graph" abstraction is what makes durable memory and mid-loop summarization possible without hand-rolling a state machine.
:::

## 5. The Agent Descriptor pattern

Agents are described by a plain data object, decoupling *what the agent is* from *how it's built*:

```ts
export type AgentDescriptor = {
  name: string;
  description?: string;
  prompt: string;                                  // system prompt
  tools: (DynamicTool | DynamicStructuredTool<any>)[];
};

export function agent(): AgentDescriptor {
  return { name: 'CHATBOT', description: '…', prompt: AGENT_PROMPT, tools: [weatherTool, gmailTool, /* …31 */] };
}
```

The **system prompt** is large and deliberately explicit: it names every tool, its actions, natural-language trigger phrases, timezone rules (`Asia/Jerusalem`), reminder defaults (18:00), and the GitHub "implement/review" label workflow. This is **prompt engineering as configuration** — the model's routing accuracy depends heavily on this text.

## 6. Factory & AiService wrapper

- **`factory.ts`** — Turns a descriptor + options into a runnable service. Defaults `checkpointer` to in-memory `MemorySaver` if none is passed (used by other bots); the chatbot passes the Mongo one.
- **`service.ts` (`AiService`)** — Thin wrapper around the compiled graph. Its job is to build the `RunnableConfig`: sets `configurable.thread_id`, merges default + per-call callbacks, and applies the recursion limit. Exposes `invoke`, `stream`, `getState`.

::: tip Separation of concerns
`AgentDescriptor` = declarative config, `factory` = construction, `AiService` = runtime config/invocation. Same infra is reused by other bots (chilli, secretary), which is why it lives in a factory rather than being inlined.
:::

## 7. Tools with Zod schemas

Every tool is a `tool(runner, { name, description, schema })` where `schema` is a Zod object and **every field has `.describe()`** — those descriptions are what the LLM reads to decide arguments.

```ts
const schema = z.object({
  action: z.enum(['create','list','complete','delete','edit','snooze']).describe('The action to perform'),
  message: z.string().optional().describe('The reminder text (required for create/edit)'),
  dueDate: z.string().optional().describe('ISO 8601 local time e.g. 2025-01-15T14:30:00'),
});
async function runner({ action, message, dueDate }: z.infer<typeof schema>): Promise<string> { /* switch(action) */ }
export const reminderTool = tool(runner, { name: 'smart_reminders', description: '…', schema });
```

Conventions worth calling out:

- **Action-enum pattern** — one tool exposes many operations via an `action` enum (keeps the tool count manageable vs. one tool per operation).
- **Return strings (usually JSON strings)** — tools return serialized results; errors are caught and returned as `{ success:false, error }` so a failing tool degrades gracefully instead of throwing.
- **Zod = validation + schema** — the same schema both validates args and is converted to the JSON schema sent to the model for function calling.

Tools live in `src/shared/ai/tools/{name}/`, are re-exported from a barrel, and registered in `agent.ts`. The 31 tools group into: personal/productivity (calendar, gmail, reminders, contacts, recipes, exercise), media (spotify, image, audio), information (weather, earthquake, maps, stocks, crypto, flights), sports/games (sports, makavdia, wolt, worldly), markets (polymarket), dev (github).

## 8. Memory — the MongoDB checkpointer

This is the flagship "durable state" feature. LangGraph checkpointers snapshot the graph state after every step so a conversation survives process restarts.

```ts
export async function createChatbotCheckpointer(): Promise<MongoDBSaver> {
  const client = new MongoClient(env.MONGO_DB_URL);
  await client.connect();
  const checkpointer = new MongoDBSaver({ client, dbName: 'Chatbot', ttl: THIRTY_DAYS_IN_SECONDS });
  await checkpointer.setup();  // creates collections/indexes
  return checkpointer;
}
```

- Replaces the default in-RAM `MemorySaver` (which loses history on restart/deploy).
- State is keyed by `thread_id` — derived from the Telegram `chatId`, so each user has isolated memory.
- **30-day TTL** — old threads auto-expire (Mongo TTL index) for privacy + storage hygiene.

::: warning Sharp edge — init ordering
The checkpointer is built **before** `provideTelegramBot()` in `init`. grammY locks the bot against new listeners once `bot.start()` polling begins, so an `await` between starting the bot and registering handlers would let polling win the race and make `controller.init()` throw. Ordering the async work carefully is the fix — a concrete example of a subtle init-order concurrency bug.
:::

::: tip Type-cast at a boundary
The official saver pins mongodb v6 types while the repo uses v7; the runtime API is compatible, so the client is cast `as never` at that one boundary — a pragmatic, well-commented escape hatch.
:::

## 9. Context bounding — summarization middleware

Persisting everything forever would blow the context window and cost. So the service registers LangChain's `summarizationMiddleware` into the agent graph:

```ts
const summarization = summarizationMiddleware({
  model: this.model,
  trigger: { messages: CHATBOT_CONFIG.summarization.triggerMessages },  // ~40
  keep:    { messages: CHATBOT_CONFIG.summarization.keepMessages },     // ~20
  summaryPrompt: CHATBOT_SUMMARY_PROMPT,
});
```

- Once a thread grows past **~40 messages**, it compresses the oldest turns into a **running summary** and keeps the last **~20** verbatim.
- The summary is written back into state and **persisted by the checkpointer** — old turns are compressed in Mongo, not deleted.
- This **replaced** an older manual "drop-oldest" truncation (`truncateThread`) — the middleware does it *inside* the graph loop.
- The summary prompt is tuned to preserve durable facts (name, location, health, diet, open tasks, decisions) and to **keep the original language** (Hebrew stays Hebrew).
- Tunable via `CHATBOT_SUMMARY_TRIGGER_MESSAGES` / `CHATBOT_SUMMARY_KEEP_MESSAGES`.

::: tip Checkpointer vs. summarization
Two complementary things: the **checkpointer = persistence** (state survives restarts); **summarization = context bounding** (state stays small enough to fit + stay cheap). Together: lossless-on-important-facts, bounded-size, durable memory.
:::

## 10. Threads, context injection & dev isolation

In `processMessage()` each user message is enriched before hitting the agent:

```ts
const contextualMessage = `[Context: User ID: ${chatId}, Time: ${formattedTime} (${DEFAULT_TIMEZONE})]\n\n${message}`;
const threadId = isProd ? chatId.toString() : `dev-${chatId.toString()}`;
```

- **Context injection** — user id + current local time are prepended so the model can reason about "today", "tomorrow", timezone, and personalization without a tool call.
- **Dev/prod thread isolation** — local runs prefix `dev-` so test conversations don't pollute the user's real memory thread.

## 11. Callback handlers (observability hooks)

LangChain callbacks tap the run lifecycle. Two custom handlers:

- **`ToolCallbackHandler`** — Hooks `handleToolStart/End/Error`. Times each tool, optional logging, and forwards to user-supplied `onToolStart/onToolEnd/onToolError`. The chatbot uses only `onToolError` (logs failures) and keeps logging off. Attached as a **default callback** when the agent is built.
- **`UsageCallbackHandler`** — Hooks `handleLLMEnd` (sums `usage_metadata` input/output tokens **per model**) and `handleToolStart` (counts tool calls). One instance per **user turn**, passed as a **runtime callback** to `invoke`. Exposes `summary()` with rolled-up cost.

::: tip Default vs runtime callbacks
`AiService` merges **default callbacks** (set at build time, e.g. tool logging) with **per-invoke callbacks** (e.g. the per-turn usage handler). This is why usage is measured per turn but tool-error logging is global.
:::

## 12. Token & cost observability

A full metering pipeline (shared across bots but registered by the chatbot):

```
per turn: new UsageCallbackHandler  →  invoke(agent, { callbacks:[handler] })
handler sums tokens per model across the whole ReAct loop (incl. summarization LLM call)
→ recordModelUsage({ source:'chatbot', chatId, handler, durationMs })
    → logs "💰 usage …"  +  fire-and-forget saveUsageRecord() to Mongo
        → collection usage (db Chatbot), 90-day TTL
```

- **Pricing** — `model-pricing.ts` holds USD-per-1M-token rates; `computeModelCost()` multiplies tokens by rate. `resolveModelPrice()` does **longest-prefix matching** so dated snapshots like `gpt-4.1-mini-2025-04-14` resolve to the base price. Unknown model → cost 0 + a warn (never crashes).
- **Record fields** — `source, chatId, model, tokensIn/Out/Total, cost, durationMs, llmCalls, toolCalls, createdAt`.
- **Aggregation** — `aggregateUsage()` groups by source + user + day (Asia/Jerusalem) via a Mongo aggregation pipeline.
- **Weekly report** — a Saturday 22:30 cron (`usageSummary`) DMs the owner a 7-day cost/usage breakdown.
- **Kill-switch** — `CHATBOT_USAGE_TRACKING=false` disables it. Fire-and-forget writes mean metering never blocks or breaks a reply.

::: warning Nuance
There's no official LangChain package for cost tracking — the callback handler *is* the implementation. Also: non-chatbot bots only persist usage when the chatbot is booted (it registers the `Chatbot` Mongo connection); otherwise writes fail silently.
:::

## 13. Structured output (optional 2nd pass)

`processMessage()` is overloaded. Without a schema it returns a normal `ChatbotResponse`. With a Zod schema, it runs a **second constrained LLM call** to coerce the answer into typed JSON:

```ts
const structuredModel = this.model.withStructuredOutput(responseSchema);
const structured = await structuredModel.invoke([new HumanMessage(agentResponse.message)]);
return { response: agentResponse, structured };
```

Used by schedulers/API paths that need machine-readable results (e.g. a predictions payload) rather than free-form prose.

## 14. Multimodal input/output

| Input | Handling |
|-------|----------|
| **Text** | Straight to `processMessage()`. |
| **Photo** | Download → upload to Imgur → `analyzeImage()` (OpenAI vision) → feed the textual analysis into the agent. |
| **Voice/Audio** | Download → `getTranscriptFromAudio()` (Whisper-style transcription) → feed transcript into the agent. |

Every handler wraps work in `MessageLoader` — instant reaction emoji, a "typing…" action, a delayed loader message, and auto-cleanup — so the user gets feedback during slow tool/LLM calls. Output goes back via `sendRichMessage` (markdown-safe with fallbacks).

## 15. Proactive schedulers (cron)

`ChatbotSchedulerService` registers 15+ `node-cron` jobs (all in `Asia/Jerusalem`). Some just push data; many **reuse the same agent** by calling `chatbotService.processMessage()` with a crafted prompt — so scheduled content benefits from the same tools + formatting.

| Job | Schedule | What |
|-----|----------|------|
| Nightly summary | 23:00 | Weather + calendar + exercise, phrased as a goodnight message. |
| Football | 12:59 / 23:59 | Match updates & predictions. |
| Reminders / events | every 15m | Fires due reminders & upcoming-event alerts. |
| Earthquake monitor | every N min | USGS polling with lookback window. |
| Polymarket | 16:05 | Daily price updates for subscribed markets. |
| Usage report | Sat 22:30 | Weekly cost/token breakdown DM. |

::: tip Pattern to remember
**The scheduler and the chat handler share one brain.** A cron job is just another producer of a prompt into `processMessage()` — DRY, and scheduled output looks/behaves like chat output.
:::

## 16. Boot lifecycle (manual DI)

No framework/IoC container — `initChatbot(app)` wires everything by hand:

1. Open all needed Mongo connections in parallel (`Promise.all`) + `ensureUsageIndexes()`.
2. Build the **checkpointer** (await it here, before the bot starts — race-condition fix).
3. `provideTelegramBot()` (memoized grammY bot; starts polling).
4. Construct `ChatbotService(checkpointer)` → `ChatbotController` → `ChatbotSchedulerService`.
5. `controller.init()` registers handlers; `scheduler.init()` registers cron; register HTTP/API routes; init Octokit; serve the `/chatbot` SPA (mini-app).

Only boots in prod, or locally when `LOCAL_ACTIVE_BOT_ID=CHATBOT`.

## 17. Design tradeoffs

| Decision | Why / tradeoff |
|----------|----------------|
| Single agent, 31 tools | Simpler than a multi-agent orchestrator (the type system supports an `OrchestratorDescriptor`, but the chatbot uses one flat agent). Risk: a huge system prompt & tool list can confuse routing — mitigated by very explicit prompt guidance. |
| Summarize vs. truncate | Summarizing preserves long-term facts at the cost of an extra LLM call. Chosen because it's a *personal* assistant where remembering user facts matters. |
| Mongo checkpointer + 30-day TTL | Durable across deploys; TTL bounds storage & respects privacy. Tradeoff: memory of very old conversations is intentionally lost. |
| Fire-and-forget usage writes | Observability must never slow or break a user reply; accept rare lost records. |
| Low temperature (0.2) | Assistant/tool-routing wants determinism & correctness over creativity. |
| `gpt-4.1-mini` | Cheap + fast for a high-frequency personal bot; big prompt makes token cost matter, hence mini + summarization + metering. |
| Tools return error strings, not throws | A failing tool degrades gracefully — the agent can apologize / try alternatives instead of crashing the turn. |

## 18. Likely interview questions & crisp answers

**Q: What is a ReAct agent and how does it differ from a single LLM call?**
A single call returns one answer. A ReAct agent loops: it reasons, decides to call a tool, reads the tool result, and repeats until it can answer. LangGraph compiles this into a state graph with an LLM node, a tool node, and a conditional edge, bounded by a recursion limit.

**Q: How does the bot remember conversations across restarts?**
A LangGraph **MongoDBSaver checkpointer** snapshots graph state after each step, keyed by `thread_id` (the Telegram chatId). On the next message it reloads that thread's state. A 30-day TTL expires stale threads.

**Q: The context window is limited — how do you handle long conversations?**
`summarizationMiddleware`: past ~40 messages it compresses the oldest turns into a running summary and keeps the last ~20 verbatim. The summary is persisted by the checkpointer, so we bound tokens without dropping important facts.

**Q: How are tools defined and how does the model know when to use them?**
Each tool is `tool(runner, { name, description, schema })` with a Zod schema where every field is `.describe()`d. Those descriptions + the system prompt (which lists trigger phrases per tool) are converted to JSON schema for OpenAI function-calling; the model emits a tool call, the runtime executes it, and the result re-enters the loop.

**Q: How do you track cost?**
A per-turn `UsageCallbackHandler` sums `usage_metadata` tokens per model across every LLM call in the loop. `recordModelUsage` multiplies by a per-model price table (longest-prefix match for dated snapshots) and fire-and-forget stores a record in Mongo. A weekly cron DMs a breakdown.

**Q: How would you add a new capability?**
Create `src/shared/ai/tools/{name}/{name}.tool.ts` with a Zod schema + runner, export it from the barrel, add it to the `tools` array in `agent.ts`, and describe it in the system prompt. No graph changes needed — the ReAct loop picks it up automatically.

**Q: What's the difference between the checkpointer and the summarization middleware?**
Checkpointer = **persistence** (durable, resumable state per thread). Summarization = **context bounding** (keeps the state small & cheap). Orthogonal concerns that combine into durable-but-bounded memory.

**Q: How does it handle images / voice?**
Non-text is converted to text first: photos via OpenAI vision (`analyzeImage`), audio via transcription (`getTranscriptFromAudio`). The resulting text is fed into the same agent — the agent itself is text-in/text-out.

**Q: What happens if a tool fails?**
Tools wrap their body in try/catch and return `{ success:false, error }` as a string; a `ToolCallbackHandler.onToolError` logs it. The agent sees the error as an observation and can apologize or try another approach — the turn doesn't crash.

## 19. The 60-second whiteboard pitch

> It's a Telegram AI assistant built as a **LangGraph ReAct agent**. A user message enters through a grammY controller, gets enriched with user-id and local time, and is passed to a single agent wired with **31 Zod-schema tools**. The agent runs a reason→act loop: the LLM decides whether to call tools, the tool node executes them, results re-enter the loop until it answers.
>
> State lives in a **MongoDB checkpointer** keyed per user, so memory survives restarts, with a 30-day TTL. To stay within the context window I use **summarization middleware** that compresses old turns into a running summary while keeping recent ones verbatim — durable but bounded memory. Every turn is metered by a **callback handler** that sums tokens per model and stores cost in Mongo, with a weekly report.
>
> It's multimodal — images and voice are transcribed to text first — and proactive, with cron schedulers that reuse the exact same agent to push nightly summaries, predictions, and reminders. Adding a capability is just a new tool file plus one line in the agent descriptor.

## Next Steps

- [Chatbot Overview](/bots/chatbot)
- [Architecture Overview](/architecture/overview)
- [AI Tool Development](/development/ai-tools)
- [All Bots](/bots/overview)
