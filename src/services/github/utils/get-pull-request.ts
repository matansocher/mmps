import { Logger } from '@core/utils';
import { GITHUB_REPO_NAME, GITHUB_REPO_OWNER } from '../constants';
import type { GitHubServiceResponse, PullRequest } from '../types';
import { mapPullRequest } from './mappers';
import { getOctokit } from './octokit';

const logger = new Logger('GetPullRequest');

export async function getPullRequest(prNumber: number): Promise<GitHubServiceResponse<PullRequest>> {
  try {
    const octokit = getOctokit();
    const response = await octokit.pulls.get({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      pull_number: prNumber,
    });

    return {
      success: true,
      data: mapPullRequest(response.data as any),
    };
  } catch (err) {
    const errorMsg = `Failed to get PR #${prNumber}: ${err instanceof Error ? err.message : String(err)}`;
    logger.error(errorMsg);
    return { success: false, error: errorMsg };
  }
}
