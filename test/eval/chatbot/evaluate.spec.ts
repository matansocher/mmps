import { describe, expect, it } from 'vitest';
import { aggregateCase, evaluateRun } from './evaluate';
import type { EvalCase, RunResult, ToolExpectation } from './types';

function run(calls: RunResult['calls'], response = ''): RunResult {
  return {
    calls,
    response,
    tokensIn: 0,
    tokensOut: 0,
    tokensTotal: 0,
    cost: 0,
    llmCalls: 0,
    toolCalls: calls.length,
    durationMs: 0,
  };
}

describe('evaluateRun()', () => {
  it('should require ordered workflow calls with matching arguments', () => {
    const expectation: ToolExpectation = {
      tool: 'smart_reminders',
      sequence: [
        { tool: 'smart_reminders', action: 'list' },
        { tool: 'smart_reminders', action: 'snooze', args: { reminderId: 'dentist-1', snoozeMinutes: 120 } },
      ],
    };

    expect(
      evaluateRun(
        expectation,
        run([
          { name: 'smart_reminders', args: { action: 'list' } },
          { name: 'smart_reminders', args: { action: 'snooze', reminderId: 'dentist-1', snoozeMinutes: 120 } },
        ]),
      ),
    ).toMatchObject({ routingCorrect: true, argCorrect: true, workflowCorrect: true });

    expect(evaluateRun(expectation, run([{ name: 'smart_reminders', args: { action: 'list' } }]))).toMatchObject({
      routingCorrect: true,
      argCorrect: false,
      workflowCorrect: false,
    });
  });

  it('should evaluate confirmation responses without allowing tool calls', () => {
    const expectation: ToolExpectation = { tool: null, response: /(subject|confirm)/i };

    expect(evaluateRun(expectation, run([], 'What subject should I use before I send it?'))).toMatchObject({
      routingCorrect: true,
      workflowCorrect: true,
      overTriggered: false,
    });
    expect(evaluateRun(expectation, run([{ name: 'gmail', args: { action: 'send' } }], 'Sent'))).toMatchObject({
      routingCorrect: false,
      workflowCorrect: false,
      overTriggered: true,
    });
  });

  it('should reject contradictory no-tool sequence expectations', () => {
    expect(() =>
      evaluateRun(
        {
          tool: null,
          sequence: [{ tool: 'gmail', action: 'list' }],
        },
        run([]),
      ),
    ).toThrow('No-tool expectations cannot define a tool-call sequence');
  });

  it('should reject sequences that omit the primary expected tool', () => {
    expect(() =>
      evaluateRun(
        {
          tool: 'gmail',
          sequence: [{ tool: 'calendar', action: 'list' }],
        },
        run([]),
      ),
    ).toThrow('The primary expected tool must appear in the tool-call sequence');
  });
});

describe('aggregateCase()', () => {
  it('should use majority vote for workflow completion', () => {
    const evalCase: EvalCase = {
      id: 'workflow',
      category: 'test',
      input: 'test',
      expect: {
        tool: 'calendar',
        sequence: [
          { tool: 'calendar', action: 'list' },
          { tool: 'calendar', action: 'delete' },
        ],
      },
    };
    const passingRun = run([
      { name: 'calendar', args: { action: 'list' } },
      { name: 'calendar', args: { action: 'delete', eventId: 'event-1' } },
    ]);

    expect(aggregateCase(evalCase, [passingRun, passingRun, run([{ name: 'calendar', args: { action: 'list' } }])])).toMatchObject({
      routingPass: true,
      argPass: true,
      workflowPass: true,
    });
  });
});
