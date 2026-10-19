import { ChatOpenAI } from '@langchain/openai';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { env } from 'node:process';
import { DEFAULT_TIMEZONE, isProd } from '@core/config/main.config';
import { getErrorMessage, Logger } from '@core/utils';
import { AiService, createAgentService } from '@features/chatbot/agent';
import type { ToolResult } from '@features/chatbot/types';
import { formatAgentResponse } from '@features/chatbot/utils';
import { buildRailSearchUrl, generateRouteImage, RAIL_STATIONS, searchTrains } from '@services/israel-rail';
import { CHAT_MODEL, CHAT_MODEL_REASONING_EFFORT } from '@services/openai/constants';
import { israelRailTool, recordModelUsage, UsageCallbackHandler } from '@shared/ai';
import type { ImageLanguage } from '@shared/image-card';
import { RAIL_AGENT_PROMPT } from './rail.config';
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

const FALLBACK_MESSAGE = 'משהו השתבש, נסו שוב בעוד רגע 🙏';

export class RailService {
  private readonly logger = new Logger('rail:service');
  private readonly aiService: AiService;

  constructor() {
    const model = new ChatOpenAI({ model: CHAT_MODEL, reasoning: { effort: CHAT_MODEL_REASONING_EFFORT }, temperature: 0.2, apiKey: env.OPENAI_API_KEY, timeout: 120_000 });
    this.aiService = createAgentService({ name: 'RAIL', prompt: RAIL_AGENT_PROMPT, tools: [israelRailTool] }, { model });
  }

  async processMessage(message: string, chatId: number): Promise<RailAgentReply> {
    try {
      const formattedTime = format(toZonedTime(new Date(), DEFAULT_TIMEZONE), "yyyy-MM-dd'T'HH:mm:ss");
      const system = `Current time: ${formattedTime} (${DEFAULT_TIMEZONE})`;
      const threadId = isProd ? chatId.toString() : `dev-${chatId.toString()}`;
      const usageHandler = new UsageCallbackHandler();
      const startedAt = Date.now();
      const result = await this.aiService.invoke(message, { threadId, system, callbacks: [usageHandler] });
      recordModelUsage({ source: 'rail', chatId, handler: usageHandler, durationMs: Date.now() - startedAt });
      const { message: reply, toolResults } = formatAgentResponse(result);
      return { message: reply || FALLBACK_MESSAGE, toolResults };
    } catch (err) {
      this.logger.error(`processMessage failed: ${getErrorMessage(err)}`);
      return { message: FALLBACK_MESSAGE, toolResults: [] };
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
