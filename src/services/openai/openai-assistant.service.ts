import fs from 'fs';
import { get as _get } from 'lodash';
import { OpenAI } from 'openai';
import { FileObject } from 'openai/resources';
import { AssistantTool } from 'openai/resources/beta/assistants';
import { Message, MessageCreateParams, Run, Thread } from 'openai/resources/beta/threads';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ASSISTANT_RUN_STATUSES, ERROR_STATUSES, OPENAI_CLIENT_TOKEN } from './openai.config';

async function fetchStockInfoFromAPI(ticker) {
  // Simulate getting stock data (you should replace this with a real API)
  return {
    company: 'Tesla, Inc.',
    ticker: ticker,
    current_price: 750.25,
    market_cap: '750B',
  };
}

@Injectable()
export class OpenaiAssistantService {
  private readonly logger = new Logger(OpenaiAssistantService.name);

  constructor(@Inject(OPENAI_CLIENT_TOKEN) private readonly openai: OpenAI) {}

  createThread(): Promise<Thread> {
    return this.openai.beta.threads.create();
  }

  addMessageToThread(threadId: string, content: string, role = 'user', fileId?: string): Promise<Message> {
    return this.openai.beta.threads.messages.create(threadId, <MessageCreateParams>{
      role,
      content,
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

  async getStockFromAssistant(assistantId: string, threadId: string): Promise<any> {
    let run: Run = await this.openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
      instructions: `Provide stock information in a structured JSON format. Only return 'company', 'ticker', 'current_price', and 'market_cap'.`,
      tools: [
        {
          type: 'function',
          function: {
            name: 'get_stock_info',
            description: 'Retrieve stock market information',
            parameters: {
              type: 'object',
              properties: {
                company: { type: 'string', description: 'Company name' },
                ticker: { type: 'string', description: 'Stock ticker' },
                current_price: { type: 'number', description: 'Stock price' },
                market_cap: { type: 'string', description: 'Market capitalization' },
              },
              required: ['company', 'ticker', 'current_price'],
            },
          },
        },
      ],
    });

    while (true) {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2s before checking status
      run = await this.openai.beta.threads.runs.retrieve(threadId, run.id);

      if (run.status === ASSISTANT_RUN_STATUSES.COMPLETED) {
        break; // Assistant finished
      }
      if (run.status === ASSISTANT_RUN_STATUSES.REQUIRES_ACTION) {
        const toolCalls = run.required_action.submit_tool_outputs.tool_calls;
        const tool = toolCalls.find((t) => t.function.name === 'get_stock_info');
        if (!tool) {
          return undefined;
        }
        const stockData = await fetchStockInfoFromAPI('TSLA');
        await this.openai.beta.threads.runs.submitToolOutputs(threadId, run.id, {
          tool_outputs: [
            {
              tool_call_id: tool.id,
              output: JSON.stringify(stockData),
            },
          ],
        });
      }
    }
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
}
