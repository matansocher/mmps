import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { callGithubMcpTool } from '../../mcp/github-mcp-client';

const githubSchema = z.object({
  operation: z
    .string()
    .describe(
      'The GitHub operation to perform. Available operations: create_or_update_file, create_repository, get_file_contents, push_files, create_issue, update_issue, add_issue_comment, get_issue, list_issues, create_pull_request, get_pull_request, list_pull_requests, create_pull_request_review, merge_pull_request, get_pull_request_files, get_pull_request_status, get_pull_request_comments, get_pull_request_reviews, update_pull_request_branch, fork_repository, create_branch, list_commits, search_code, search_issues, search_repositories, search_users',
    ),
  owner: z.string().describe('The repository owner (username or organization)').optional(),
  repo: z.string().describe('The repository name').optional(),
  path: z.string().describe('File path (for file operations)').optional(),
  content: z.string().describe('File content or description').optional(),
  message: z.string().describe('Commit message or issue/PR title').optional(),
  branch: z.string().describe('Branch name').optional(),
  query: z.string().describe('Search query (for search operations)').optional(),
  base: z.string().describe('Base branch for pull requests').optional(),
  head: z.string().describe('Head branch for pull requests').optional(),
  title: z.string().describe('Title for issues or pull requests').optional(),
  body: z.string().describe('Body/description for issues or pull requests').optional(),
  sha: z.string().describe('Commit SHA (for some operations)').optional(),
  draft: z.boolean().describe('Whether to create the pull request as a draft').optional(),
  pull_number: z.number().describe('Pull request number (for PR operations)').optional(),
  issue_number: z.number().describe('Issue number (for issue operations)').optional(),
});

async function githubRunner(args: z.infer<typeof githubSchema>) {
  try {
    const { operation, ...params } = args;

    if (!params.owner && operation !== 'search_repositories' && operation !== 'search_code' && operation !== 'search_issues' && operation !== 'search_users') {
      params.owner = 'matansocher';
    }

    const cleanParams = Object.fromEntries(Object.entries(params).filter(([_, v]) => v !== undefined));

    const result = await callGithubMcpTool(operation, cleanParams);

    if (result.content && Array.isArray(result.content)) {
      const textContent = result.content.find((c: any) => c.type === 'text');
      if (textContent && 'text' in textContent) {
        return textContent.text;
      }
    }

    return JSON.stringify(result);
  } catch (error: any) {
    return `Error performing GitHub operation ${args.operation}: ${error.message}`;
  }
}

export const githubTool = tool(githubRunner, {
  name: 'github',
  description: `Interact with GitHub repositories via the GitHub MCP server.

IMPORTANT: When the owner/organization is not explicitly specified, it defaults to 'matansocher' (the user's GitHub username). For example, if asked about "mmps repo", it will automatically use 'matansocher/mmps'.

Supports operations like:

File Operations:
- create_or_update_file: Create or update a single file in a repository
- get_file_contents: Read file contents from a repository
- push_files: Push multiple files to a repository in a single commit

Repository Operations:
- create_repository: Create a new repository
- fork_repository: Fork a repository to your account
- search_repositories: Search for GitHub repositories

Branch Operations:
- create_branch: Create a new branch in a repository
- list_commits: Get list of commits of a branch

Issue Operations:
- create_issue: Create a new issue
- get_issue: Get details of a specific issue
- list_issues: List issues with filtering options
- update_issue: Update an existing issue
- add_issue_comment: Add a comment to an issue

Pull Request Operations:
- create_pull_request: Create a new pull request (requires: owner, repo, title, head, base; optional: body, draft)
- get_pull_request: Get details of a specific pull request
- list_pull_requests: List pull requests with filtering options
- create_pull_request_review: Create a review on a pull request
- merge_pull_request: Merge a pull request
- get_pull_request_files: Get the list of files changed in a pull request
- get_pull_request_status: Get the combined status of all status checks
- get_pull_request_comments: Get review comments on a pull request
- get_pull_request_reviews: Get reviews on a pull request
- update_pull_request_branch: Update PR branch with latest changes from base

Search Operations:
- search_code: Search for code across GitHub repositories
- search_issues: Search for issues and pull requests
- search_users: Search for users on GitHub

Provide the operation name and relevant parameters (owner, repo, path, content, message, branch, title, body, head, base, draft, pull_number, issue_number, etc.)`,
  schema: githubSchema,
});
