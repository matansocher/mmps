import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import {
  addLabels,
  createIssue,
  createIssueComment,
  createPullRequestComment,
  getIssue,
  getPRChecks,
  getPRReviews,
  getPullRequest,
  listIssues,
  listPRFiles,
  listPullRequests,
  updateIssue,
} from '@services/github';

const schema = z.object({
  action: z
    .enum(['create_issue', 'get_issue', 'update_issue', 'comment_issue', 'comment_pr', 'add_labels', 'list_issues', 'list_prs', 'get_pr_checks', 'get_pr', 'list_pr_files', 'get_pr_reviews'])
    .describe('The GitHub action to perform'),
  title: z.string().optional().describe('Issue title (for create_issue and update_issue)'),
  body: z.string().optional().describe('Issue/comment body text'),
  issueNumber: z.number().optional().describe('Issue number for get/update/comment actions'),
  prNumber: z.number().optional().describe('Pull request number for comment action'),
  labels: z.array(z.string()).optional().describe('Labels to assign to issue'),
  assignees: z.array(z.string()).optional().describe('GitHub usernames to assign'),
  state: z.enum(['open', 'closed']).optional().describe('Issue/PR state filter'),
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

    default:
      return JSON.stringify({ error: `Unknown action: ${input.action}` });
  }
}

export const githubTool = tool(runner, {
  name: 'github',
  description:
    'Interact with GitHub repository (matansocher/mmps). Can create, read, update issues and PRs, add labels, list them, and check PR status checks.',
  schema,
});
