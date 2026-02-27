import { Logger } from '@core/utils';
import { GITHUB_REPO_OWNER, GITHUB_REPO_NAME } from '../constants';
import type { GitHubServiceResponse, IssueComment } from '../types';
import { getOctokit } from './octokit';
import { mapComment } from './mappers';

const logger = new Logger('CreatePullRequestComment');

export async function createPullRequestComment(
  prNumber: number,
  body: string,
): Promise<GitHubServiceResponse<IssueComment>> {
  try {
    const client = getOctokit();
    const response = await client.issues.createComment({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      issue_number: prNumber,
      body,
    });

    return {
      success: true,
      data: mapComment(response.data),
    };
  } catch (err) {
    const errorMsg = `Failed to comment on PR #${prNumber}: ${err instanceof Error ? err.message : String(err)}`;
    logger.error(errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }
}
