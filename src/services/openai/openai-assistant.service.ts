import fs from 'fs';
import { get as _get } from 'lodash';
import { OpenAI } from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { FileObject } from 'openai/resources';
import { Message, MessageCreateParams, Run, Thread } from 'openai/resources/beta/threads';
import { z } from 'zod';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ASSISTANT_RUN_STATUSES, ERROR_STATUSES, OPENAI_CLIENT_TOKEN } from './openai.config';

const Step = z.object({
  explanation: z.string(),
  output: z.string(),
});

const MathReasoning = z.object({
  steps: z.array(Step),
  final_answer: z.string(),
});

@Injectable()
export class OpenaiAssistantService {
  private readonly logger = new Logger(OpenaiAssistantService.name);

  constructor(@Inject(OPENAI_CLIENT_TOKEN) private readonly openai: OpenAI) {}

  createThread(): Promise<Thread> {
    return this.openai.beta.threads.create();
  }

  addMessageToThread(threadId: string, messageText: string, role = 'user', fileId?: string): Promise<Message> {
    return this.openai.beta.threads.messages.create(threadId, <MessageCreateParams>{
      role,
      content: messageText,
      ...(fileId ? { attachments: [{ file_id: fileId, tools: [{ type: 'file_search' }] }] } : {}),
    });
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

  async getStructuredResponse(content: string) {
    return this.openai.beta.chat.completions.parse({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a helpful math tutor. Guide the user through the solution step by step.' },
        { role: 'user', content },
      ],
      response_format: zodResponseFormat(MathReasoning, 'math_reasoning'),
    });
  }

  async myNewFunction(threadId: string): Promise<any> {
    const run: Run = await this.openai.beta.threads.runs.create(threadId, {
      assistant_id: 'asst_cy1i5gvBLDpbKe8JRS10VxnL', // Replace with your Assistant ID
      instructions: `Return a JSON object with the fields: "question" (string) and "result" (number).`,
      tools: [
        {
          type: 'function',
          function: {
            name: 'format_response',
            description: 'Format the AI response as a JSON object.',
            parameters: {
              type: 'object',
              properties: {
                question: { type: 'string', description: "The user's question." },
                result: { type: 'number', description: 'The calculated or logical result.' },
              },
              required: ['question', 'result'],
            },
          },
        },
      ],
    });

    let runStatus;
    do {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2s before checking status
      runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
    } while (runStatus.status !== ASSISTANT_RUN_STATUSES.COMPLETED);
  }
}
