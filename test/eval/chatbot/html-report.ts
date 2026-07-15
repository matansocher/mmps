import type { EvalReport } from './report';

function escapeHtml(value: unknown): string {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatRunDate(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'full',
    timeStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(value));
}

function optionalPct(value: number | null, checked: number): string {
  return value === null ? 'n/a' : `${pct(value)} (${checked})`;
}

function formatInput(input: string | readonly string[]): string {
  return typeof input === 'string' ? input : input.join(' → ');
}

function metricCard(label: string, value: string, detail: string, tone: 'default' | 'success' | 'danger' = 'default'): string {
  return `
    <article class="metric metric--${tone}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(detail)}</small>
    </article>`;
}

function categoryRows(report: EvalReport): string {
  return report.byCategory
    .map((row) => {
      const width = Math.max(0, Math.min(100, row.routingAccuracy * 100));
      return `
        <tr>
          <td><strong>${escapeHtml(row.category)}</strong></td>
          <td>${row.routingPass} / ${row.total}</td>
          <td>
            <div class="accuracy">
              <div class="accuracy__track" aria-hidden="true">
                <span style="width: ${width.toFixed(1)}%"></span>
              </div>
              <span>${pct(row.routingAccuracy)}</span>
            </div>
          </td>
          <td>${escapeHtml(optionalPct(row.argCorrectness, row.argChecked))}</td>
          <td>${escapeHtml(optionalPct(row.workflowCorrectness, row.workflowChecked))}</td>
        </tr>`;
    })
    .join('');
}

function failureRows(report: EvalReport): string {
  if (report.failures.length === 0) {
    return `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
        <div>
          <strong>No failures</strong>
          <p>Every evaluated case passed its routing and applicable argument checks.</p>
        </div>
      </div>`;
  }

  return report.failures
    .map((failure) => {
      const traces = failure.traces
        .map(
          (trace) => `
              <article class="trace">
                <div class="trace__heading">
                  <strong>Run ${trace.run}</strong>
                  ${trace.error ? `<span class="trace__error">${escapeHtml(trace.error)}</span>` : ''}
                </div>
                <div class="failure-grid">
                  <div>
                    <span class="field-label">Captured calls</span>
                    <pre><code>${escapeHtml(JSON.stringify(trace.calls, null, 2))}</code></pre>
                  </div>
                  <div>
                    <span class="field-label">Assistant response</span>
                    <pre><code>${escapeHtml(trace.response || '(empty response)')}</code></pre>
                  </div>
                </div>
              </article>`,
        )
        .join('');

      return `
        <details>
          <summary>
            <span class="failure-title">
              <span class="status-dot" aria-hidden="true"></span>
              <span>
                <strong>${escapeHtml(failure.id)}</strong>
                <small>${escapeHtml(failure.category)} · ${escapeHtml(failure.reason)}</small>
              </span>
            </span>
            <span class="details-label">Details</span>
          </summary>
          <div class="failure-body">
            <div>
              <span class="field-label">Input</span>
              <p>${escapeHtml(formatInput(failure.input))}</p>
            </div>
            <div>
              <span class="field-label">Expected</span>
              <pre><code>${escapeHtml(JSON.stringify(failure.expected, null, 2))}</code></pre>
            </div>
            ${traces}
          </div>
        </details>`;
    })
    .join('');
}

export function toHtml(report: EvalReport): string {
  const totalRuns = report.totalCases * report.runsPerCase;
  const failureCount = report.failures.length;
  const statusText = failureCount === 0 ? 'All cases passed' : `${failureCount} ${failureCount === 1 ? 'failure' : 'failures'}`;
  const statusTone = failureCount === 0 ? 'success' : 'danger';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark" />
    <title>Chatbot Routing Eval · ${escapeHtml(report.generatedAt)}</title>
    <style>
      :root {
        color-scheme: dark;
        --background: #020617;
        --surface: #0f172a;
        --surface-raised: #111c31;
        --muted: #1e293b;
        --border: #334155;
        --foreground: #f8fafc;
        --secondary: #a8b5c7;
        --accent: #4ade80;
        --accent-soft: rgba(74, 222, 128, 0.12);
        --danger: #fb7185;
        --danger-soft: rgba(251, 113, 133, 0.12);
        --blue: #60a5fa;
        --shadow: 0 18px 50px rgba(0, 0, 0, 0.24);
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-width: 320px;
        background:
          radial-gradient(circle at 15% -10%, rgba(37, 99, 235, 0.2), transparent 32rem),
          radial-gradient(circle at 95% 10%, rgba(34, 197, 94, 0.12), transparent 28rem),
          var(--background);
        color: var(--foreground);
        font-family: "Fira Sans", Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 16px;
        line-height: 1.55;
      }

      main {
        width: min(1160px, calc(100% - 32px));
        margin: 0 auto;
        padding: 48px 0 72px;
      }

      h1,
      h2,
      p {
        margin-top: 0;
      }

      h1 {
        max-width: 760px;
        margin-bottom: 12px;
        font-size: clamp(2.2rem, 7vw, 4.6rem);
        line-height: 1;
        letter-spacing: -0.055em;
      }

      h2 {
        margin-bottom: 18px;
        font-size: clamp(1.35rem, 3vw, 2rem);
        letter-spacing: -0.025em;
      }

      .eyebrow,
      .field-label {
        color: var(--accent);
        font-family: "Fira Code", "SFMono-Regular", Consolas, monospace;
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.09em;
        text-transform: uppercase;
      }

      .hero {
        padding: clamp(24px, 5vw, 48px);
        border: 1px solid var(--border);
        border-radius: 24px;
        background: linear-gradient(145deg, rgba(30, 41, 59, 0.88), rgba(15, 23, 42, 0.88));
        box-shadow: var(--shadow);
      }

      .hero__top,
      .run-meta,
      .section-heading,
      summary {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
      }

      .status {
        flex: 0 0 auto;
        padding: 8px 12px;
        border: 1px solid currentColor;
        border-radius: 999px;
        font-size: 0.82rem;
        font-weight: 700;
      }

      .status--success {
        background: var(--accent-soft);
        color: var(--accent);
      }

      .status--danger {
        background: var(--danger-soft);
        color: var(--danger);
      }

      .subtitle {
        max-width: 720px;
        margin-bottom: 28px;
        color: var(--secondary);
        font-size: 1.08rem;
      }

      .run-meta {
        justify-content: flex-start;
        flex-wrap: wrap;
        margin: 0;
        padding: 18px 0 0;
        border-top: 1px solid var(--border);
      }

      .run-meta div {
        min-width: 150px;
      }

      .run-meta dt {
        color: var(--secondary);
        font-size: 0.76rem;
        font-weight: 700;
        letter-spacing: 0.07em;
        text-transform: uppercase;
      }

      .run-meta dd {
        margin: 4px 0 0;
        font-family: "Fira Code", "SFMono-Regular", Consolas, monospace;
        font-size: 0.9rem;
      }

      section {
        margin-top: 48px;
      }

      .section-heading p {
        margin-bottom: 18px;
        color: var(--secondary);
      }

      .metrics {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 14px;
      }

      .metric {
        min-height: 156px;
        padding: 22px;
        border: 1px solid var(--border);
        border-radius: 16px;
        background: var(--surface);
      }

      .metric span,
      .metric small {
        display: block;
        color: var(--secondary);
      }

      .metric span {
        font-size: 0.82rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .metric strong {
        display: block;
        margin: 10px 0 5px;
        font-family: "Fira Code", "SFMono-Regular", Consolas, monospace;
        font-size: clamp(1.65rem, 4vw, 2.25rem);
        line-height: 1.1;
        letter-spacing: -0.04em;
      }

      .metric--success strong {
        color: var(--accent);
      }

      .metric--danger strong {
        color: var(--danger);
      }

      .panel {
        overflow: hidden;
        border: 1px solid var(--border);
        border-radius: 16px;
        background: var(--surface);
        box-shadow: var(--shadow);
      }

      .table-wrap {
        overflow-x: auto;
      }

      table {
        width: 100%;
        min-width: 620px;
        border-collapse: collapse;
      }

      th,
      td {
        padding: 15px 20px;
        border-bottom: 1px solid var(--border);
        text-align: left;
      }

      th {
        background: var(--surface-raised);
        color: var(--secondary);
        font-size: 0.75rem;
        letter-spacing: 0.07em;
        text-transform: uppercase;
      }

      tbody tr:last-child td {
        border-bottom: 0;
      }

      .accuracy {
        display: grid;
        grid-template-columns: minmax(120px, 1fr) 58px;
        align-items: center;
        gap: 12px;
        font-family: "Fira Code", "SFMono-Regular", Consolas, monospace;
        font-size: 0.86rem;
      }

      .accuracy__track {
        height: 8px;
        overflow: hidden;
        border-radius: 999px;
        background: var(--muted);
      }

      .accuracy__track span {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: var(--accent);
      }

      details {
        border: 1px solid var(--border);
        border-radius: 14px;
        background: var(--surface);
      }

      details + details {
        margin-top: 12px;
      }

      summary {
        min-height: 68px;
        padding: 14px 18px;
        cursor: pointer;
        list-style: none;
      }

      summary::-webkit-details-marker {
        display: none;
      }

      summary:focus-visible {
        outline: 3px solid var(--blue);
        outline-offset: 3px;
      }

      .failure-title {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .failure-title strong,
      .failure-title small {
        display: block;
      }

      .failure-title small,
      .details-label,
      .empty-state p {
        color: var(--secondary);
      }

      .status-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--danger);
        box-shadow: 0 0 0 5px var(--danger-soft);
      }

      .details-label {
        font-size: 0.82rem;
        font-weight: 700;
      }

      .failure-body {
        padding: 4px 18px 20px;
        border-top: 1px solid var(--border);
      }

      .failure-body > div {
        padding-top: 18px;
      }

      .failure-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
      }

      .trace {
        margin-top: 18px;
        padding-top: 18px;
        border-top: 1px solid var(--border);
      }

      .trace__heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 10px;
      }

      .trace__error {
        color: var(--danger);
        font-family: "Fira Code", "SFMono-Regular", Consolas, monospace;
        font-size: 0.78rem;
      }

      pre {
        max-height: 340px;
        margin: 8px 0 0;
        padding: 16px;
        overflow: auto;
        border: 1px solid var(--border);
        border-radius: 10px;
        background: var(--background);
        color: #dbeafe;
        font-family: "Fira Code", "SFMono-Regular", Consolas, monospace;
        font-size: 0.8rem;
        line-height: 1.55;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }

      .empty-state {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 26px;
        border: 1px solid rgba(74, 222, 128, 0.35);
        border-radius: 16px;
        background: var(--accent-soft);
      }

      .empty-state svg {
        width: 38px;
        height: 38px;
        flex: 0 0 auto;
        padding: 8px;
        border-radius: 50%;
        background: var(--accent);
        fill: none;
        stroke: var(--background);
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-width: 2.5;
      }

      .empty-state p {
        margin: 3px 0 0;
      }

      .cost-note {
        margin: 16px 0 0;
        color: var(--secondary);
        font-size: 0.85rem;
      }

      footer {
        margin-top: 44px;
        padding-top: 20px;
        border-top: 1px solid var(--border);
        color: var(--secondary);
        font-size: 0.82rem;
      }

      @media (max-width: 820px) {
        .metrics {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .failure-grid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 560px) {
        main {
          width: min(100% - 20px, 1160px);
          padding-top: 18px;
        }

        .hero {
          border-radius: 18px;
        }

        .hero__top,
        .section-heading {
          align-items: flex-start;
          flex-direction: column;
          gap: 8px;
        }

        .metrics {
          grid-template-columns: 1fr;
        }

        .metric {
          min-height: 0;
        }

        .details-label {
          display: none;
        }
      }

      @media print {
        :root {
          color-scheme: light;
          --background: #ffffff;
          --surface: #ffffff;
          --surface-raised: #f8fafc;
          --muted: #e2e8f0;
          --border: #cbd5e1;
          --foreground: #0f172a;
          --secondary: #475569;
          --accent: #15803d;
          --accent-soft: #f0fdf4;
          --danger: #be123c;
          --danger-soft: #fff1f2;
        }

        body {
          background: #ffffff;
        }

        main {
          width: 100%;
          padding: 0;
        }

        .hero,
        .panel,
        .metric {
          box-shadow: none;
        }

        details {
          break-inside: avoid;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <header class="hero">
        <div class="hero__top">
          <p class="eyebrow">AI evaluation report</p>
          <span class="status status--${statusTone}">${escapeHtml(statusText)}</span>
        </div>
        <h1>Chatbot Routing Eval</h1>
        <p class="subtitle">Production-prompt routing, argument accuracy, tool over-triggering, latency, token usage, and estimated model cost.</p>
        <dl class="run-meta">
          <div>
            <dt>Run date</dt>
            <dd><time datetime="${escapeHtml(report.generatedAt)}">${escapeHtml(formatRunDate(report.generatedAt))} UTC</time></dd>
          </div>
          <div>
            <dt>Model</dt>
            <dd>${escapeHtml(report.model)}</dd>
          </div>
          <div>
            <dt>Cases</dt>
            <dd>${report.totalCases}</dd>
          </div>
          <div>
            <dt>Runs per case</dt>
            <dd>${report.runsPerCase}</dd>
          </div>
          <div>
            <dt>Total runs</dt>
            <dd>${totalRuns}</dd>
          </div>
        </dl>
      </header>

      <section aria-labelledby="summary-heading">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Summary</p>
            <h2 id="summary-heading">Run results</h2>
          </div>
        </div>
        <div class="metrics">
          ${metricCard('Routing accuracy', pct(report.routingAccuracy), `${Math.round(report.routingAccuracy * report.totalCases)} of ${report.totalCases} cases`, report.routingAccuracy === 1 ? 'success' : 'danger')}
          ${metricCard('Argument correctness', pct(report.argCorrectness), `${report.argChecked} argument-checked cases`, report.argCorrectness === 1 ? 'success' : 'danger')}
          ${metricCard('Workflow correctness', pct(report.workflowCorrectness), `${report.workflowChecked} workflow-checked cases`, report.workflowCorrectness === 1 ? 'success' : 'danger')}
          ${metricCard('Over-trigger rate', pct(report.overTriggerRate), `${report.noToolCases} no-tool cases`, report.overTriggerRate === 0 ? 'success' : 'danger')}
          ${metricCard('Estimated cost', `$${report.totalCost.toFixed(4)}`, `$${report.avgCostPerRun.toFixed(5)} average per run`)}
          ${metricCard('Tokens', formatNumber(report.totalTokens), `${formatNumber(Math.round(report.totalTokens / Math.max(totalRuns, 1)))} average per run`)}
          ${metricCard('Latency', `${Math.round(report.avgLatencyMs)} ms`, `${Math.round(report.p95LatencyMs)} ms p95`)}
        </div>
        <p class="cost-note">Cost is estimated from measured token usage and configured model prices. Prompt-cache discounts are intentionally not deducted, so billed cost may be lower.</p>
      </section>

      <section aria-labelledby="category-heading">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Breakdown</p>
            <h2 id="category-heading">Routing by category</h2>
          </div>
          <p>${report.byCategory.length} categories evaluated</p>
        </div>
        <div class="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Category</th>
                <th scope="col">Passed cases</th>
                <th scope="col">Routing accuracy</th>
                <th scope="col">Arguments</th>
                <th scope="col">Workflow</th>
              </tr>
            </thead>
            <tbody>
              ${categoryRows(report)}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="failures-heading">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Diagnostics</p>
            <h2 id="failures-heading">Failures (${failureCount})</h2>
          </div>
          <p>Expected routing compared with captured tool calls</p>
        </div>
        ${failureRows(report)}
      </section>

      <footer>
        Generated by the MMPS chatbot routing evaluation suite at ${escapeHtml(report.generatedAt)}.
      </footer>
    </main>
  </body>
</html>
`;
}
