// Shared types for the chatbot routing eval harness.

// A matcher for a single captured tool argument. RegExp is tested against String(value);
// a function receives the raw value; anything else is compared by String() equality.
export type ArgMatcher = RegExp | string | number | boolean | ((value: unknown) => boolean);

export type ToolExpectation = {
  // Expected tool name(s). `null` means the message should NOT trigger any tool.
  readonly tool: string | readonly string[] | null;
  // Expected `action` argument value(s), when the tool exposes an action enum.
  readonly action?: string | readonly string[];
  // Critical argument matchers, checked only where they matter (dates, labels, ...).
  readonly args?: Readonly<Record<string, ArgMatcher>>;
};

export type EvalCase = {
  readonly id: string;
  readonly category: string; // tool/domain tag for per-category reporting
  readonly input: string; // the user message (single-turn, self-contained)
  readonly expect: ToolExpectation;
  readonly note?: string;
};

export type CapturedCall = {
  readonly name: string;
  readonly args: Record<string, unknown>;
};

export type RunResult = {
  readonly calls: CapturedCall[];
  readonly tokensIn: number;
  readonly tokensOut: number;
  readonly tokensTotal: number;
  readonly cost: number;
  readonly llmCalls: number;
  readonly toolCalls: number;
  readonly durationMs: number;
  readonly error?: string;
};

// Per-run evaluation of expectation vs. captured calls.
export type RunVerdict = {
  readonly routingCorrect: boolean;
  readonly argApplicable: boolean; // whether this case checks action/args at all
  readonly argCorrect: boolean;
  readonly overTriggered: boolean; // for no-tool cases: did it wrongly call a tool
};

// Aggregated result for a case across N runs.
export type CaseResult = {
  readonly case: EvalCase;
  readonly runs: RunResult[];
  readonly verdicts: RunVerdict[];
  readonly routingPass: boolean; // majority of runs routed correctly
  readonly argApplicable: boolean;
  readonly argPass: boolean; // majority of runs had correct args (among applicable)
  readonly overTriggered: boolean; // majority of runs wrongly triggered (no-tool cases)
};
