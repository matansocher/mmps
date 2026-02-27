import { Logger } from '@core/utils';
import { GITHUB_REPO_OWNER, GITHUB_REPO_NAME } from '../constants';
import type { CreateIssueInput, GitHubServiceResponse, Issue } from '../types';
import { getOctokit } from './octokit';
import { mapIssue } from './mappers';

const logger = new Logger('CreateIssue');

export async function createIssue(input: CreateIssueInput): Promise<GitHubServiceResponse<Issue>> {
  try {
    const client = getOctokit();
    const response = await client.issues.create({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      title: input.title,
      body: input.body,
      labels: input.labels as string[] | undefined,
      assignees: input.assignees as string[] | undefined,
    });

    return {
      success: true,
      data: mapIssue(response.data),
    };
  } catch (err) {
    const errorMsg = `Failed to create issue: ${err instanceof Error ? err.message : String(err)}`;
    logger.error(errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }
}
