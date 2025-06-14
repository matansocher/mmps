import fs from 'fs';
import { get as _get } from 'lodash';
import { OpenAI } from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { AssistantStream } from 'openai/lib/AssistantStream';
import { FileObject } from 'openai/resources';
import { Message, MessageCreateParams, Run, Thread } from 'openai/resources/beta/threads';
import { z, ZodType } from 'zod';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ASSISTANT_RUN_STATUSES, CHAT_COMPLETIONS_MODEL, ERROR_STATUSES, OPENAI_CLIENT_TOKEN } from './openai.config';

@Injectable()
export class OpenaiAssistantService {
  private readonly logger = new Logger(OpenaiAssistantService.name);

  constructor(@Inject(OPENAI_CLIENT_TOKEN) private readonly openai: OpenAI) {}

  createThread(): Promise<Thread> {
    return this.openai.beta.threads.create();
  }

  async getAssistantAnswer(assistantId: string, threadId: string, prompt: string): Promise<string> {
    await this.addMessageToThread(threadId, prompt, 'user');
    const { thread_id } = await this.runThread(assistantId, threadId);
    return this.getThreadResponse(thread_id);
  }

  async getStructuredOutput<TSchema extends ZodType>(schema: TSchema, instructions: string, content: string): Promise<z.infer<TSchema>> {
    const completion = await this.openai.beta.chat.completions.parse({
      model: CHAT_COMPLETIONS_MODEL,
      messages: [
        { role: 'system', content: instructions },
        { role: 'user', content },
      ],
      response_format: zodResponseFormat(schema, 'schema'),
    });

    return completion.choices[0].message.parsed;
  }

  addMessageToThread(threadId: string, content: string, role = 'user', fileId?: string): Promise<Message> {
    return this.openai.beta.threads.messages.create(threadId, <MessageCreateParams>{
      role,
      content,
      ...(fileId ? { attachments: [{ file_id: fileId, tools: [{ type: 'file_search' }] }] } : {}),
    });
  }

  async getThreadRunStream(assistantId: string, threadId: string): Promise<AssistantStream> {
    return this.openai.beta.threads.runs.stream(threadId, { assistant_id: assistantId });
  }

  async runThread(assistantId: string, threadId: string): Promise<Run> {
    const run: Run = await this.openai.beta.threads.runs.createAndPoll(threadId, { assistant_id: assistantId }); // instructions: ''
    if (run.status === ASSISTANT_RUN_STATUSES.COMPLETED) {
      return run;
    }
    if (ERROR_STATUSES.includes(run.status as ASSISTANT_RUN_STATUSES)) {
      this.logger.error(`${this.runThread.name} - Error running thread ${run.thread_id} with error: ${run.last_error?.message}, code: ${run.last_error.code}, status: ${run.status}`);
      return null;
    }

    this.logger.error(`${this.runThread.name} - Error running thread ${run.thread_id}. run object: ${JSON.stringify(run)}`);
    return null;
  }

  async getThreadResponse(threadId: string): Promise<string> {
    const result = await this.openai.beta.threads.messages.list(threadId);
    return _get(result, 'data[0].content[0].text.value', null);
  }

  async runThreadWithTool(assistantId: string, threadId: string): Promise<Run> {
    const run: Run = await this.openai.beta.threads.runs.createAndPoll(threadId, { assistant_id: assistantId }); // instructions: ''
    if (run.status === ASSISTANT_RUN_STATUSES.REQUIRES_ACTION) {
      return run;
    }
    if (ERROR_STATUSES.includes(run.status as ASSISTANT_RUN_STATUSES)) {
      this.logger.error(`${this.runThread.name} - Error running thread ${run.thread_id} with error: ${run.last_error?.message}, code: ${run.last_error.code}, status: ${run.status}`);
      return null;
    }

    this.logger.error(`${this.runThread.name} - Error running thread ${run.thread_id}. run object: ${JSON.stringify(run)}`);
    return null;
  }

  async getToolResponse<T>(run: Run): Promise<T> {
    if (run.required_action.type === 'submit_tool_outputs') {
      const result = _get(run, 'required_action.submit_tool_outputs.tool_calls[0].function.arguments', null);
      return result ? JSON.parse(result) : undefined;
    }
  }

  async uploadFile(filePath: string): Promise<FileObject> {
    const fileContent = fs.createReadStream(filePath);
    const response = await this.openai.files.create({
      file: fileContent,
      purpose: 'assistants',
    });
    return response;
  }

  async deleteFile(fileId: string): Promise<void> {
    await this.openai.files.del(fileId);
  }
}
