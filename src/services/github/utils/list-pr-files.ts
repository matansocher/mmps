import { Logger } from '@core/utils';
import { GITHUB_REPO_NAME, GITHUB_REPO_OWNER } from '../constants';
import type { GitHubServiceResponse, PullRequestFile } from '../types';
import { getOctokit } from './octokit';

const logger = new Logger('ListPRFiles');

export async function listPRFiles(prNumber: number): Promise<GitHubServiceResponse<readonly PullRequestFile[]>> {
  try {
    const octokit = getOctokit();
    const response = await octokit.pulls.listFiles({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      pull_number: prNumber,
    });

    const files: PullRequestFile[] = response.data.map((file) => ({
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
    }));

    return { success: true, data: files };
  } catch (err) {
    const errorMsg = `Failed to list files for PR #${prNumber}: ${err instanceof Error ? err.message : String(err)}`;
    logger.error(errorMsg);
    return { success: false, error: errorMsg };
  }
}
