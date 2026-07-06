import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CaseResult } from './types';

const RESULTS_DIR = join(process.cwd(), 'test', 'eval', 'results');

export type CategoryMetric = {
  readonly category: string;
  readonly total: number;
  readonly routingPass: number;
  readonly routingAccuracy: number; // 0..1
};

export type EvalReport = {
  readonly generatedAt: string;
  readonly runsPerCase: number;
  readonly model: string;
  readonly totalCases: number;
  readonly routingAccuracy: number; // overall, 0..1
  readonly argChecked: number;
  readonly argCorrectness: number; // 0..1 over arg-applicable cases
  readonly noToolCases: number;
  readonly overTriggerRate: number; // 0..1 over no-tool cases
  readonly totalCost: number; // USD across every run
  readonly avgCostPerRun: number;
  readonly totalTokens: number;
  readonly avgLatencyMs: number;
  readonly p95LatencyMs: number;
  readonly byCategory: CategoryMetric[];
  readonly failures: {
    readonly id: string;
    readonly category: string;
    readonly input: string;
    readonly expected: unknown;
    readonly reason: string;
    readonly sampleCalls: unknown;
  }[];
};

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) {
    return 0;
  }
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

export function buildReport(results: CaseResult[], runsPerCase: number, model: string): EvalReport {
  const totalCases = results.length;
  const routingPassCount = results.filter((result) => result.routingPass).length;

  const argApplicable = results.filter((result) => result.argApplicable);
  const argPassCount = argApplicable.filter((result) => result.argPass).length;

  const noToolCases = results.filter((result) => result.case.expect.tool === null);
  const overTriggerCount = noToolCases.filter((result) => result.overTriggered).length;

  const allRuns = results.flatMap((result) => result.runs);
  const totalCost = allRuns.reduce((sum, run) => sum + run.cost, 0);
  const totalTokens = allRuns.reduce((sum, run) => sum + run.tokensTotal, 0);
  const latencies = allRuns.map((run) => run.durationMs).sort((a, b) => a - b);
  const avgLatencyMs = latencies.length ? latencies.reduce((sum, value) => sum + value, 0) / latencies.length : 0;

  const categories = [...new Set(results.map((result) => result.case.category))].sort();
  const byCategory: CategoryMetric[] = categories.map((category) => {
    const inCategory = results.filter((result) => result.case.category === category);
    const passed = inCategory.filter((result) => result.routingPass).length;
    return { category, total: inCategory.length, routingPass: passed, routingAccuracy: passed / inCategory.length };
  });

  const failures = results
    .filter((result) => !result.routingPass || (result.argApplicable && !result.argPass) || result.overTriggered)
    .map((result) => {
      const reason = !result.routingPass ? 'wrong/no tool' : result.overTriggered ? 'over-triggered (expected no tool)' : 'wrong arguments';
      return {
        id: result.case.id,
        category: result.case.category,
        input: result.case.input,
        expected: result.case.expect,
        reason,
        sampleCalls: result.runs[0]?.calls ?? [],
      };
    });

  return {
    generatedAt: new Date().toISOString(),
    runsPerCase,
    model,
    totalCases,
    routingAccuracy: routingPassCount / totalCases,
    argChecked: argApplicable.length,
    argCorrectness: argApplicable.length ? argPassCount / argApplicable.length : 1,
    noToolCases: noToolCases.length,
    overTriggerRate: noToolCases.length ? overTriggerCount / noToolCases.length : 0,
    totalCost,
    avgCostPerRun: allRuns.length ? totalCost / allRuns.length : 0,
    totalTokens,
    avgLatencyMs,
    p95LatencyMs: percentile(latencies, 95),
    byCategory,
    failures,
  };
}

export function printReport(report: EvalReport): void {
  /* eslint-disable no-console */
  console.log('\n===== Chatbot Routing Eval =====');
  console.log(`model=${report.model}  cases=${report.totalCases}  runs/case=${report.runsPerCase}`);
  console.log('--------------------------------');
  console.log(`Routing accuracy   : ${pct(report.routingAccuracy)}`);
  console.log(`Argument correctness: ${pct(report.argCorrectness)} (over ${report.argChecked} arg-checked cases)`);
  console.log(`Over-trigger rate  : ${pct(report.overTriggerRate)} (over ${report.noToolCases} no-tool cases)`);
  console.log(`Cost (total)       : $${report.totalCost.toFixed(4)}  ($${report.avgCostPerRun.toFixed(5)}/run)`);
  console.log(`Tokens (total)     : ${report.totalTokens}`);
  console.log(`Latency avg / p95  : ${Math.round(report.avgLatencyMs)}ms / ${Math.round(report.p95LatencyMs)}ms`);
  console.log('--- By category ---');
  console.table(report.byCategory.map((row) => ({ category: row.category, cases: row.total, routing: pct(row.routingAccuracy) })));
  if (report.failures.length) {
    console.log(`--- Failures (${report.failures.length}) ---`);
    for (const failure of report.failures) {
      console.log(`✗ [${failure.category}] ${failure.id}: "${failure.input}" — ${failure.reason}; got ${JSON.stringify(failure.sampleCalls)}`);
    }
  }
  console.log('================================\n');
  /* eslint-enable no-console */
}

function toMarkdown(report: EvalReport): string {
  const lines: string[] = [];
  lines.push(`# Chatbot Routing Eval`);
  lines.push('');
  lines.push(`- Generated: ${report.generatedAt}`);
  lines.push(`- Model: \`${report.model}\``);
  lines.push(`- Cases: ${report.totalCases} · Runs per case: ${report.runsPerCase}`);
  lines.push('');
  lines.push(`## Summary`);
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`| --- | --- |`);
  lines.push(`| Routing accuracy | ${pct(report.routingAccuracy)} |`);
  lines.push(`| Argument correctness | ${pct(report.argCorrectness)} (${report.argChecked} cases) |`);
  lines.push(`| Over-trigger rate | ${pct(report.overTriggerRate)} (${report.noToolCases} no-tool cases) |`);
  lines.push(`| Total cost | $${report.totalCost.toFixed(4)} |`);
  lines.push(`| Avg cost / run | $${report.avgCostPerRun.toFixed(5)} |`);
  lines.push(`| Total tokens | ${report.totalTokens} |`);
  lines.push(`| Latency avg / p95 | ${Math.round(report.avgLatencyMs)}ms / ${Math.round(report.p95LatencyMs)}ms |`);
  lines.push('');
  lines.push(`## By category`);
  lines.push('');
  lines.push(`| Category | Cases | Routing accuracy |`);
  lines.push(`| --- | --- | --- |`);
  for (const row of report.byCategory) {
    lines.push(`| ${row.category} | ${row.total} | ${pct(row.routingAccuracy)} |`);
  }
  lines.push('');
  lines.push(`## Failures (${report.failures.length})`);
  lines.push('');
  if (report.failures.length === 0) {
    lines.push('None 🎉');
  } else {
    lines.push(`| Category | ID | Input | Reason | Got |`);
    lines.push(`| --- | --- | --- | --- | --- |`);
    for (const failure of report.failures) {
      const got = JSON.stringify(failure.sampleCalls).replace(/\|/g, '\\|');
      lines.push(`| ${failure.category} | ${failure.id} | ${failure.input.replace(/\|/g, '\\|')} | ${failure.reason} | ${got} |`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

// Write JSON + Markdown reports to test/eval/results/ (gitignored).
export function writeReports(report: EvalReport): { jsonPath: string; markdownPath: string } {
  mkdirSync(RESULTS_DIR, { recursive: true });
  const jsonPath = join(RESULTS_DIR, 'chatbot-routing.latest.json');
  const markdownPath = join(RESULTS_DIR, 'chatbot-routing.latest.md');
  writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');
  writeFileSync(markdownPath, toMarkdown(report), 'utf8');
  return { jsonPath, markdownPath };
}
