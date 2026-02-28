import { Logger } from '@core/utils';
import { GITHUB_REPO_NAME, GITHUB_REPO_OWNER } from '../constants';
import type { GitHubServiceResponse } from '../types';
import { getOctokit } from './octokit';

const logger = new Logger('AddLabels');

export async function addLabels(issueNumber: number, labels: string[]): Promise<GitHubServiceResponse<string[]>> {
  try {
    const octokit = getOctokit();
    const response = await octokit.issues.addLabels({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      issue_number: issueNumber,
      labels,
    });

    return {
      success: true,
      data: response.data.map((label) => (typeof label === 'string' ? label : label.name || '')),
    };
  } catch (err) {
    const errorMsg = `Failed to add labels to #${issueNumber}: ${err instanceof Error ? err.message : String(err)}`;
    logger.error(errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }
}
