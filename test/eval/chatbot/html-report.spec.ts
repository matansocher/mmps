import { describe, expect, it } from 'vitest';
import { toHtml } from './html-report';
import type { EvalReport } from './report';

const report: EvalReport = {
  generatedAt: '2026-07-15T09:59:43.580Z',
  runsPerCase: 3,
  model: 'gpt-4.1-mini',
  totalCases: 2,
  routingAccuracy: 0.5,
  argChecked: 1,
  argCorrectness: 0,
  workflowChecked: 1,
  workflowCorrectness: 0,
  noToolCases: 1,
  overTriggerRate: 0,
  totalCost: 1.2345,
  avgCostPerRun: 0.20575,
  totalTokens: 123456,
  avgLatencyMs: 840,
  p95LatencyMs: 1210,
  byCategory: [
    {
      category: 'calendar',
      total: 2,
      routingPass: 1,
      routingAccuracy: 0.5,
      argChecked: 1,
      argPass: 0,
      argCorrectness: 0,
      workflowChecked: 1,
      workflowPass: 0,
      workflowCorrectness: 0,
    },
  ],
  failures: [
    {
      id: 'calendar-<unsafe>',
      category: 'calendar',
      input: '<script>alert("unsafe")</script>',
      expected: { tool: 'calendar' },
      reason: 'wrong/no tool',
      traces: [
        {
          run: 1,
          calls: [],
          response: 'I need confirmation.',
        },
      ],
    },
  ],
};

describe('toHtml()', () => {
  it('should render run metadata, results, and costs', () => {
    const html = toHtml(report);

    expect(html).toContain('Wednesday, July 15, 2026');
    expect(html).toContain('gpt-4.1-mini');
    expect(html).toContain('$1.2345');
    expect(html).toContain('123,456');
    expect(html).toContain('50.0%');
    expect(html).toContain('Workflow correctness');
    expect(html).toContain('Failures (1)');
    expect(html).toContain('I need confirmation.');
  });

  it('should escape case data before writing it into the document', () => {
    const html = toHtml(report);

    expect(html).toContain('&lt;script&gt;alert(&quot;unsafe&quot;)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert("unsafe")</script>');
  });

  it('should render the passing empty state when there are no failures', () => {
    const html = toHtml({ ...report, routingAccuracy: 1, argCorrectness: 1, workflowCorrectness: 1, failures: [] });

    expect(html).toContain('All cases passed');
    expect(html).toContain('No failures');
  });
});
