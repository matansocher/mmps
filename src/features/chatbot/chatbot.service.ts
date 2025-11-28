import { ChatAnthropic } from '@langchain/anthropic';
// import { ChatOpenAI } from '@langchain/openai';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { env } from 'node:process';
import { DEFAULT_TIMEZONE, isProd } from '@core/config/main.config';
import { Logger } from '@core/utils';
import { ANTHROPIC_OPUS_MODEL } from '@services/anthropic/constants';
// import { CHAT_COMPLETIONS_MODEL } from '@services/openai';
import { ToolCallbackOptions } from '@shared/ai';
import { agent } from './agent';
import { AiService, createAgentService } from './agent';
import { ChatbotResponse } from './types';
import { formatAgentResponse } from './utils';

export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private readonly aiService: AiService;

  constructor() {
    const model = new ChatAnthropic({ model: ANTHROPIC_OPUS_MODEL, temperature: 0.2, apiKey: env.ANTHROPIC_API_KEY });
    // const model = new ChatOpenAI({ model: CHAT_COMPLETIONS_MODEL, temperature: 0.2, apiKey: env.OPENAI_API_KEY });

    const toolCallbackOptions: ToolCallbackOptions = {
      enableLogging: false,
      onToolStart: async (toolName, input) => {
        this.logger.log(`🔧 Tool Start: ${toolName}, Parameters: ${JSON.stringify(input)}`);
      },
      onToolEnd: async (toolName, output, metadata) => {
        this.logger.log(`✅ Tool End: ${toolName} (${metadata?.duration}ms)`);
      },
      onToolError: async (toolName, error, metadata) => {
        this.logger.error(`❌ Tool Error: ${toolName} (${metadata?.duration}ms), Error: ${error.message}`);
      },
    };

    this.aiService = createAgentService(agent(), { model, toolCallbackOptions });
  }

  async processMessage(message: string, chatId: number): Promise<ChatbotResponse> {
    try {
      const formattedTime = format(toZonedTime(new Date(), DEFAULT_TIMEZONE), "yyyy-MM-dd'T'HH:mm:ss");
      const contextualMessage = `[Context: User ID: ${chatId}, Time: ${formattedTime} (${DEFAULT_TIMEZONE})]\n\n${message}`;
      const threadId = isProd ? chatId.toString() : `dev-${chatId.toString()}`;
      const result = await this.aiService.invoke(contextualMessage, { threadId });
      return formatAgentResponse(result);
    } catch (err) {
      this.logger.error(`Error processing message for user ${chatId}: ${err}`);
      return {
        message: 'I apologize, but I encountered an error while processing your request. Please try again.',
        toolResults: [],
        timestamp: new Date().toISOString(),
      };
    }
  }
}
