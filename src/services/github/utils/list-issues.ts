import { Logger } from '@core/utils';
import { GITHUB_REPO_OWNER, GITHUB_REPO_NAME } from '../constants';
import type { GitHubServiceResponse, Issue } from '../types';
import { getOctokit } from './octokit';
import { mapIssue } from './mappers';

const logger = new Logger('ListIssues');

type IssueState = 'open' | 'closed' | 'all';

export async function listIssues(state?: string, labels?: string[]): Promise<GitHubServiceResponse<readonly Issue[]>> {
  try {
    const client = getOctokit();
    const response = await client.issues.listForRepo({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      state: (state as IssueState) || 'open',
      labels: labels?.join(','),
    });

    return {
      success: true,
      data: response.data.map(mapIssue),
    };
  } catch (err) {
    const errorMsg = `Failed to list issues: ${err instanceof Error ? err.message : String(err)}`;
    logger.error(errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }
}
