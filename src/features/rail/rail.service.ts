import { AIMessage, HumanMessage } from '@langchain/core/messages';
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
import {
  buildRailSearchUrl,
  estimateTrainProgress,
  findRailStationsNearPoint,
  generateRouteImage,
  generateTrainMapImage,
  getTrainLine,
  RAIL_STATIONS,
  searchTrains,
  type TrainTravel,
} from '@services/israel-rail';
import { findLightRailDeparturesByDirection, findLightRailStationsNearPoint, findNearestLightRailStations, getLightRailTimetable } from '@services/light-rail';
import type { GeoPoint, LightRailDirectionDepartures, LightRailTimetable } from '@services/light-rail';
import { CHAT_MODEL, CHAT_MODEL_REASONING_EFFORT } from '@services/openai/constants';
import { israelRailTool, lightRailTool, railTripTool, recordModelUsage, UsageCallbackHandler, webSearchTool } from '@shared/ai';
import type { ImageLanguage } from '@shared/image-card';
import { MESSAGES, RAIL_AGENT_PROMPT, RAIL_LIMITS } from './rail.config';
import { buildLocationMemoryNote, formatTrainMapCaption } from './rail.utils';
import type { NearestStationsResult, RailRouteContext, RailSearchRequest } from './rail.utils';

// Beyond this straight-line distance the Red Line is irrelevant, so it's left out (and no walking route is requested).
const MAX_LIGHT_RAIL_DISTANCE_METERS = 3000;
const LIGHT_RAIL_DEPARTURES_PER_DIRECTION = 3;

export type RailAgentReply = {
  readonly message: string;
  readonly toolResults: ToolResult[];
};

export type RailRouteResult = {
  readonly context: RailRouteContext;
  readonly railWebsiteUrl: string;
  readonly image: Buffer | null;
};

const LANGUAGE_NAMES: Record<ImageLanguage, string> = { he: 'Hebrew', en: 'English' };

export type RailTrainMapResult = {
  readonly image: Buffer;
  readonly caption: string;
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
    this.aiService = createAgentService({ name: 'RAIL', prompt: RAIL_AGENT_PROMPT, tools: [israelRailTool, lightRailTool, railTripTool, webSearchTool] }, { model, checkpointer: this.checkpointer, middleware });
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

  private async touchThread(chatId: number): Promise<string> {
    const threadId = isProd ? chatId.toString() : `dev-${chatId.toString()}`;
    await this.pruneIdleConversations();
    this.lastActiveAt.set(threadId, Date.now());
    return threadId;
  }

  async findNearestStations(origin: GeoPoint): Promise<NearestStationsResult> {
    const [rail, lightRail] = await Promise.all([
      this.findNearestRailStation(origin).catch((err) => {
        this.logger.error(`Nearest rail station lookup failed: ${getErrorMessage(err)}`);
        return null;
      }),
      this.findNearestLightRailStop(origin).catch((err) => {
        this.logger.error(`Nearest light rail stop lookup failed: ${getErrorMessage(err)}`);
        return null;
      }),
    ]);
    return { origin, rail, lightRail };
  }

  private async findNearestRailStation(origin: GeoPoint): Promise<NearestStationsResult['rail']> {
    const { stations } = await findRailStationsNearPoint(origin);
    return stations[0] ?? null;
  }

  private async findNearestLightRailStop(origin: GeoPoint): Promise<NearestStationsResult['lightRail']> {
    const timetable = await getLightRailTimetable();
    const [closest] = findNearestLightRailStations(timetable.stations, origin, 1);
    if (!closest || closest.distanceMeters > MAX_LIGHT_RAIL_DISTANCE_METERS) return null;
    const { stations } = await findLightRailStationsNearPoint(timetable.stations, origin);
    const stop = stations[0];
    if (!stop) return null;
    return { stop, directions: this.getNextLightRailDepartures(timetable, stop.station.id) };
  }

  private getNextLightRailDepartures(timetable: LightRailTimetable, fromStationId: string): LightRailDirectionDepartures[] {
    try {
      const now = toZonedTime(new Date(), DEFAULT_TIMEZONE);
      return findLightRailDeparturesByDirection(timetable, { fromStationId, date: format(now, 'yyyy-MM-dd'), time: format(now, 'HH:mm'), limit: LIGHT_RAIL_DEPARTURES_PER_DIRECTION });
    } catch (err) {
      this.logger.error(`Light rail departures lookup failed: ${getErrorMessage(err)}`);
      return [];
    }
  }

  // Lets follow-up questions ("to Haifa") use the shared location as the origin without running the agent now.
  async rememberLocation(chatId: number, origin: GeoPoint, reply: string): Promise<void> {
    try {
      const threadId = await this.touchThread(chatId);
      await this.aiService.agent.graph.updateState({ configurable: { thread_id: threadId } }, { messages: [new HumanMessage(buildLocationMemoryNote(origin)), new AIMessage(reply)] });
    } catch (err) {
      this.logger.error(`rememberLocation failed: ${getErrorMessage(err)}`);
    }
  }

  // isLanguageSaved: the user picked a language in /actions, so it overrides replying in the message's language.
  async processMessage(message: string, chatId: number, language: ImageLanguage, isLanguageSaved = false): Promise<RailAgentReply> {
    try {
      const formattedTime = format(toZonedTime(new Date(), DEFAULT_TIMEZONE), "yyyy-MM-dd'T'HH:mm:ss");
      const languageRule = isLanguageSaved ? `\nThe user chose to always get replies in ${LANGUAGE_NAMES[language]} - reply in ${LANGUAGE_NAMES[language]} regardless of the message language.` : '';
      const system = `Current time: ${formattedTime} (${DEFAULT_TIMEZONE})${languageRule}`;
      const threadId = await this.touchThread(chatId);
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

  // The search results are cached briefly, so tapping a train's stops button right after a search does not hit the rail API again.
  async findTrain(fromStationId: number, toStationId: number, date: string, departureTime: string): Promise<TrainTravel | null> {
    const { travels } = await searchTrains({ fromStationId, toStationId, date, hour: departureTime, limit: 1 });
    return travels.find((travel) => travel.date === date && travel.departureTime === departureTime) ?? null;
  }

  async getTrainMap({ fromStationId, toStationId, date, time, language, trainNumber }: RailSearchRequest): Promise<RailTrainMapResult | null> {
    const line = await getTrainLine({ fromStationId, toStationId, date, hour: time, trainNumber });
    if (!line?.stops.length) return null;
    const now = new Date();
    const progress = estimateTrainProgress(line, now);
    const updatedAt = format(toZonedTime(now, DEFAULT_TIMEZONE), 'HH:mm');
    return { image: generateTrainMapImage(line, progress, language, updatedAt), caption: formatTrainMapCaption(line, progress, language) };
  }
}
