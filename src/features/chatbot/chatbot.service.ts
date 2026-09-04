import { HumanMessage } from '@langchain/core/messages';
import { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import { ChatOpenAI } from '@langchain/openai';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { summarizationMiddleware } from 'langchain';
import { randomUUID } from 'node:crypto';
import { env } from 'node:process';
import { z } from 'zod';
import { DEFAULT_TIMEZONE, isProd } from '@core/config/main.config';
import { getErrorMessage, Logger } from '@core/utils';
import { CHAT_COMPLETIONS_MINI_MODEL } from '@services/openai/constants';
import { recordModelUsage, ToolCallbackOptions, UsageCallbackHandler } from '@shared/ai';
import { agent } from './agent';
import { AiService, createAgentService } from './agent';
import { CHATBOT_CONFIG, CHATBOT_SUMMARY_PROMPT } from './chatbot.config';
import { ChatbotResponse, ProcessMessageOptions, StructuredChatbotResponse } from './types';
import { buildStructuredInstruction, formatAgentResponse, parseStructuredResponse } from './utils';

function isProcessMessageOptions(value: unknown): value is ProcessMessageOptions {
  return typeof value === 'object' && value !== null && !('_def' in value);
}

export class ChatbotService {
  private readonly logger = new Logger('chatbot:service');
  private readonly model: ChatOpenAI;
  private readonly aiService: AiService;

  constructor(checkpointer?: BaseCheckpointSaver) {
    this.model = new ChatOpenAI({ model: CHAT_COMPLETIONS_MINI_MODEL, temperature: 0.2, apiKey: env.OPENAI_API_KEY, timeout: 120_000 });

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
      model: this.model,
      trigger: { messages: CHATBOT_CONFIG.summarization.triggerMessages },
      keep: { messages: CHATBOT_CONFIG.summarization.keepMessages },
      summaryPrompt: CHATBOT_SUMMARY_PROMPT,
    });

    this.aiService = createAgentService(agent(), { model: this.model, checkpointer, middleware: [summarization], toolCallbackOptions });
  }

  async processMessage(message: string, chatId: number, options?: ProcessMessageOptions): Promise<ChatbotResponse>;
  async processMessage<T extends z.ZodTypeAny>(message: string, chatId: number, responseSchema: T, options?: ProcessMessageOptions): Promise<StructuredChatbotResponse<T>>;
  async processMessage<T extends z.ZodTypeAny>(
    message: string,
    chatId: number,
    responseSchemaOrOptions?: T | ProcessMessageOptions,
    maybeOptions?: ProcessMessageOptions,
  ): Promise<ChatbotResponse | StructuredChatbotResponse<T>> {
    const responseSchema = isProcessMessageOptions(responseSchemaOrOptions) ? undefined : responseSchemaOrOptions;
    const options = isProcessMessageOptions(responseSchemaOrOptions) ? responseSchemaOrOptions : maybeOptions;
    try {
      const formattedTime = format(toZonedTime(new Date(), DEFAULT_TIMEZONE), "yyyy-MM-dd'T'HH:mm:ss");
      // When a schema is requested, ask the agent to carry the structured value on a sentinel line of
      // its final turn, so we parse it in code instead of paying for a second LLM call (item #4).
      const structuredInstruction = responseSchema ? buildStructuredInstruction(responseSchema) : '';
      const contextualMessage = `[Context: User ID: ${chatId}, Time: ${formattedTime} (${DEFAULT_TIMEZONE})]\n\n${message}${structuredInstruction}`;
      const threadId = isProd ? chatId.toString() : `dev-${chatId.toString()}`;
      const humanMessageId = randomUUID();

      const usageHandler = CHATBOT_CONFIG.usageTracking ? new UsageCallbackHandler() : undefined;
      const startedAt = Date.now();
      // Recorded in `finally` so the turn's usage is captured even if a later step throws.
      try {
        const result = await this.aiService.invoke(contextualMessage, { threadId, humanMessageId, images: options?.images, callbacks: usageHandler ? [usageHandler] : undefined });

        // Swap the verbose scheduler prompt in the durable thread for a short marker (item #1). The
        // result stays on the user's thread so the "try again" recovery flow keeps working.
        if (options?.ephemeral) {
          await this.aiService.replaceHumanMessage(humanMessageId, options.ephemeral.marker, { threadId }).catch((err) => {
            this.logger.error(`Failed to replace scheduler prompt with marker for user ${chatId}: ${getErrorMessage(err)}`);
          });
        }

        const agentResponse = formatAgentResponse(result);

        if (!responseSchema) {
          return agentResponse;
        }

        const { message: cleanMessage, structured } = parseStructuredResponse(agentResponse.message, responseSchema);
        if (structured !== null) {
          return { response: { ...agentResponse, message: cleanMessage }, structured };
        }

        // Fallback only if the agent omitted or malformed the sentinel line: a cheap extraction call
        // over just the final text (not the whole thread) so callers still get a valid value.
        this.logger.warn(`Structured sentinel missing for user ${chatId}; falling back to extraction call`);
        const structuredModel = this.model.withStructuredOutput(responseSchema);
        const extracted = await structuredModel.invoke([new HumanMessage(cleanMessage)], { callbacks: usageHandler ? [usageHandler] : undefined });
        return { response: { ...agentResponse, message: cleanMessage }, structured: extracted as z.infer<T> };
      } finally {
        if (usageHandler) {
          recordModelUsage({ source: 'chatbot', chatId, handler: usageHandler, durationMs: Date.now() - startedAt });
        }
      }
    } catch (err) {
      this.logger.error(`Error processing message for user ${chatId}: ${getErrorMessage(err)}`);
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
}
