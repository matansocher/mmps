import { getErrorMessage, Logger } from '@core/utils';
import { GITHUB_REPO_NAME, GITHUB_REPO_OWNER } from '../constants';
import type { GitHubServiceResponse, MergePullRequestResult } from '../types';
import { getOctokit } from './octokit';

const logger = new Logger('github:merge-pull-request');

type MergeMethod = 'merge' | 'squash' | 'rebase';

export async function mergePullRequest(prNumber: number, mergeMethod: MergeMethod = 'squash'): Promise<GitHubServiceResponse<MergePullRequestResult>> {
  try {
    const octokit = getOctokit();
    const response = await octokit.pulls.merge({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      pull_number: prNumber,
      merge_method: mergeMethod,
    });

    return {
      success: true,
      data: {
        merged: response.data.merged,
        message: response.data.message,
        sha: response.data.sha,
      },
    };
  } catch (err) {
    const errorMsg = `Failed to merge PR #${prNumber}: ${getErrorMessage(err)}`;
    logger.error(errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }
}
