import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { callGithubMcpTool } from '../../mcp/github-mcp-client';

const githubSchema = z.object({
  operation: z
    .string()
    .describe(
      'The GitHub operation to perform. Available operations: create_or_update_file, search_repositories, create_repository, get_file_contents, push_files, create_issue, create_pull_request, fork_repository, create_branch, list_commits, list_issues',
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
});

async function githubRunner(args: z.infer<typeof githubSchema>) {
  try {
    const { operation, ...params } = args;

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
  description: `Interact with GitHub repositories. Supports operations like:
- create_or_update_file: Create or update files in a repository
- search_repositories: Search for GitHub repositories
- create_repository: Create a new repository
- get_file_contents: Read file contents from a repository
- push_files: Push multiple files to a repository
- create_issue: Create a new issue
- create_pull_request: Create a new pull request
- fork_repository: Fork a repository
- create_branch: Create a new branch
- list_commits: List commits in a repository
- list_issues: List issues in a repository

Provide the operation name and relevant parameters (owner, repo, path, content, message, branch, etc.)`,
  schema: githubSchema,
});
