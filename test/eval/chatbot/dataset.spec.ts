import { describe, expect, it } from 'vitest';
import { agent } from '@features/chatbot/agent';
import { dataset } from './dataset';
import { evaluateRun } from './evaluate';
import type { CapturedCall, EvalCase, RunResult, ToolCallExpectation, ToolExpectation } from './types';

// These specs validate the dataset and scoring logic OFFLINE — no model, no API key, no network.
// They guard the eval set against typos (unknown tool names), missing category coverage, and
// scoring regressions by proving the evaluator PASSES an ideal simulated run for every case.

const registeredToolNames = new Set(agent().tools.map((tool) => tool.name));

function toArray<T>(value: T | readonly T[]): readonly T[] {
  return Array.isArray(value) ? value : [value as T];
}

function expectedToolNames(expectation: ToolExpectation): string[] {
  const names = new Set<string>();
  if (expectation.tool !== null) {
    for (const name of toArray(expectation.tool)) {
      names.add(name);
    }
  }
  for (const step of expectation.sequence ?? []) {
    for (const name of toArray(step.tool)) {
      names.add(name);
    }
  }
  return [...names];
}

function makeRun(calls: CapturedCall[], response = ''): RunResult {
  return { calls, response, tokensIn: 0, tokensOut: 0, tokensTotal: 0, cost: 0, llmCalls: 0, toolCalls: calls.length, durationMs: 0 };
}

// Build the "ideal" captured calls that a perfectly-routing agent would produce for a case,
// so we can assert the scorer accepts them. Uses the sequence when present, else the primary tool.
function idealCalls(evalCase: EvalCase): CapturedCall[] {
  const { expect: expectation } = evalCase;
  if (expectation.tool === null) {
    return [];
  }
  if (expectation.sequence) {
    return expectation.sequence.map((step) => idealCallFor(step));
  }
  const tool = toArray(expectation.tool)[0];
  return [idealCallFor({ tool, action: expectation.action, args: expectation.args })];
}

function idealCallFor(step: ToolCallExpectation): CapturedCall {
  const name = toArray(step.tool)[0];
  const args: Record<string, unknown> = {};
  if (step.action !== undefined) {
    args.action = toArray(step.action)[0];
  }
  for (const [key, matcher] of Object.entries(step.args ?? {})) {
    args[key] = sampleForMatcher(matcher);
  }
  return { name, args };
}

// Produce a value the case's own matcher will accept, so an ideal run scores as correct.
function sampleForMatcher(matcher: ToolCallExpectation['args'] extends undefined ? never : unknown): unknown {
  if (matcher instanceof RegExp) {
    return sampleFromRegExp(matcher);
  }
  if (typeof matcher === 'function') {
    // Predicate matchers are case-specific; the paired sequence/args tests cover them directly.
    return undefined;
  }
  return matcher;
}

function sampleFromRegExp(re: RegExp): string {
  // Hand-crafted samples for the small set of arg patterns actually used in the dataset.
  const samples = ['reminder-agam-1', 'reminder-dentist-1', 'email-shani-1', 'event-union-1', 'from:shani', 'implement', 'review', '2026-12-25', '2026-07-20T09:00:00', '2026-07-20T08:00:00', '2026-07-20T18:00:00', 'Union', 'Real Madrid'];
  const match = samples.find((sample) => re.test(sample));
  return match ?? 'sample';
}

describe('chatbot eval dataset', () => {
  it('has a healthy total size (30-80 cases)', () => {
    expect(dataset.length).toBeGreaterThanOrEqual(30);
    expect(dataset.length).toBeLessThanOrEqual(80);
  });

  it('uses only unique case ids', () => {
    const ids = dataset.map((evalCase) => evalCase.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('explicitly covers single-domain, cross-domain, and ambiguous categories', () => {
    const categories = new Set(dataset.map((evalCase) => evalCase.category));
    expect(categories.has('cross-domain')).toBe(true);
    expect(categories.has('ambiguous')).toBe(true);
    // "single-domain" is any category that isn't cross-domain / ambiguous / a no-tool guard.
    const singleDomain = dataset.filter((evalCase) => !['cross-domain', 'ambiguous', 'no-tool'].includes(evalCase.category));
    expect(singleDomain.length).toBeGreaterThanOrEqual(20);
  });

  it('references only registered tool names', () => {
    for (const evalCase of dataset) {
      for (const name of expectedToolNames(evalCase.expect)) {
        expect(registeredToolNames, `case ${evalCase.id} references unknown tool "${name}"`).toContain(name);
      }
    }
  });

  it('tags every case with a category and non-empty input', () => {
    for (const evalCase of dataset) {
      expect(evalCase.category, `case ${evalCase.id} missing category`).toBeTruthy();
      const inputs = Array.isArray(evalCase.input) ? evalCase.input : [evalCase.input];
      expect(inputs.length, `case ${evalCase.id} has empty input`).toBeGreaterThan(0);
      expect(inputs.every((input) => input.trim().length > 0)).toBe(true);
    }
  });

  it('provides fixtures for every tool referenced in a multi-step sequence', () => {
    for (const evalCase of dataset) {
      const sequence = evalCase.expect.sequence;
      if (!sequence || sequence.length < 2) {
        continue;
      }
      // Every step except the final one returns data a later step depends on, so it needs a fixture
      // (a realistic response) unless the scorer only checks the tool name for that step.
      const stepsNeedingData = sequence.slice(0, -1).filter((step) => step.args !== undefined);
      for (const step of stepsNeedingData) {
        for (const name of toArray(step.tool)) {
          expect(evalCase.fixtures?.[name], `case ${evalCase.id} step "${name}" needs a fixture to resolve dependent args`).toBeDefined();
        }
      }
    }
  });

  it('scores an ideal simulated run as fully correct for every case', () => {
    for (const evalCase of dataset) {
      // Response matchers require live model text; skip response-gated cases here (they are
      // exercised end-to-end by the token-costing eval). Everything else must score clean.
      if (evalCase.expect.response !== undefined) {
        continue;
      }
      const verdict = evaluateRun(evalCase.expect, makeRun(idealCalls(evalCase)));
      expect(verdict.routingCorrect, `routing failed for ${evalCase.id}`).toBe(true);
      if (verdict.argApplicable) {
        expect(verdict.argCorrect, `args failed for ${evalCase.id}`).toBe(true);
      }
      if (verdict.workflowApplicable) {
        expect(verdict.workflowCorrect, `workflow failed for ${evalCase.id}`).toBe(true);
      }
      expect(verdict.overTriggered).toBe(false);
    }
  });

  it('flags a wrong-tool run as a routing miss for a representative case', () => {
    const weatherCase = dataset.find((evalCase) => evalCase.id === 'weather-current-01');
    expect(weatherCase).toBeDefined();
    const verdict = evaluateRun(weatherCase!.expect, makeRun([{ name: 'calendar', args: { action: 'list' } }]));
    expect(verdict.routingCorrect).toBe(false);
  });

  it('flags an over-triggered ambiguous case', () => {
    const ambiguous = dataset.find((evalCase) => evalCase.category === 'ambiguous');
    expect(ambiguous).toBeDefined();
    const verdict = evaluateRun(ambiguous!.expect, makeRun([{ name: 'smart_reminders', args: { action: 'create' } }]));
    expect(verdict.overTriggered).toBe(true);
    expect(verdict.routingCorrect).toBe(false);
  });
});
