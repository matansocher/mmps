import { Run } from 'openai/resources/beta/threads';
import { Logger } from '@nestjs/common';
import { ASSISTANT_RUN_STATUSES, ERROR_STATUSES } from '../../constants';
import { provideOpenAiClient } from '../../provide-openai-client';

const logger = new Logger('runThread');

export async function runThread(assistantId: string, threadId: string): Promise<Run> {
  const client = provideOpenAiClient();
  const run: Run = await client.beta.threads.runs.createAndPoll(threadId, { assistant_id: assistantId });
  if (run.status === ASSISTANT_RUN_STATUSES.COMPLETED) {
    return run;
  }
  if (ERROR_STATUSES.includes(run.status as ASSISTANT_RUN_STATUSES)) {
    logger.error(`runThread - Error running thread ${run.thread_id} with error: ${run.last_error?.message}, code: ${run.last_error.code}, status: ${run.status}`);
    return null;
  }

  logger.error(`runThread - Error running thread ${run.thread_id}. run object: ${JSON.stringify(run)}`);
  return null;
}
