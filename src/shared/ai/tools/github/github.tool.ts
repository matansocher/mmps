import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import {
  addLabels,
  createIssue,
  createIssueComment,
  createPullRequestComment,
  getIssue,
  getJobLog,
  getPRChecks,
  getPRReviews,
  getPullRequest,
  getWorkflowRun,
  HEROKU_DEPLOY_WORKFLOW_FILE,
  listIssues,
  listPRFiles,
  listPullRequests,
  listWorkflowRuns,
  mergePullRequest,
  triggerWorkflow,
  updateIssue,
} from '@services/github';

const schema = z.object({
  action: z
    .enum([
      'create_issue',
      'get_issue',
      'update_issue',
      'comment_issue',
      'comment_pr',
      'add_labels',
      'list_issues',
      'list_prs',
      'get_pr_checks',
      'get_pr',
      'list_pr_files',
      'get_pr_reviews',
      'deploy',
      'merge_pr',
      'list_workflow_runs',
      'get_workflow_run',
      'get_job_log',
    ])
    .describe('The GitHub action to perform'),
  title: z.string().optional().describe('Issue title (for create_issue and update_issue)'),
  body: z.string().optional().describe('Issue/comment body text'),
  issueNumber: z.number().optional().describe('Issue number for get/update/comment actions'),
  prNumber: z.number().optional().describe('Pull request number for comment action'),
  labels: z.array(z.string()).optional().describe('Labels to assign to issue'),
  assignees: z.array(z.string()).optional().describe('GitHub usernames to assign'),
  state: z.enum(['open', 'closed']).optional().describe('Issue/PR state filter'),
  mergeMethod: z.enum(['merge', 'squash', 'rebase']).optional().describe('Merge strategy for merge_pr (defaults to squash)'),
  workflow: z.string().optional().describe('Workflow file name to filter list_workflow_runs by, e.g. "heroku-deploy.yml" or "ci.yml"'),
  branch: z.string().optional().describe('Branch to filter list_workflow_runs by, e.g. "main"'),
  runStatus: z.enum(['completed', 'in_progress', 'queued', 'success', 'failure', 'cancelled']).optional().describe('Run status/conclusion to filter list_workflow_runs by'),
  limit: z.number().optional().describe('Max runs to return for list_workflow_runs (default 5, max 20)'),
  runId: z.number().optional().describe('Workflow run id for get_workflow_run (the number after /actions/runs/ in a run URL)'),
  jobId: z.number().optional().describe('Job id for get_job_log (from get_workflow_run jobs, or the number after /job/ in a job URL)'),
  tailLines: z.number().optional().describe('How many trailing log lines get_job_log includes besides the error lines (default 80)'),
});

async function runner(input: z.infer<typeof schema>) {
  switch (input.action) {
    case 'create_issue': {
      if (!input.title) return JSON.stringify({ error: 'title is required for create_issue' });
      const result = await createIssue({
        title: input.title,
        body: input.body,
        labels: input.labels,
        assignees: input.assignees,
      });
      return JSON.stringify(result);
    }

    case 'get_issue': {
      if (!input.issueNumber) return JSON.stringify({ error: 'issueNumber is required for get_issue' });
      const result = await getIssue(input.issueNumber);
      return JSON.stringify(result);
    }

    case 'update_issue': {
      if (!input.issueNumber) return JSON.stringify({ error: 'issueNumber is required for update_issue' });
      const result = await updateIssue(input.issueNumber, {
        title: input.title,
        body: input.body,
        state: input.state,
        labels: input.labels,
        assignees: input.assignees,
      });
      return JSON.stringify(result);
    }

    case 'comment_issue': {
      if (!input.issueNumber || !input.body) {
        return JSON.stringify({ error: 'issueNumber and body are required for comment_issue' });
      }
      const result = await createIssueComment(input.issueNumber, input.body);
      return JSON.stringify(result);
    }

    case 'comment_pr': {
      if (!input.prNumber || !input.body) {
        return JSON.stringify({ error: 'prNumber and body are required for comment_pr' });
      }
      const result = await createPullRequestComment(input.prNumber, input.body);
      return JSON.stringify(result);
    }

    case 'add_labels': {
      const issueOrPrNumber = input.issueNumber || input.prNumber;
      if (!issueOrPrNumber || !input.labels?.length) {
        return JSON.stringify({ error: 'issueNumber (or prNumber) and labels are required for add_labels' });
      }
      const result = await addLabels(issueOrPrNumber, [...input.labels]);
      return JSON.stringify(result);
    }

    case 'list_issues': {
      const result = await listIssues(input.state, input.labels);
      return JSON.stringify(result);
    }

    case 'list_prs': {
      const result = await listPullRequests(input.state);
      return JSON.stringify(result);
    }

    case 'get_pr_checks': {
      if (!input.prNumber) return JSON.stringify({ error: 'prNumber is required for get_pr_checks' });
      const result = await getPRChecks(input.prNumber);
      return JSON.stringify(result);
    }

    case 'get_pr': {
      if (!input.prNumber) return JSON.stringify({ error: 'prNumber is required for get_pr' });
      const result = await getPullRequest(input.prNumber);
      return JSON.stringify(result);
    }

    case 'list_pr_files': {
      if (!input.prNumber) return JSON.stringify({ error: 'prNumber is required for list_pr_files' });
      const result = await listPRFiles(input.prNumber);
      return JSON.stringify(result);
    }

    case 'get_pr_reviews': {
      if (!input.prNumber) return JSON.stringify({ error: 'prNumber is required for get_pr_reviews' });
      const result = await getPRReviews(input.prNumber);
      return JSON.stringify(result);
    }

    case 'deploy': {
      const result = await triggerWorkflow(HEROKU_DEPLOY_WORKFLOW_FILE);
      return JSON.stringify(result);
    }

    case 'merge_pr': {
      if (!input.prNumber) return JSON.stringify({ error: 'prNumber is required for merge_pr' });
      const result = await mergePullRequest(input.prNumber, input.mergeMethod);
      return JSON.stringify(result);
    }

    case 'list_workflow_runs': {
      const result = await listWorkflowRuns({ workflow: input.workflow, branch: input.branch, status: input.runStatus, limit: input.limit });
      return JSON.stringify(result);
    }

    case 'get_workflow_run': {
      if (!input.runId) return JSON.stringify({ error: 'runId is required for get_workflow_run' });
      const result = await getWorkflowRun(input.runId);
      return JSON.stringify(result);
    }

    case 'get_job_log': {
      if (!input.jobId) return JSON.stringify({ error: 'jobId is required for get_job_log' });
      const result = await getJobLog(input.jobId, input.tailLines);
      return JSON.stringify(result);
    }

    default:
      return JSON.stringify({ error: `Unknown action: ${input.action}` });
  }
}

export const githubTool = tool(runner, {
  name: 'github',
  description: `Interact with the GitHub repository matansocher/mmps (the ONLY repo — never ask the user which repo, branch, or file). Can create, read, update issues and PRs, add labels, list them, check PR status checks, and investigate GitHub Actions workflow runs (runs, failed jobs/steps, annotations, and job logs). To build or change anything in the code (a "new feature", bug fix, or behavior change), use create_issue with a detailed description of the request, then add_labels with the "implement" label to that issue to trigger the automated implementation workflow. To deploy the repo to production (Heroku), use the "deploy" action, which dispatches the Heroku deploy GitHub Actions workflow. To merge an open pull request into the base branch, use the "merge_pr" action with the PR number (defaults to squash merge).

Flows:
- Feature / code-change requests ("build", "add", "change", "fix" anything in the code): create_issue with a clear title and a body capturing every specific (times, names, values), then immediately add_labels the "implement" label to that issue. The workflow's AI locates the code itself. Confirm the issue number/link and that a PR will follow.
- "Review this PR" / "request a code review": add the "review" label to the PR (prNumber).
- "Implement this issue" (existing issue number): add the "implement" label to the issue (issueNumber).
- "Deploy mmps" / "ship it to production": use "deploy", then confirm it was dispatched.
- "Merge PR 42": use "merge_pr" with the prNumber; only pass mergeMethod when explicitly asked. Confirm the result.
- "Why did the deploy/build/CI fail?" / "check GitHub Actions": list_workflow_runs (workflow "heroku-deploy.yml" for deploys, "ci.yml" for CI; runStatus "failure" to find the latest failure), then get_workflow_run with its runId to see failed jobs, failed steps and annotations, then get_job_log with the failed job's jobId. Report the failing job/step and quote the exact error lines (file:line and message). Never ask the user for logs — fetch them. If the user pastes an Actions URL, take runId from /actions/runs/<runId> and jobId from /job/<jobId>. For PR status checks use get_pr_checks.
- If an action returns success: false, relay the error briefly.`,
  schema,
});
