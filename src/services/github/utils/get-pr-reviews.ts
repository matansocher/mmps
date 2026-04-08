import { Logger } from '@core/utils';
import { GITHUB_REPO_NAME, GITHUB_REPO_OWNER } from '../constants';
import type { GitHubServiceResponse, PullRequestReview } from '../types';
import { getOctokit } from './octokit';

const logger = new Logger('GetPRReviews');

export async function getPRReviews(prNumber: number): Promise<GitHubServiceResponse<readonly PullRequestReview[]>> {
  try {
    const octokit = getOctokit();
    const response = await octokit.pulls.listReviews({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      pull_number: prNumber,
    });

    const reviews: PullRequestReview[] = response.data.map((review) => ({
      id: review.id,
      user: review.user?.login ?? null,
      state: review.state,
      body: review.body,
      submittedAt: review.submitted_at ?? null,
      url: review.html_url,
    }));

    return { success: true, data: reviews };
  } catch (err) {
    const errorMsg = `Failed to get reviews for PR #${prNumber}: ${err instanceof Error ? err.message : String(err)}`;
    logger.error(errorMsg);
    return { success: false, error: errorMsg };
  }
}
