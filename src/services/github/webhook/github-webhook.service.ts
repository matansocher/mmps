import type { Bot } from 'grammy';
import { MY_USER_ID } from '@core/config';
import { Logger } from '@core/utils';
import { GITHUB_REPO_NAME, GITHUB_REPO_OWNER } from '../constants';
import { getOctokit } from '../utils/octokit';
import type { WorkflowRunEvent } from './types';

const logger = new Logger('GitHubWebhookService');
const CLAUDE_WORKFLOW_NAME = 'Claude Code';

export async function handleWorkflowRunCompleted(payload: WorkflowRunEvent, bot: Bot): Promise<void> {
  const { workflow_run } = payload;

  if (workflow_run.name !== CLAUDE_WORKFLOW_NAME) return;

  const isSuccess = workflow_run.conclusion === 'success';
  const isImplement = workflow_run.event === 'issues';
  const isReview = workflow_run.event === 'pull_request_target';

  if (!isImplement && !isReview) return;

  try {
    const message = isImplement ? await buildImplementMessage(workflow_run, isSuccess) : buildReviewMessage(workflow_run, isSuccess);

    await bot.api.sendMessage(MY_USER_ID, message, { parse_mode: 'Markdown' });
    logger.log(`Sent ${isImplement ? 'implement' : 'review'} ${isSuccess ? 'success' : 'failure'} notification`);
  } catch (err) {
    logger.error(`Failed to send webhook notification: ${err}`);
  }
}

async function buildImplementMessage(workflowRun: WorkflowRunEvent['workflow_run'], isSuccess: boolean): Promise<string> {
  if (!isSuccess) {
    return `❌ Implementation failed for issue workflow.\n[View workflow run](${workflowRun.html_url})`;
  }

  try {
    const octokit = getOctokit();
    const { data: pullRequests } = await octokit.pulls.list({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      head: `${GITHUB_REPO_OWNER}:${workflowRun.head_branch}`,
      state: 'open',
    });

    if (pullRequests.length > 0) {
      const pr = pullRequests[0];
      return `🚀 Implementation complete!\nPR created: [${pr.title}](${pr.html_url})`;
    }

    return `🚀 Implementation workflow completed.\n[View workflow run](${workflowRun.html_url})`;
  } catch (err) {
    logger.error(`Failed to fetch PR details: ${err}`);
    return `🚀 Implementation workflow completed.\n[View workflow run](${workflowRun.html_url})`;
  }
}

function buildReviewMessage(workflowRun: WorkflowRunEvent['workflow_run'], isSuccess: boolean): string {
  if (!isSuccess) {
    return `❌ Code review failed for PR workflow.\n[View workflow run](${workflowRun.html_url})`;
  }

  const pr = workflowRun.pull_requests[0];
  if (pr) {
    const prUrl = `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/pull/${pr.number}`;
    return `✅ Code review complete for PR #${pr.number}!\n[View review](${prUrl})`;
  }

  return `✅ Code review workflow completed.\n[View workflow run](${workflowRun.html_url})`;
}
