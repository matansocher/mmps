import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import {
  createIssue,
  createIssueComment,
  createPullRequestComment,
  getIssue,
  listIssues,
  listPullRequests,
  updateIssue,
} from '@services/github';

const schema = z.object({
  action: z
    .enum(['create_issue', 'get_issue', 'update_issue', 'comment_issue', 'comment_pr', 'list_issues', 'list_prs'])
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

    case 'list_issues': {
      const result = await listIssues(input.state, input.labels);
      return JSON.stringify(result);
    }

    case 'list_prs': {
      const result = await listPullRequests(input.state);
      return JSON.stringify(result);
    }

    default:
      return JSON.stringify({ error: `Unknown action: ${input.action}` });
  }
}

export const githubTool = tool(runner, {
  name: 'github',
  description:
    'Interact with GitHub repository (matansocher/mmps). Can create, read, update issues and PRs, and list them.',
  schema,
});
