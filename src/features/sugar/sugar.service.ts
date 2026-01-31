import { AIMessage, ToolMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { env } from 'node:process';
import { DEFAULT_TIMEZONE, isProd } from '@core/config/main.config';
import { Logger } from '@core/utils';
import { CHAT_COMPLETIONS_MINI_MODEL } from '@services/openai/constants';
import { ToolCallbackOptions } from '@shared/ai';
import { agent, AiService, createAgentService } from './agent';
import { SugarResponse } from './types';

export class SugarService {
  private readonly logger = new Logger(SugarService.name);
  private readonly aiService: AiService;

  constructor() {
    const model = new ChatOpenAI({ model: CHAT_COMPLETIONS_MINI_MODEL, temperature: 0.2, apiKey: env.OPENAI_API_KEY });

    const toolCallbackOptions: ToolCallbackOptions = {
      enableLogging: false,
      onToolError: async (toolName, error, metadata) => {
        this.logger.error(`Tool Error: ${toolName} (${metadata?.duration}ms), Error: ${error.message}`);
      },
    };

    this.aiService = createAgentService(agent(), { model, toolCallbackOptions });
  }

  async processMessage(message: string, chatId: number): Promise<SugarResponse> {
    try {
      const formattedTime = format(toZonedTime(new Date(), DEFAULT_TIMEZONE), "yyyy-MM-dd'T'HH:mm:ss");
      const contextualMessage = `[Context: User ID: ${chatId}, Time: ${formattedTime} (${DEFAULT_TIMEZONE})]\n\n${message}`;
      const threadId = isProd ? `sugar-${chatId}` : `dev-sugar-${chatId}`;
      const result = await this.aiService.invoke(contextualMessage, { threadId });
      return this.formatAgentResponse(result);
    } catch (err) {
      this.logger.error(`Error processing message for user ${chatId}: ${err}`);
      return {
        message: 'Sorry, I encountered an error processing your request. Please try again.',
        toolResults: [],
        timestamp: new Date().toISOString(),
      };
    }
  }

  private formatAgentResponse(result: any): SugarResponse {
    const messages = result.messages || [];
    const toolResults: { toolName: string; data: any; error?: string }[] = [];

    for (const msg of messages) {
      if (msg instanceof ToolMessage) {
        const toolName = msg.name || 'unknown';
        try {
          const data = JSON.parse(msg.content as string);
          if (data.error) {
            toolResults.push({ toolName, data: null, error: data.error });
          } else {
            toolResults.push({ toolName, data });
          }
        } catch {
          toolResults.push({ toolName, data: msg.content });
        }
      }
    }

    const lastAiMessage = [...messages].reverse().find((msg) => msg instanceof AIMessage);
    const responseText = lastAiMessage?.content || 'I processed your request but have no response to share.';

    return {
      message: typeof responseText === 'string' ? responseText : JSON.stringify(responseText),
      toolResults,
      timestamp: new Date().toISOString(),
    };
  }
}
