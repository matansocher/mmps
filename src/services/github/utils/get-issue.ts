import { Logger } from '@core/utils';
import { GITHUB_REPO_NAME, GITHUB_REPO_OWNER } from '../constants';
import type { GitHubServiceResponse, Issue } from '../types';
import { mapIssue } from './mappers';
import { getOctokit } from './octokit';

const logger = new Logger('GetIssue');

export async function getIssue(issueNumber: number): Promise<GitHubServiceResponse<Issue>> {
  try {
    const octokit = getOctokit();
    const response = await octokit.issues.get({
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
