import { describe, expect, it } from 'vitest';
import { buildReport } from './report';
import type { CaseResult } from './types';

const result: CaseResult = {
  case: {
    id: 'calendar-delete',
    category: 'calendar',
    input: 'delete the event',
    expect: {
      tool: 'calendar',
      sequence: [
        { tool: 'calendar', action: 'list' },
        { tool: 'calendar', action: 'delete' },
      ],
    },
  },
  runs: [
    {
      calls: [{ name: 'calendar', args: { action: 'list' } }],
      response: 'I found the event but did not delete it.',
      tokensIn: 100,
      tokensOut: 20,
      tokensTotal: 120,
      cost: 0.001,
      llmCalls: 2,
      toolCalls: 1,
      durationMs: 500,
    },
  ],
  verdicts: [
    {
      routingCorrect: false,
      argApplicable: true,
      argCorrect: false,
      workflowApplicable: true,
      workflowCorrect: false,
      overTriggered: false,
    },
  ],
  routingPass: false,
  argApplicable: true,
  argPass: false,
  workflowApplicable: true,
  workflowPass: false,
  overTriggered: false,
};

describe('buildReport()', () => {
  it('should include workflow metrics and every failure trace', () => {
    const report = buildReport([result], 1, 'gpt-4.1-mini');

    expect(report.workflowChecked).toEqual(1);
    expect(report.workflowCorrectness).toEqual(0);
    expect(report.byCategory[0]).toMatchObject({
      routingAccuracy: 0,
      argChecked: 1,
      argCorrectness: 0,
      workflowChecked: 1,
      workflowCorrectness: 0,
    });
    expect(report.failures[0].traces).toEqual([
      {
        run: 1,
        calls: [{ name: 'calendar', args: { action: 'list' } }],
        response: 'I found the event but did not delete it.',
        error: undefined,
      },
    ]);
  });
});
