import { getErrorMessage, Logger } from '@core/utils';
import { GITHUB_REPO_NAME, GITHUB_REPO_OWNER } from '../constants';
import type { GitHubServiceResponse, JobLogExcerpt } from '../types';
import { extractLogExcerpt } from './extract-log-excerpt';
import { getOctokit } from './octokit';

const logger = new Logger('github:get-job-log');

export async function getJobLog(jobId: number, tailLines?: number): Promise<GitHubServiceResponse<JobLogExcerpt>> {
  try {
    const octokit = getOctokit();
    const response = await octokit.actions.downloadJobLogsForWorkflowRun({ owner: GITHUB_REPO_OWNER, repo: GITHUB_REPO_NAME, job_id: jobId });
    const rawLog = typeof response.data === 'string' ? response.data : String(response.data ?? '');

    return { success: true, data: { jobId, ...extractLogExcerpt(rawLog, { tailLines }) } };
  } catch (err) {
    const errorMsg = `Failed to get log for job ${jobId}: ${getErrorMessage(err)}`;
    logger.error(errorMsg);
    return { success: false, error: errorMsg };
  }
}
