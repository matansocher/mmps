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

export type GitHubServiceResponse<T> = {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
};
