import { Logger } from '@core/utils';
import { GITHUB_REPO_NAME, GITHUB_REPO_OWNER } from '../constants';
import type { GitHubServiceResponse, IssueComment } from '../types';
import { mapComment } from './mappers';
import { getOctokit } from './octokit';

const logger = new Logger('CreateIssueComment');

export async function createIssueComment(issueNumber: number, body: string): Promise<GitHubServiceResponse<IssueComment>> {
  try {
    const octokit = getOctokit();
    const response = await octokit.issues.createComment({
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
