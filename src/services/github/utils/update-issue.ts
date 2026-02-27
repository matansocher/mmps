import { Logger } from '@core/utils';
import { GITHUB_REPO_OWNER, GITHUB_REPO_NAME } from '../constants';
import type { GitHubServiceResponse, Issue, UpdateIssueInput } from '../types';
import { getOctokit } from './octokit';
import { mapIssue } from './mappers';

const logger = new Logger('UpdateIssue');

export async function updateIssue(
  issueNumber: number,
  input: UpdateIssueInput,
): Promise<GitHubServiceResponse<Issue>> {
  try {
    const client = getOctokit();
    const response = await client.issues.update({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      issue_number: issueNumber,
      title: input.title,
      body: input.body,
      state: input.state,
      labels: input.labels as string[] | undefined,
      assignees: input.assignees as string[] | undefined,
    });

    return {
      success: true,
      data: mapIssue(response.data),
    };
  } catch (err) {
    const errorMsg = `Failed to update issue #${issueNumber}: ${err instanceof Error ? err.message : String(err)}`;
    logger.error(errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }
}
