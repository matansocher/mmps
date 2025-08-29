import { ChatAnthropic } from '@langchain/anthropic';
import { env } from 'node:process';
import { Injectable, Logger } from '@nestjs/common';
import { ANTHROPIC_OPUS_MODEL } from '@services/anthropic/constants';
import { agent } from './agent';
import { AiService, createAgent } from './agent';
import { ChatbotResponse } from './types';
import { formatAgentResponse } from './utils';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private readonly aiService: AiService;

  constructor() {
    const llm = new ChatAnthropic({
      modelName: ANTHROPIC_OPUS_MODEL,
      temperature: 0.7,
      apiKey: env.ANTHROPIC_API_KEY,
    });
    this.aiService = createAgent(agent(), { llm });
  }

  async processMessage(message: string, chatId: string): Promise<ChatbotResponse> {
    try {
      const systemContext = `User ID: ${chatId}. Current time: ${new Date().toISOString()}.`;
      const result = await this.aiService.invoke(message, { threadId: chatId, system: systemContext });
      return formatAgentResponse(result, chatId);
    } catch (error) {
      this.logger.error(`Error processing message for user ${chatId}:`, error);
      return {
        message: 'I apologize, but I encountered an error while processing your request. Please try again.',
        toolResults: [],
        timestamp: new Date().toISOString(),
      };
    }
  }
}
