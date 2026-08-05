import { env } from 'node:process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CHAT_COMPLETIONS_MINI_MODEL } from '@services/openai/constants';
import { dataset } from './dataset';
import { aggregateCase } from './evaluate';
import { runOnce, runPool } from './harness';
import { buildReport, type EvalReport, printReport, writeReports } from './report';
import type { CaseResult, RunResult } from './types';

const RUNS_PER_CASE = parseInt(env.EVAL_RUNS || '3', 10);
const CONCURRENCY = parseInt(env.EVAL_CONCURRENCY || '4', 10);
const LIMIT = env.EVAL_LIMIT ? parseInt(env.EVAL_LIMIT, 10) : dataset.length;
const cases = dataset.slice(0, LIMIT);
const HAS_KEY = !!env.OPENAI_API_KEY;

if (!HAS_KEY) {
  // eslint-disable-next-line no-console
  console.warn('\n⚠️  OPENAI_API_KEY is not set — skipping the chatbot routing eval (it needs the real model).\n');
}

// Real model calls are slow, especially for multi-step cases. Give the batch plenty of room.
const BATCH_TIMEOUT_MS = 45 * 60 * 1000;

describe.skipIf(!HAS_KEY)('chatbot system-prompt routing eval', () => {
  const caseResults = new Map<string, CaseResult>();
  let report: EvalReport;

  beforeAll(async () => {
    type Job = { caseId: string; evalCase: (typeof cases)[number] };
    const jobs: Job[] = cases.flatMap((evalCase) => Array.from({ length: RUNS_PER_CASE }, () => ({ caseId: evalCase.id, evalCase })));

    const runResults = await runPool(jobs, CONCURRENCY, (job) => runOnce(job.evalCase));

    const runsByCase = new Map<string, RunResult[]>();
    jobs.forEach((job, index) => {
      const list = runsByCase.get(job.caseId) ?? [];
      list.push(runResults[index]);
      runsByCase.set(job.caseId, list);
    });

    for (const evalCase of cases) {
      const runs = runsByCase.get(evalCase.id) ?? [];
      caseResults.set(evalCase.id, aggregateCase(evalCase, runs));
    }

    report = buildReport([...caseResults.values()], RUNS_PER_CASE, CHAT_COMPLETIONS_MINI_MODEL);
    printReport(report);
    const { jsonPath, markdownPath, htmlPath } = writeReports(report);
    // eslint-disable-next-line no-console
    console.log(`Reports written:\n  ${jsonPath}\n  ${markdownPath}\n  ${htmlPath}`);
  }, BATCH_TIMEOUT_MS);

  afterAll(() => {
    if (report) {
      // eslint-disable-next-line no-console
      console.log(`\nOverall routing accuracy: ${(report.routingAccuracy * 100).toFixed(1)}% · total cost $${report.totalCost.toFixed(4)}`);
    }
  });

  for (const evalCase of cases) {
    const input = Array.isArray(evalCase.input) ? evalCase.input.join(' → ') : evalCase.input;
    it(`[${evalCase.category}] ${evalCase.id} — "${input}"`, () => {
      const result = caseResults.get(evalCase.id);
      expect(result, 'case result missing').toBeDefined();

      const calls = JSON.stringify(result!.runs.map((run) => run.calls));
      expect(result!.routingPass, `expected ${JSON.stringify(evalCase.expect)} but got calls across runs: ${calls}`).toBe(true);

      if (result!.argApplicable) {
        expect(result!.argPass, `wrong arguments for ${JSON.stringify(evalCase.expect)}; got: ${calls}`).toBe(true);
      }
      if (result!.workflowApplicable) {
        expect(result!.workflowPass, `incomplete workflow for ${JSON.stringify(evalCase.expect)}; got: ${calls}`).toBe(true);
      }
    });
  }
});
