import { Logger } from '@core/utils';
import { GITHUB_REPO_OWNER, GITHUB_REPO_NAME } from '../constants';
import type { GitHubServiceResponse, IssueComment } from '../types';
import { getOctokit } from './octokit';
import { mapComment } from './mappers';

const logger = new Logger('CreateIssueComment');

export async function createIssueComment(
  issueNumber: number,
  body: string,
): Promise<GitHubServiceResponse<IssueComment>> {
  try {
    const client = getOctokit();
    const response = await client.issues.createComment({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      issue_number: issueNumber,
      body,
    });

    return {
      success: true,
      data: mapComment(response.data),
    };
  } catch (err) {
    const errorMsg = `Failed to comment on issue #${issueNumber}: ${err instanceof Error ? err.message : String(err)}`;
    logger.error(errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }
}
