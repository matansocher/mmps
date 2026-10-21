import { getErrorMessage, Logger } from '@core/utils';
import { GITHUB_REPO_NAME, GITHUB_REPO_OWNER } from '../constants';
import type { CheckAnnotation, GitHubServiceResponse, WorkflowRunDetails } from '../types';
import { mapAnnotation, mapWorkflowJob, mapWorkflowRun } from './mappers';
import { getOctokit } from './octokit';

const logger = new Logger('github:get-workflow-run');

export async function getWorkflowRun(runId: number): Promise<GitHubServiceResponse<WorkflowRunDetails>> {
  try {
    const octokit = getOctokit();
    const [runResponse, jobsResponse] = await Promise.all([
      octokit.actions.getWorkflowRun({ owner: GITHUB_REPO_OWNER, repo: GITHUB_REPO_NAME, run_id: runId }),
      octokit.actions.listJobsForWorkflowRun({ owner: GITHUB_REPO_OWNER, repo: GITHUB_REPO_NAME, run_id: runId, per_page: 100 }),
    ]);

    const jobs = jobsResponse.data.jobs.map(mapWorkflowJob);
    const failedJobs = jobs.filter((job) => job.conclusion === 'failure');

    // A job id is also its check-run id, so annotations can be fetched per job
    const annotationsPerJob = await Promise.all(
      failedJobs.map(async (job): Promise<readonly CheckAnnotation[]> => {
        try {
          const response = await octokit.checks.listAnnotations({ owner: GITHUB_REPO_OWNER, repo: GITHUB_REPO_NAME, check_run_id: job.id });
          return response.data.map((annotation) => mapAnnotation(job.id, annotation));
        } catch (err) {
          logger.warn(`Failed to get annotations for job ${job.id}: ${getErrorMessage(err)}`);
          return [];
        }
      }),
    );

    return { success: true, data: { run: mapWorkflowRun(runResponse.data), jobs, annotations: annotationsPerJob.flat() } };
  } catch (err) {
    const errorMsg = `Failed to get workflow run ${runId}: ${getErrorMessage(err)}`;
    logger.error(errorMsg);
    return { success: false, error: errorMsg };
  }
}
