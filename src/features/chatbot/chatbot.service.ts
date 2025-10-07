import { ChatAnthropic } from '@langchain/anthropic';
import { env } from 'node:process';
import { Injectable, Logger } from '@nestjs/common';
import { ANTHROPIC_OPUS_MODEL } from '@services/anthropic/constants';
import { agent } from './agent';
import { AiService, createAgent } from './agent';
import { ChatbotResponse } from './types';
import { formatAgentResponse } from './utils';
import { HoneypotMiddleware, SecurityMonitoringService } from './security';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private readonly aiService: AiService;
  private readonly honeypotMiddleware: HoneypotMiddleware;

  constructor() {
    const llm = new ChatAnthropic({
      modelName: ANTHROPIC_OPUS_MODEL,
      temperature: 0.2,
      apiKey: env.ANTHROPIC_API_KEY,
    });
    this.aiService = createAgent(agent(), { llm });

    // Initialize honeypot security system
    const securityMonitoring = new SecurityMonitoringService();
    this.honeypotMiddleware = new HoneypotMiddleware(securityMonitoring);
  }

  async processMessage(message: string, chatId: number): Promise<ChatbotResponse> {
    try {
      // Honeypot security analysis
      const securityAnalysis = this.honeypotMiddleware.analyzeMessage(message, chatId);

      // Block critical security threats
      if (securityAnalysis.shouldBlock) {
        this.logger.warn(`Blocked suspicious request from user ${chatId}`);
        return {
          message: 'I apologize, but I cannot process that request. Please rephrase your question.',
          toolResults: [],
          timestamp: new Date().toISOString(),
        };
      }

      // Check if this is a honeypot user (for testing)
      if (this.honeypotMiddleware.isHoneypotUser(chatId)) {
        const honeypotContext = this.honeypotMiddleware.getHoneypotUserContext(chatId);
        this.logger.warn(`Honeypot user ${chatId} accessed. Context: ${honeypotContext}`);
      }

      // Include context information in the user message instead of system message
      const contextualMessage = `[Context: User ID: ${chatId}, Time: ${new Date().toISOString()}]\n\n${message}`;
      const result = await this.aiService.invoke(contextualMessage, { threadId: chatId.toString() });

      // Analyze response for canary token leakage
      const responseAlerts = this.honeypotMiddleware.analyzeResponse(result.output, chatId, message);
      if (responseAlerts.length > 0) {
        this.logger.error(`Canary tokens detected in response for user ${chatId}`);
      }

      const response = formatAgentResponse(result, chatId);

      // Record tool usage for rate limiting
      response.toolResults.forEach((toolResult) => {
        this.honeypotMiddleware.recordToolUsage(chatId, toolResult.toolName);
      });

      return response;
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
