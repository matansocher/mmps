import { HumanMessage } from '@langchain/core/messages';
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
import { ToolCallbackOptions, UsageCallbackHandler } from '@shared/ai';
import { agent } from './agent';
import { AiService, createAgentService } from './agent';
import { CHATBOT_CONFIG, CHATBOT_SUMMARY_PROMPT } from './chatbot.config';
import { saveUsageRecord } from './mongo';
import { ChatbotResponse, StructuredChatbotResponse } from './types';
import { formatAgentResponse } from './utils';

export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private readonly model: ChatOpenAI;
  private readonly aiService: AiService;

  constructor(checkpointer?: BaseCheckpointSaver) {
    this.model = new ChatOpenAI({ model: CHAT_COMPLETIONS_MINI_MODEL, temperature: 0.2, apiKey: env.OPENAI_API_KEY });

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

  async processMessage(message: string, chatId: number): Promise<ChatbotResponse>;
  async processMessage<T extends z.ZodTypeAny>(message: string, chatId: number, responseSchema: T): Promise<StructuredChatbotResponse<T>>;
  async processMessage<T extends z.ZodTypeAny>(message: string, chatId: number, responseSchema?: T): Promise<ChatbotResponse | StructuredChatbotResponse<T>> {
    try {
      const formattedTime = format(toZonedTime(new Date(), DEFAULT_TIMEZONE), "yyyy-MM-dd'T'HH:mm:ss");
      const contextualMessage = `[Context: User ID: ${chatId}, Time: ${formattedTime} (${DEFAULT_TIMEZONE})]\n\n${message}`;
      const threadId = isProd ? chatId.toString() : `dev-${chatId.toString()}`;

      const usageHandler = CHATBOT_CONFIG.usageTracking ? new UsageCallbackHandler() : undefined;
      const startedAt = Date.now();
      const result = await this.aiService.invoke(contextualMessage, { threadId, callbacks: usageHandler ? [usageHandler] : undefined });
      if (usageHandler) {
        this.recordUsage(chatId, usageHandler, Date.now() - startedAt);
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

  private recordUsage(chatId: number, handler: UsageCallbackHandler, durationMs: number): void {
    const usage = handler.summary();
    this.logger.log(
      `💰 usage chatId=${chatId} model=${usage.model} in=${usage.tokensIn} out=${usage.tokensOut} total=${usage.tokensTotal} cost=$${usage.cost.toFixed(6)} llmCalls=${usage.llmCalls} toolCalls=${usage.toolCalls} duration=${durationMs}ms`,
    );
    saveUsageRecord({
      chatId,
      model: usage.model,
      tokensIn: usage.tokensIn,
      tokensOut: usage.tokensOut,
      tokensTotal: usage.tokensTotal,
      cost: usage.cost,
      durationMs,
      llmCalls: usage.llmCalls,
      toolCalls: usage.toolCalls,
    }).catch((err) => this.logger.error(`Failed to persist usage record for ${chatId}: ${err}`));
  }
}
