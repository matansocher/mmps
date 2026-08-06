import { getErrorMessage, Logger } from '@core/utils';
import { GITHUB_REPO_NAME, GITHUB_REPO_OWNER, HEROKU_DEPLOY_DEFAULT_REF } from '../constants';
import type { GitHubServiceResponse, TriggerWorkflowResult } from '../types';
import { getOctokit } from './octokit';

const logger = new Logger('github:trigger-workflow');

export async function triggerWorkflow(workflowFile: string, ref: string = HEROKU_DEPLOY_DEFAULT_REF): Promise<GitHubServiceResponse<TriggerWorkflowResult>> {
  try {
    const octokit = getOctokit();
    await octokit.actions.createWorkflowDispatch({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      workflow_id: workflowFile,
      ref,
    });

    return {
      success: true,
      data: { workflow: workflowFile, ref },
    };
  } catch (err) {
    const errorMsg = `Failed to trigger workflow '${workflowFile}' on ref '${ref}': ${getErrorMessage(err)}`;
    logger.error(errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }
}
