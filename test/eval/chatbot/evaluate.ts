import type { ArgMatcher, CapturedCall, CaseResult, EvalCase, RunResult, RunVerdict, ToolExpectation } from './types';

function toArray<T>(value: T | readonly T[]): readonly T[] {
  return Array.isArray(value) ? value : [value as T];
}

function matchArg(matcher: ArgMatcher, value: unknown): boolean {
  if (matcher instanceof RegExp) {
    return value !== undefined && value !== null && matcher.test(String(value));
  }
  if (typeof matcher === 'function') {
    return matcher(value);
  }
  return String(value) === String(matcher);
}

function callMatchesAction(expectation: ToolExpectation, call: CapturedCall): boolean {
  if (expectation.action === undefined) {
    return true;
  }
  const wanted = toArray(expectation.action);
  return wanted.includes(String(call.args.action));
}

function callMatchesArgs(expectation: ToolExpectation, call: CapturedCall): boolean {
  if (!expectation.args) {
    return true;
  }
  return Object.entries(expectation.args).every(([key, matcher]) => matchArg(matcher, call.args[key]));
}

// Evaluate a single run's captured tool calls against a case's expectation.
export function evaluateRun(expectation: ToolExpectation, calls: CapturedCall[]): RunVerdict {
  // No-tool case: correct iff nothing was called.
  if (expectation.tool === null) {
    const triggered = calls.length > 0;
    return { routingCorrect: !triggered, argApplicable: false, argCorrect: true, overTriggered: triggered };
  }

  const argApplicable = expectation.action !== undefined || expectation.args !== undefined;
  const wantedTools = toArray(expectation.tool);
  const toolMatches = calls.filter((call) => wantedTools.includes(call.name));
  const routingCorrect = toolMatches.length > 0;

  let argCorrect = false;
  if (routingCorrect) {
    argCorrect = argApplicable ? toolMatches.some((call) => callMatchesAction(expectation, call) && callMatchesArgs(expectation, call)) : true;
  }

  return { routingCorrect, argApplicable, argCorrect, overTriggered: false };
}

function majority(flags: boolean[]): boolean {
  if (flags.length === 0) {
    return false;
  }
  const trueCount = flags.filter(Boolean).length;
  return trueCount * 2 > flags.length;
}

// Aggregate N runs of one case into a majority-vote CaseResult.
export function aggregateCase(evalCase: EvalCase, runs: RunResult[]): CaseResult {
  const verdicts = runs.map((run) => evaluateRun(evalCase.expect, run.calls));
  const argApplicable = verdicts.some((verdict) => verdict.argApplicable);

  const routingPass = majority(verdicts.map((verdict) => verdict.routingCorrect));
  // Argument correctness only counts on runs where routing succeeded and args are applicable.
  const applicableArgFlags = verdicts.filter((verdict) => verdict.argApplicable && verdict.routingCorrect).map((verdict) => verdict.argCorrect);
  const argPass = argApplicable ? majority(applicableArgFlags) : true;
  const overTriggered = evalCase.expect.tool === null ? majority(verdicts.map((verdict) => verdict.overTriggered)) : false;

  return { case: evalCase, runs, verdicts, routingPass, argApplicable, argPass, overTriggered };
}
