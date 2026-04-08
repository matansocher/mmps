import { Logger } from '@core/utils';
import { GITHUB_REPO_NAME, GITHUB_REPO_OWNER } from '../constants';
import type { GitHubServiceResponse, PullRequestCheck } from '../types';
import { getOctokit } from './octokit';

const logger = new Logger('GetPRChecks');

export async function getPRChecks(prNumber: number): Promise<GitHubServiceResponse<readonly PullRequestCheck[]>> {
  try {
    const octokit = getOctokit();
    const pr = await octokit.pulls.get({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      pull_number: prNumber,
    });

    const ref = pr.data.head.sha;
    const response = await octokit.checks.listForRef({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      ref,
    });

    const checks: PullRequestCheck[] = response.data.check_runs.map((run) => ({
      name: run.name,
      status: run.status,
      conclusion: run.conclusion ?? null,
      startedAt: run.started_at ?? null,
      completedAt: run.completed_at ?? null,
      url: run.html_url ?? null,
    }));

    return { success: true, data: checks };
  } catch (err) {
    const errorMsg = `Failed to get PR checks for #${prNumber}: ${err instanceof Error ? err.message : String(err)}`;
    logger.error(errorMsg);
    return { success: false, error: errorMsg };
  }
}
