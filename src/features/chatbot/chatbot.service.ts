import { HumanMessage } from '@langchain/core/messages';
import { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import { ChatOpenAI } from '@langchain/openai';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { summarizationMiddleware, modelCallLimitMiddleware, toolCallLimitMiddleware } from 'langchain';
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
import { formatAgentResponse } from './utils';

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
    //
    // Bounded by tokens, not message counts: a single retained message can carry a base64 image
    // or a full transcript, so a message-only limit doesn't bound the context window or the size
    // of the MongoDB checkpoint document (16 MiB limit). The trigger array is OR'd — summarize
    // when the history exceeds the token budget OR the message-count fallback — and `keep` is
    // token-based so the retained tail fits a real budget.
    const summarization = summarizationMiddleware({
      model: this.model,
      trigger: [{ tokens: CHATBOT_CONFIG.summarization.triggerTokens }, { messages: CHATBOT_CONFIG.summarization.triggerMessages }],
      keep: { tokens: CHATBOT_CONFIG.summarization.keepTokens },
      summaryPrompt: CHATBOT_SUMMARY_PROMPT,
    });

    // Bounded turn: cap model requests and tool calls per run so a request timeout (which only
    // covers one model call) and recursionLimit (which only bounds graph steps) are not the sole
    // ceilings. Model limit ends the run gracefully; tool limit blocks further tool calls but lets
    // the model still produce an answer.
    const modelCallLimit = modelCallLimitMiddleware({ runLimit: CHATBOT_CONFIG.execution.modelCallLimitPerRun, exitBehavior: 'end' });
    const toolCallLimit = toolCallLimitMiddleware({ runLimit: CHATBOT_CONFIG.execution.toolCallLimitPerRun, exitBehavior: 'continue' });

    this.aiService = createAgentService(agent(), {
      model: this.model,
      checkpointer,
      middleware: [summarization, modelCallLimit, toolCallLimit],
      toolCallbackOptions,
    });
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
      const contextualMessage = `[Context: User ID: ${chatId}, Time: ${formattedTime} (${DEFAULT_TIMEZONE})]\n\n${message}`;
      const threadId = isProd ? chatId.toString() : `dev-${chatId.toString()}`;

      const usageHandler = CHATBOT_CONFIG.usageTracking ? new UsageCallbackHandler() : undefined;
      const startedAt = Date.now();
      // Single wall-clock deadline shared by the agent run and the follow-up structured-output call,
      // so the whole turn is bounded regardless of how many model/tool calls it makes.
      const signal = AbortSignal.timeout(CHATBOT_CONFIG.execution.turnTimeoutMs);
      // Recorded in `finally` so the turn's usage is captured even if a later step throws, and so
      // the follow-up structured-output call below is billed as part of the same turn.
      try {
        const result = await this.aiService.invoke(contextualMessage, { threadId, images: options?.images, signal, callbacks: usageHandler ? [usageHandler] : undefined });

        const agentResponse = formatAgentResponse(result);

        if (!responseSchema) {
          return agentResponse;
        }

        const structuredModel = this.model.withStructuredOutput(responseSchema);
        const structured = await structuredModel.invoke([new HumanMessage(agentResponse.message)], { signal, callbacks: usageHandler ? [usageHandler] : undefined });
        return { response: agentResponse, structured: structured as z.infer<T> };
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
