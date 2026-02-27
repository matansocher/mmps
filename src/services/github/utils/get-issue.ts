import { Logger } from '@core/utils';
import { GITHUB_REPO_OWNER, GITHUB_REPO_NAME } from '../constants';
import type { GitHubServiceResponse, Issue } from '../types';
import { getOctokit } from './octokit';
import { mapIssue } from './mappers';

const logger = new Logger('GetIssue');

export async function getIssue(issueNumber: number): Promise<GitHubServiceResponse<Issue>> {
  try {
    const client = getOctokit();
    const response = await client.issues.get({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      issue_number: issueNumber,
    });

    return {
      success: true,
      data: mapIssue(response.data),
    };
  } catch (err) {
    const errorMsg = `Failed to get issue #${issueNumber}: ${err instanceof Error ? err.message : String(err)}`;
    logger.error(errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }
}
