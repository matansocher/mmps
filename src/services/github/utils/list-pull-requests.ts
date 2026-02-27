import { Logger } from '@core/utils';
import { GITHUB_REPO_NAME, GITHUB_REPO_OWNER } from '../constants';
import type { GitHubServiceResponse, PullRequest } from '../types';
import { mapPullRequest } from './mappers';
import { getOctokit } from './octokit';

const logger = new Logger('ListPullRequests');

type PRState = 'open' | 'closed' | 'all';

export async function listPullRequests(state?: string): Promise<GitHubServiceResponse<readonly PullRequest[]>> {
  try {
    const octokit = getOctokit();
    const response = await octokit.pulls.list({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      state: (state as PRState) || 'open',
    });

    return {
      success: true,
      data: response.data.map(mapPullRequest),
    };
  } catch (err) {
    const errorMsg = `Failed to list pull requests: ${err instanceof Error ? err.message : String(err)}`;
    logger.error(errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }
}
