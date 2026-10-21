import { getErrorMessage, Logger } from '@core/utils';
import { GITHUB_REPO_NAME, GITHUB_REPO_OWNER } from '../constants';
import type { GitHubServiceResponse, ListWorkflowRunsInput, WorkflowRun } from '../types';
import { mapWorkflowRun } from './mappers';
import { getOctokit } from './octokit';

const logger = new Logger('github:list-workflow-runs');

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;

type RunStatus = Parameters<ReturnType<typeof getOctokit>['actions']['listWorkflowRunsForRepo']>[0]['status'];

export async function listWorkflowRuns({ workflow, branch, status, limit }: ListWorkflowRunsInput = {}): Promise<GitHubServiceResponse<readonly WorkflowRun[]>> {
  try {
    const octokit = getOctokit();
    const params = {
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      branch,
      status: status as RunStatus,
      per_page: Math.min(Math.max(limit || DEFAULT_LIMIT, 1), MAX_LIMIT),
    };

    const response = workflow ? await octokit.actions.listWorkflowRuns({ ...params, workflow_id: workflow }) : await octokit.actions.listWorkflowRunsForRepo(params);

    return { success: true, data: response.data.workflow_runs.map(mapWorkflowRun) };
  } catch (err) {
    const errorMsg = `Failed to list workflow runs${workflow ? ` for '${workflow}'` : ''}: ${getErrorMessage(err)}`;
    logger.error(errorMsg);
    return { success: false, error: errorMsg };
  }
}
