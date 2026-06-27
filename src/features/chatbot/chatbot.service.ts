import { BaseMessage, HumanMessage } from '@langchain/core/messages';
import { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import { ChatOpenAI } from '@langchain/openai';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { summarizationMiddleware } from 'langchain';
import { env } from 'node:process';
import { z } from 'zod';
import { DEFAULT_TIMEZONE, isProd } from '@core/config/main.config';
import { Logger } from '@core/utils';
import { CHAT_COMPLETIONS_MINI_MODEL } from '@services/openai/constants';
import { ToolCallbackOptions, UsageCallbackHandler, recordModelUsage } from '@shared/ai';
import { orchestrator } from './agent';
import { AiService, createAgentService } from './agent';
import { CHATBOT_CONFIG, CHATBOT_SUMMARY_PROMPT } from './chatbot.config';
import { ChatbotResponse, StructuredChatbotResponse } from './types';
import { formatAgentResponse } from './utils';

export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private readonly model: ChatOpenAI;
  private readonly aiService: AiService;

  constructor(checkpointer?: BaseCheckpointSaver) {
    // streamUsage keeps token usage_metadata flowing on the streaming path (item #3) so
    // streamed turns are still metered by the UsageCallbackHandler.
    this.model = new ChatOpenAI({ model: CHAT_COMPLETIONS_MINI_MODEL, temperature: 0.2, apiKey: env.OPENAI_API_KEY, streamUsage: true });

    // Dedicated, non-streaming model for the summarization middleware. disableStreaming makes
    // it use invoke() internally, so its tokens never appear in streamMode:"messages" output —
    // otherwise summary tokens would leak into the user's streamed reply (item #6).
    const summarizationModel = new ChatOpenAI({ model: CHAT_COMPLETIONS_MINI_MODEL, temperature: 0.2, apiKey: env.OPENAI_API_KEY, disableStreaming: true });

    const toolCallbackOptions: ToolCallbackOptions = {
      enableLogging: false,
      // onToolStart: async (toolName, input) => {
      //   this.logger.log(`🔧 Tool Start: ${toolName}, Parameters: ${JSON.stringify(input)}`);
      // },
      // onToolEnd: async (toolName, output, metadata) => {
      //   this.logger.log(`✅ Tool End: ${toolName} (${metadata?.duration}ms)`);
      // },
      onToolError: async (toolName, error, metadata) => {
        this.logger.error(`❌ Tool Error: ${toolName} (${metadata?.duration}ms), Error: ${error.message}`);
      },
    };

    // Compresses older turns into a running summary once the thread grows past the trigger,
    // keeping recent messages verbatim. Replaces the old drop-oldest truncation, and the
    // summarized state is persisted by the checkpointer (item #1) instead of being deleted.
    const summarization = summarizationMiddleware({
      model: summarizationModel,
      trigger: { messages: CHATBOT_CONFIG.summarization.triggerMessages },
      keep: { messages: CHATBOT_CONFIG.summarization.keepMessages },
      summaryPrompt: CHATBOT_SUMMARY_PROMPT,
    });

    this.aiService = createAgentService(orchestrator(), { model: this.model, checkpointer, middleware: [summarization], toolCallbackOptions });
  }

  async processMessage(message: string, chatId: number): Promise<ChatbotResponse>;
  async processMessage<T extends z.ZodTypeAny>(message: string, chatId: number, responseSchema: T): Promise<StructuredChatbotResponse<T>>;
  async processMessage<T extends z.ZodTypeAny>(message: string, chatId: number, responseSchema?: T): Promise<ChatbotResponse | StructuredChatbotResponse<T>> {
    try {
      const { contextualMessage, threadId } = this.buildContext(message, chatId);

      const usageHandler = CHATBOT_CONFIG.usageTracking ? new UsageCallbackHandler() : undefined;
      const startedAt = Date.now();
      const result = await this.aiService.invoke(contextualMessage, { threadId, callbacks: usageHandler ? [usageHandler] : undefined });
      if (usageHandler) {
        recordModelUsage({ source: 'chatbot', chatId, handler: usageHandler, durationMs: Date.now() - startedAt });
      }

      const agentResponse = formatAgentResponse(result);

      if (!responseSchema) {
        return agentResponse;
      }

      const structuredModel = this.model.withStructuredOutput(responseSchema);
      const structured = await structuredModel.invoke([new HumanMessage(agentResponse.message)]);
      return { response: agentResponse, structured: structured as z.infer<T> };
    } catch (err) {
      this.logger.error(`Error processing message for user ${chatId}: ${err}`);
      if (responseSchema) {
        throw err;
      }
      return {
        message: 'Sorry, I encountered an error processing your request. Please try again.',
        toolResults: [],
        timestamp: new Date().toISOString(),
      };
    }
  }

  async streamMessage(message: string, chatId: number, onToken: (fullText: string) => void | Promise<void>): Promise<string> {
    const { contextualMessage, threadId } = this.buildContext(message, chatId);

    const usageHandler = CHATBOT_CONFIG.usageTracking ? new UsageCallbackHandler() : undefined;
    const startedAt = Date.now();
    let accumulated = '';

    const stream = await this.aiService.stream(contextualMessage, {
      threadId,
      callbacks: usageHandler ? [usageHandler] : undefined,
      streamMode: 'messages',
    });

    // In "messages" mode each chunk is a [BaseMessage, metadata] tuple. We surface only the
    // final answer's tokens: AI-message content chunks. Tool messages and the (empty-content)
    // tool-call planning chunks are skipped; the summarization model is non-streaming so its
    // tokens never reach here.
    for await (const [chunk] of stream as AsyncIterable<[BaseMessage, Record<string, unknown>]>) {
      const token = extractAiTokenContent(chunk);
      if (!token) {
        continue;
      }
      accumulated += token;
      await onToken(accumulated);
    }

    if (usageHandler) {
      recordModelUsage({ source: 'chatbot', chatId, handler: usageHandler, durationMs: Date.now() - startedAt });
    }

    return accumulated;
  }

  private buildContext(message: string, chatId: number): { contextualMessage: string; threadId: string } {
    const formattedTime = format(toZonedTime(new Date(), DEFAULT_TIMEZONE), "yyyy-MM-dd'T'HH:mm:ss");
    const contextualMessage = `[Context: User ID: ${chatId}, Time: ${formattedTime} (${DEFAULT_TIMEZONE})]\n\n${message}`;
    const threadId = isProd ? chatId.toString() : `dev-${chatId.toString()}`;
    return { contextualMessage, threadId };
  }
}

function extractAiTokenContent(chunk: BaseMessage): string {
  if (typeof chunk?.getType !== 'function' || chunk.getType() !== 'ai') {
    return '';
  }
  const content = chunk.content;
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content.map((part) => (typeof part === 'string' ? part : typeof (part as { text?: unknown }).text === 'string' ? (part as { text: string }).text : '')).join('');
  }
  return '';
}
