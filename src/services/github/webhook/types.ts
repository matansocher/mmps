import type { Request } from 'express';

export type WorkflowRunPullRequest = {
  readonly number: number;
  readonly head: {
    readonly ref: string;
  };
};

export type WorkflowRun = {
  readonly name: string;
  readonly conclusion: string | null;
  readonly event: string;
  readonly html_url: string;
  readonly head_branch: string;
  readonly pull_requests: readonly WorkflowRunPullRequest[];
};

export type WorkflowRunEvent = {
  readonly action: string;
  readonly workflow_run: WorkflowRun;
};

export type RequestWithRawBody = Request & {
  readonly rawBody?: Buffer;
};
