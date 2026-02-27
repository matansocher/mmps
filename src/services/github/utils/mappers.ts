import { Octokit } from '@octokit/rest';
import type { Issue, IssueComment, PullRequest } from '../types';

type GitHubIssueResponse = Awaited<ReturnType<Octokit['issues']['get']>>['data'];
type GitHubPullRequestResponse = Awaited<ReturnType<Octokit['pulls']['list']>>['data'][0];
type GitHubCommentResponse = Awaited<ReturnType<Octokit['issues']['createComment']>>['data'];
type LabelResponse = GitHubIssueResponse['labels'][0];

export function mapIssue(githubIssue: GitHubIssueResponse): Issue {
  return {
    id: githubIssue.id,
    number: githubIssue.number,
    title: githubIssue.title,
    body: githubIssue.body,
    state: githubIssue.state as 'open' | 'closed',
    labels: githubIssue.labels.map((l: LabelResponse) => (typeof l === 'string' ? l : l.name)),
    assignees: githubIssue.assignees || [],
    createdAt: githubIssue.created_at,
    updatedAt: githubIssue.updated_at,
    url: githubIssue.html_url,
  };
}

export function mapPullRequest(githubPr: GitHubPullRequestResponse): PullRequest {
  return {
    id: githubPr.id,
    number: githubPr.number,
    title: githubPr.title,
    body: githubPr.body,
    state: githubPr.state === 'closed' && githubPr.merged_at ? 'merged' : (githubPr.state as 'open' | 'closed'),
    labels: githubPr.labels.map((l: LabelResponse) => (typeof l === 'string' ? l : l.name)),
    createdAt: githubPr.created_at,
    updatedAt: githubPr.updated_at,
    url: githubPr.html_url,
  };
}

export function mapComment(githubComment: GitHubCommentResponse): IssueComment {
  return {
    id: githubComment.id,
    body: githubComment.body,
    createdAt: githubComment.created_at,
    url: githubComment.html_url,
  };
}
