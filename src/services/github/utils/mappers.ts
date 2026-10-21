import { Octokit } from '@octokit/rest';
import type { CheckAnnotation, Issue, IssueComment, PullRequest, WorkflowJob, WorkflowRun } from '../types';

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

type GitHubWorkflowRunResponse = Awaited<ReturnType<Octokit['actions']['getWorkflowRun']>>['data'];
type GitHubWorkflowJobResponse = Awaited<ReturnType<Octokit['actions']['listJobsForWorkflowRun']>>['data']['jobs'][0];
type GitHubAnnotationResponse = Awaited<ReturnType<Octokit['checks']['listAnnotations']>>['data'][0];

export function mapWorkflowRun(run: GitHubWorkflowRunResponse): WorkflowRun {
  return {
    id: run.id,
    runNumber: run.run_number,
    name: run.name ?? null,
    workflowPath: run.path,
    event: run.event,
    branch: run.head_branch ?? null,
    headSha: run.head_sha,
    status: run.status ?? null,
    conclusion: run.conclusion ?? null,
    createdAt: run.created_at,
    url: run.html_url,
  };
}

export function mapWorkflowJob(job: GitHubWorkflowJobResponse): WorkflowJob {
  return {
    id: job.id,
    name: job.name,
    status: job.status,
    conclusion: job.conclusion ?? null,
    failedSteps: (job.steps || []).filter((step) => step.conclusion === 'failure').map((step) => step.name),
    url: job.html_url ?? null,
  };
}

export function mapAnnotation(jobId: number, annotation: GitHubAnnotationResponse): CheckAnnotation {
  return {
    jobId,
    path: annotation.path,
    startLine: annotation.start_line,
    level: annotation.annotation_level ?? null,
    title: annotation.title ?? null,
    message: annotation.message ?? null,
  };
}
