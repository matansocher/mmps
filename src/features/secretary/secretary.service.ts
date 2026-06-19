import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { env } from 'node:process';
import { isProd } from '@core/config/main.config';
import { Logger } from '@core/utils';
import { AiService, createAgentService } from '@features/chatbot/agent';
import { CHAT_COMPLETIONS_MINI_MODEL } from '@services/openai/constants';
import { calendarTool } from '@shared/ai';
import { SECRETARY_PROMPT } from './secretary.config';

export class SecretaryService {
  private readonly logger = new Logger(SecretaryService.name);
  private readonly aiService: AiService;

  constructor() {
    const model = new ChatOpenAI({ model: CHAT_COMPLETIONS_MINI_MODEL, temperature: 0.5, apiKey: env.OPENAI_API_KEY });
    this.aiService = createAgentService({ name: 'SECRETARY', prompt: SECRETARY_PROMPT, tools: [calendarTool] }, { model });
  }

  private threadId(chatId: number): string {
    return isProd ? chatId.toString() : `dev-${chatId.toString()}`;
  }

  // Record an incoming message from the other person into the conversation memory.
  async recordIncoming(text: string, chatId: number): Promise<void> {
    await this.aiService.appendMessages([new HumanMessage(text)], { threadId: this.threadId(chatId) });
  }

  // Record a message the account owner sent themselves into the conversation memory.
  async recordOwnerReply(text: string, chatId: number): Promise<void> {
    await this.aiService.appendMessages([new AIMessage(text)], { threadId: this.threadId(chatId) });
  }

  // Generate a reply based on the full recorded conversation so far.
  async generateReply(chatId: number): Promise<string> {
    try {
      const result = await this.aiService.respond({ threadId: this.threadId(chatId) });
      const messages = (result as any).messages;
      const lastMessage = messages[messages.length - 1];
      return lastMessage.content as string;
    } catch (err) {
      this.logger.error(`Error generating reply for chat ${chatId}: ${err}`);
      return '';
    }
  }
}
