import { LoggerService } from '@core/logger';
import { TelegramClient } from 'telegram';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { NewsMongoThreadService, ThreadModel } from '@core/mongo/news-mongo';
import { OpenaiAssistantService, OpenaiService } from '@services/openai';
import {
  IChannelDetails,
  ITelegramMessage,
  TELEGRAM_CLIENT_TOKEN,
  TelegramClientService
} from '@services/telegram-client';
import { DAILY_PHOTO_PROMPT, NEWS_ASSISTANT_ID, TELEGRAM_CHANNEL_IDS_TO_LISTEN } from './news.config';

@Injectable()
export class NewsService implements OnModuleInit {
  channelDetails: IChannelDetails[];

  constructor(
    private readonly logger: LoggerService,
    private readonly telegramClientService: TelegramClientService,
    private readonly openaiService: OpenaiService,
    private readonly openaiAssistantService: OpenaiAssistantService,
    private readonly newsMongoThreadService: NewsMongoThreadService,
    @Inject(TELEGRAM_CLIENT_TOKEN) private readonly telegramClient: TelegramClient,
  ) {}

  onModuleInit() {
    const listenerOptions = { channelIds: TELEGRAM_CHANNEL_IDS_TO_LISTEN };
    this.telegramClientService.listenToMessages(this.telegramClient, listenerOptions, this.handleMessage.bind(this));
  }

  async handleMessage(messageData: ITelegramMessage, channelDetails: IChannelDetails) {
    this.logger.info(this.handleMessage.name, `channelDetails: ${channelDetails.title}`);
    this.logger.info(this.handleMessage.name, `messageData: ${messageData.text}`);
    const thread = await this.getCurrentThread();
    this.openaiAssistantService.addMessageToThread(thread.threadId, messageData.text);
  }

  // for testing purposes
  // async handleFakeMessage(message: string) {
  //   const threadModel = await this.getCurrentThread();
  //   this.openaiAssistantService.addMessageToThread(threadModel.threadId, message);
  // }

  async refreshChannelsDetails(): Promise<void> {
    const promises = TELEGRAM_CHANNEL_IDS_TO_LISTEN.map(async (channelId) => {
      return this.telegramClientService.getChannelDetails(this.telegramClient, channelId);
    });
    const results = await Promise.all(promises);
    this.channelDetails = results;
  }

  getChannelsDetails(): IChannelDetails[] {
    return this.channelDetails;
  }

  async getCurrentThread(): Promise<ThreadModel> {
    const thread = await this.newsMongoThreadService.getCurrentThread();
    if (thread) {
      const isThreadTooOld = new Date(thread.createdAt) < new Date(new Date().setHours(0, 0, 0, 0));
      if (!isThreadTooOld) {
        return thread;
      }
    }
    const newThreadId = await this.openaiAssistantService.createThread();
    const newThread = await this.newsMongoThreadService.saveThread(newThreadId);
    return newThread as unknown as ThreadModel;
  }

  async getDailySummary(): Promise<string> {
    const thread = await this.getCurrentThread();
    const threadRun = await this.openaiAssistantService.runThread(NEWS_ASSISTANT_ID, thread.threadId);
    return this.openaiAssistantService.getThreadResponse(threadRun.thread_id);
  }

  getDailyPhoto(summaryContent: string): Promise<string> {
    return this.openaiService.createImage(`${DAILY_PHOTO_PROMPT}\n\n${summaryContent}`);
  }
}
