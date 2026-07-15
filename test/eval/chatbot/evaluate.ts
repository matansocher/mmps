import type { ArgMatcher, CapturedCall, CaseResult, EvalCase, RunResult, RunVerdict, TextMatcher, ToolCallExpectation, ToolExpectation } from './types';

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

function callMatchesAction(expectation: ToolCallExpectation, call: CapturedCall): boolean {
  if (expectation.action === undefined) {
    return true;
  }
  const wanted = toArray(expectation.action);
  return wanted.includes(String(call.args.action));
}

function callMatchesArgs(expectation: ToolCallExpectation, call: CapturedCall): boolean {
  if (!expectation.args) {
    return true;
  }
  return Object.entries(expectation.args).every(([key, matcher]) => matchArg(matcher, call.args[key]));
}

function callMatchesTool(expectation: ToolCallExpectation, call: CapturedCall): boolean {
  return toArray(expectation.tool).includes(call.name);
}

function callMatches(expectation: ToolCallExpectation, call: CapturedCall, checkDetails: boolean): boolean {
  return callMatchesTool(expectation, call) && (!checkDetails || (callMatchesAction(expectation, call) && callMatchesArgs(expectation, call)));
}

function sequenceMatches(sequence: readonly ToolCallExpectation[], calls: CapturedCall[], checkDetails: boolean): boolean {
  let callIndex = 0;
  for (const expectation of sequence) {
    const matchedIndex = calls.findIndex((call, index) => index >= callIndex && callMatches(expectation, call, checkDetails));
    if (matchedIndex === -1) {
      return false;
    }
    callIndex = matchedIndex + 1;
  }
  return true;
}

function textMatches(matcher: TextMatcher, value: string): boolean {
  if (matcher instanceof RegExp) {
    return matcher.test(value);
  }
  if (typeof matcher === 'function') {
    return matcher(value);
  }
  return value.includes(matcher);
}

// Evaluate a single run's captured tool calls and final response against a case's expectation.
export function evaluateRun(expectation: ToolExpectation, run: RunResult): RunVerdict {
  const { calls, response } = run;
  const workflowApplicable = expectation.sequence !== undefined || expectation.response !== undefined;
  const primaryTools = expectation.tool === null ? [] : toArray(expectation.tool);

  if (expectation.tool === null && expectation.sequence) {
    throw new Error('No-tool expectations cannot define a tool-call sequence');
  }
  if (expectation.sequence && !expectation.sequence.some((step) => toArray(step.tool).some((toolName) => primaryTools.includes(toolName)))) {
    throw new Error('The primary expected tool must appear in the tool-call sequence');
  }

  // No-tool case: correct iff nothing was called.
  if (expectation.tool === null) {
    const triggered = calls.length > 0;
    const routingCorrect = !triggered;
    const workflowCorrect = routingCorrect && (expectation.response === undefined || textMatches(expectation.response, response));
    return { routingCorrect, argApplicable: false, argCorrect: true, workflowApplicable, workflowCorrect, overTriggered: triggered };
  }

  const singleExpectation: ToolCallExpectation = expectation;
  const sequence = expectation.sequence;
  const argApplicable = expectation.action !== undefined || expectation.args !== undefined || !!sequence?.some((step) => step.action !== undefined || step.args !== undefined);
  const toolMatches = calls.filter((call) => callMatchesTool(singleExpectation, call));
  const routingCorrect = toolMatches.length > 0;

  let argCorrect = false;
  if (routingCorrect) {
    argCorrect = argApplicable ? (sequence ? sequenceMatches(sequence, calls, true) : toolMatches.some((call) => callMatches(singleExpectation, call, true))) : true;
  }

  const responseCorrect = expectation.response === undefined || textMatches(expectation.response, response);
  const workflowCorrect = routingCorrect && argCorrect && responseCorrect;

  return { routingCorrect, argApplicable, argCorrect, workflowApplicable, workflowCorrect, overTriggered: false };
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
  const verdicts = runs.map((run) => evaluateRun(evalCase.expect, run));
  const argApplicable = verdicts.some((verdict) => verdict.argApplicable);
  const workflowApplicable = verdicts.some((verdict) => verdict.workflowApplicable);

  const routingPass = majority(verdicts.map((verdict) => verdict.routingCorrect));
  // Argument correctness only counts on runs where routing succeeded and args are applicable.
  const applicableArgFlags = verdicts.filter((verdict) => verdict.argApplicable && verdict.routingCorrect).map((verdict) => verdict.argCorrect);
  const argPass = argApplicable ? majority(applicableArgFlags) : true;
  const workflowPass = workflowApplicable ? majority(verdicts.map((verdict) => verdict.workflowCorrect)) : true;
  const overTriggered = evalCase.expect.tool === null ? majority(verdicts.map((verdict) => verdict.overTriggered)) : false;

  return { case: evalCase, runs, verdicts, routingPass, argApplicable, argPass, workflowApplicable, workflowPass, overTriggered };
}
