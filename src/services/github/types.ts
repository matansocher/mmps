export type Issue = {
  readonly id: number;
  readonly number: number;
  readonly title: string;
  readonly body: string | null;
  readonly state: 'open' | 'closed';
  readonly labels: readonly string[];
  readonly assignees: readonly { readonly login: string }[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly url: string;
};

export type PullRequest = {
  readonly id: number;
  readonly number: number;
  readonly title: string;
  readonly body: string | null;
  readonly state: 'open' | 'closed' | 'merged';
  readonly labels: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly url: string;
};

export type IssueComment = {
  readonly id: number;
  readonly body: string;
  readonly createdAt: string;
  readonly url: string;
};

export type CreateIssueInput = {
  readonly title: string;
  readonly body?: string;
  readonly labels?: readonly string[];
  readonly assignees?: readonly string[];
};

export type UpdateIssueInput = {
  readonly title?: string;
  readonly body?: string;
  readonly state?: 'open' | 'closed';
  readonly labels?: readonly string[];
  readonly assignees?: readonly string[];
};

export type PullRequestFile = {
  readonly filename: string;
  readonly status: string;
  readonly additions: number;
  readonly deletions: number;
  readonly changes: number;
};

export type PullRequestReview = {
  readonly id: number;
  readonly user: string | null;
  readonly state: string;
  readonly body: string;
  readonly submittedAt: string | null;
  readonly url: string;
};

export type PullRequestCheck = {
  readonly name: string;
  readonly status: string;
  readonly conclusion: string | null;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly url: string | null;
};

export type GitHubServiceResponse<T> = {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
};
