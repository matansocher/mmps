import { get as _get } from 'lodash';
import { OpenAI } from 'openai';
import { Inject, Injectable } from '@nestjs/common';
import { MessageCreateParams, Run } from 'openai/resources/beta/threads';
import { ASSISTANT_RUN_STATUSES, OPENAI_CLIENT_TOKEN } from './openai.config';

@Injectable()
export class OpenaiAssistantService {
  constructor(@Inject(OPENAI_CLIENT_TOKEN) private readonly openai: OpenAI) {}

  async createThread() {
    const thread = await this.openai.beta.threads.create();
    return thread.id;
  }

  addMessageToThread(threadId, messageText, role = 'user') {
    return this.openai.beta.threads.messages.create(threadId, <MessageCreateParams>{
      role,
      content: messageText,
    });
  }

  async runThread(assistantId, threadId): Promise<Run> {
    const run = await this.openai.beta.threads.runs.createAndPoll(threadId, { assistant_id: assistantId }); // instructions: ''
    if (run.status === ASSISTANT_RUN_STATUSES.COMPLETED) {
      return run;
    }
    const errorStatuses = [ASSISTANT_RUN_STATUSES.FAILED, ASSISTANT_RUN_STATUSES.CANCELLED, ASSISTANT_RUN_STATUSES.REQUIRES_ACTION, ASSISTANT_RUN_STATUSES.EXPIRED];
    if (errorStatuses.includes(run.status as ASSISTANT_RUN_STATUSES)) {
      return null;
    }

    return null;
  }

  async getThreadResponse(threadId): Promise<string> {
    const result = await this.openai.beta.threads.messages.list(threadId);
    // return result?.data[0]?.content[0]?.text?.value || null;
    return _get(result, 'data[0].content[0].text.value', null);
  }
}
