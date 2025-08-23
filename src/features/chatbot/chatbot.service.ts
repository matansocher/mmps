import { ChatOpenAI } from '@langchain/openai';
import { env } from 'node:process';
import { Injectable, Logger } from '@nestjs/common';
import { agent } from './agent';
import { AiService, createAgent } from './agent';
import { formatAgentResponse } from './utils';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private readonly aiService: AiService;

  constructor() {
    const llm = new ChatOpenAI({
      modelName: 'gpt-4',
      temperature: 0.7,
      openAIApiKey: env.OPENAI_API_KEY,
    });
    this.aiService = createAgent(agent(), { llm });
  }

  async processMessage(message: string, chatId: string): Promise<string> {
    try {
      const systemContext = `User ID: ${chatId}. Current time: ${new Date().toISOString()}.`;

      const result = await this.aiService.invoke(message, { threadId: chatId, system: systemContext });

      const response = formatAgentResponse(result, chatId);
      return response.message;
    } catch (error) {
      this.logger.error(`Error processing message for user ${chatId}:`, error);
      return 'I apologize, but I encountered an error while processing your request. Please try again.';
    }
  }
}
