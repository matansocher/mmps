import { MemorySaver } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { modelCallLimitMiddleware, toolCallLimitMiddleware } from 'langchain';
import { env } from 'node:process';
import { DEFAULT_TIMEZONE, isProd } from '@core/config/main.config';
import { getErrorMessage, Logger } from '@core/utils';
import { AiService, createAgentService } from '@features/chatbot/agent';
import type { ToolResult } from '@features/chatbot/types';
import { formatAgentResponse } from '@features/chatbot/utils';
import { buildRailSearchUrl, generateRouteImage, RAIL_STATIONS, searchTrains } from '@services/israel-rail';
import { CHAT_MODEL, CHAT_MODEL_REASONING_EFFORT } from '@services/openai/constants';
import { benGurionFlightTool, israelRailTool, lightRailTool, recordModelUsage, UsageCallbackHandler, webSearchTool } from '@shared/ai';
import type { ImageLanguage } from '@shared/image-card';
import { MESSAGES, RAIL_AGENT_PROMPT, RAIL_LIMITS } from './rail.config';
import type { RailRouteContext } from './rail.utils';

export type RailAgentReply = {
  readonly message: string;
  readonly toolResults: ToolResult[];
};

export type RailRouteResult = {
  readonly context: RailRouteContext;
  readonly railWebsiteUrl: string;
  readonly image: Buffer | null;
};

export class RailService {
  private readonly logger = new Logger('rail:service');
  private readonly aiService: AiService;
  private readonly checkpointer = new MemorySaver();
  private readonly lastActiveAt = new Map<string, number>();

  constructor() {
    const model = new ChatOpenAI({ model: CHAT_MODEL, reasoning: { effort: CHAT_MODEL_REASONING_EFFORT }, temperature: 0.2, apiKey: env.OPENAI_API_KEY, timeout: 120_000 });
    const middleware = [
      modelCallLimitMiddleware({ runLimit: RAIL_LIMITS.modelCallLimitPerRun, exitBehavior: 'end' }),
      toolCallLimitMiddleware({ runLimit: RAIL_LIMITS.toolCallLimitPerRun, exitBehavior: 'continue' }),
      toolCallLimitMiddleware({ toolName: webSearchTool.name, runLimit: RAIL_LIMITS.webSearchCallLimitPerRun, exitBehavior: 'continue' }),
    ];
    this.aiService = createAgentService(
      { name: 'RAIL', prompt: RAIL_AGENT_PROMPT, tools: [israelRailTool, lightRailTool, benGurionFlightTool, webSearchTool] },
      { model, checkpointer: this.checkpointer, middleware },
    );
  }

  // The bot is public, so in-memory conversations are dropped after a period of inactivity to keep memory bounded.
  async pruneIdleConversations(): Promise<void> {
    const now = Date.now();
    for (const [threadId, lastActive] of this.lastActiveAt) {
      if (now - lastActive < RAIL_LIMITS.conversationIdleMs) continue;
      this.lastActiveAt.delete(threadId);
      await this.checkpointer.deleteThread(threadId).catch((err) => this.logger.warn(`Failed to delete thread ${threadId}: ${getErrorMessage(err)}`));
    }
  }

  async processMessage(message: string, chatId: number, language: ImageLanguage): Promise<RailAgentReply> {
    try {
      const formattedTime = format(toZonedTime(new Date(), DEFAULT_TIMEZONE), "yyyy-MM-dd'T'HH:mm:ss");
      const system = `Current time: ${formattedTime} (${DEFAULT_TIMEZONE})`;
      const threadId = isProd ? chatId.toString() : `dev-${chatId.toString()}`;
      await this.pruneIdleConversations();
      this.lastActiveAt.set(threadId, Date.now());
      const usageHandler = new UsageCallbackHandler();
      const startedAt = Date.now();
      const result = await this.aiService.invoke(message, { threadId, system, callbacks: [usageHandler] });
      recordModelUsage({ source: 'rail', chatId, handler: usageHandler, durationMs: Date.now() - startedAt });
      const { message: reply, toolResults } = formatAgentResponse(result);
      return { message: reply || MESSAGES.error[language], toolResults };
    } catch (err) {
      this.logger.error(`processMessage failed: ${getErrorMessage(err)}`);
      return { message: MESSAGES.error[language], toolResults: [] };
    }
  }

  async searchRoute(fromStationId: number, toStationId: number, date: string, time: string, language: ImageLanguage): Promise<RailRouteResult | null> {
    const from = RAIL_STATIONS.find((station) => station.id === fromStationId);
    const to = RAIL_STATIONS.find((station) => station.id === toStationId);
    if (!from || !to) return null;

    const { travels } = await searchTrains({ fromStationId, toStationId, date, hour: time, limit: 5 });
    const context: RailRouteContext = { from, to, trains: travels, searchedFrom: `${date} ${time}` };
    const railWebsiteUrl = buildRailSearchUrl({ fromStationId, toStationId, date, time });
    const image = travels.length ? generateRouteImage(travels, language) : null;
    return { context, railWebsiteUrl, image };
  }
}
