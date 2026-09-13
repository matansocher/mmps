# Evals

Token-costing evaluation suites that treat prompts like tested code. Kept **out of `npm test`**
(they hit the real model and cost money) — run them explicitly.

## Chatbot routing eval

Measures how well the chatbot's real system prompt (`src/features/chatbot/agent/agent.ts`)
routes user messages through the correct **tools, arguments, and multi-step workflows** across
60 golden cases spanning three explicit categories — **single-domain** requests (one tool),
**cross-domain** requests (one message that must span two or more tools, e.g. "add the next
Real Madrid match to my calendar"), and **ambiguous / underspecified** requests (the agent
should clarify rather than guess a wrong tool). It reuses the exact production prompt and real
tool schemas, but swaps every
tool body for a spy. Cases can provide realistic fixture responses so ID-dependent workflows
such as `list → delete` can complete without touching Gmail, Calendar, MongoDB, or other services.

### Run it

```bash
# OPENAI_API_KEY is auto-loaded from .env (via dotenv) if present, else from the environment
npm run eval:chatbot
```

If `OPENAI_API_KEY` is missing (not in `.env` or the environment), the suite skips gracefully
with a warning.

### Knobs (env vars)

| Var                | Default | Meaning                                                                               |
| ------------------ | ------- | ------------------------------------------------------------------------------------- |
| `EVAL_RUNS`        | `3`     | Times each case is run (majority vote decides pass/fail — robust to non-determinism). |
| `EVAL_CONCURRENCY` | `4`     | Max cases run in parallel (keeps under rate limits).                                  |
| `EVAL_LIMIT`       | all     | Run only the first N cases (cheap smoke test).                                        |

```bash
EVAL_LIMIT=5 EVAL_RUNS=1 npm run eval:chatbot   # ~5 calls, cheap smoke test
EVAL_RUNS=5 EVAL_CONCURRENCY=6 npm run eval:chatbot
```

### What you get

- **Per-case pass/fail** — each golden case is a Vitest test; passes if the majority of its runs
  routed correctly, matched critical arguments, completed any expected ordered workflow, and
  produced the expected confirmation/clarification response where configured.
- **Aggregate report** (printed + written to `test/eval/results/`, gitignored):
  - `chatbot-routing.latest.json`
  - `chatbot-routing.latest.md`
  - `chatbot-routing.latest.html` — responsive, self-contained dashboard with the run date,
    summary metrics, measured cost, category results, and expandable failure details.

### Metrics

| Metric                   | Meaning                                                                                                           |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| **Routing accuracy**     | % of cases that routed to the correct tool (overall + per category).                                              |
| **Argument correctness** | % of arg-checked cases with correct `action`/args (dates → 18:00 default, GitHub `implement`/`review` labels, …). |
| **Workflow correctness** | % of workflow-checked cases that completed the expected ordered calls or confirmation response.                   |
| **Over-trigger rate**    | % of no-tool cases where the agent wrongly called a tool.                                                         |
| **Cost / latency**       | Total + per-run USD (via `UsageCallbackHandler`) and avg/p95 latency.                                             |

### Adding cases

Edit `test/eval/chatbot/dataset.ts`. A direct tool case:

```ts
{
  id: 'reminder-default-01',
  category: 'reminders',          // used for per-category reporting
  input: 'remind me tomorrow to pay rent',
  expect: {
    tool: 'smart_reminders',      // string | string[] | null (null = must NOT call a tool)
    action: 'create',             // optional; string | string[]
    args: { dueDate: /T18:00:00/ }, // optional; RegExp | string | number | predicate fn
  },
}
```

ID-dependent workflows can define ordered calls and realistic tool fixtures:

```ts
{
  id: 'gmail-delete-01',
  category: 'gmail',
  input: 'delete the email from shani',
  expect: {
    tool: 'gmail',
    sequence: [
      { tool: 'gmail', action: 'list', args: { query: /from:shani/i } },
      { tool: 'gmail', action: 'delete', args: { emailId: 'email-shani-1' } },
    ],
  },
  fixtures: {
    gmail: ({ action }) =>
      action === 'list'
        ? { emails: [{ id: 'email-shani-1', from: 'shani@example.com' }] }
        : { success: true },
  },
}
```

Use an input array for multi-turn cases. For confirmation or clarification behavior, use
`tool: null` with a `response` matcher.

Guidelines:

- Keep cases self-contained. Use input arrays only when conversation context is what the case tests.
- Only assert `action`/`args` where they actually matter — don't over-specify.
- Use `tool: null` for smalltalk / general-knowledge messages that shouldn't call a tool.
- Use ordered `sequence` expectations when a workflow must resolve an ID before acting.
- Return realistic fixture IDs so the model can continue through every expected step.
- Tag every case with a `category` so the per-domain breakdown stays meaningful.

### Design notes

- Agent is built **isolated**: in-memory saver, no Mongo checkpointer, no summarization —
  we test the prompt + tools, not persistence.
- Model is `gpt-4.1-mini` at `temperature: 0.2` (prod parity).
- Spy tools are cloned from `agent().tools`, so the eval automatically tracks the real
  registered tool set and schemas.
