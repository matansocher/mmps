import { LoggerService } from '@core/logger';
import { UtilsService } from '@core/utils';
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
    private readonly utilsService: UtilsService,
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
    try {
      this.logger.info(this.handleMessage.name, `handleMessage: ${channelDetails.title} - ${messageData.text}`);
      const thread = await this.getCurrentThread();
      await this.openaiAssistantService.addMessageToThread(thread.threadId, messageData.text);
    } catch (err) {
      this.logger.error(this.refreshChannelsDetails.name, `err: ${this.utilsService.getErrorMessage(err)}`);
    }
  }

  // for testing purposes
  // async handleFakeMessage(message: string) {
  //   const threadModel = await this.getCurrentThread();
  //   this.openaiAssistantService.addMessageToThread(threadModel.threadId, message);
  // }

  async refreshChannelsDetails(): Promise<void> {
    try {
      const promises = TELEGRAM_CHANNEL_IDS_TO_LISTEN.map(async (channelId) => {
        return this.telegramClientService.getChannelDetails(this.telegramClient, channelId);
      });
      const results = await Promise.all(promises);
      this.channelDetails = results;
    } catch (err) {
      this.logger.error(this.refreshChannelsDetails.name, `err: ${this.utilsService.getErrorMessage(err)}`);
    }
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
    try {
      const thread = await this.getCurrentThread();
      const threadRun = await this.openaiAssistantService.runThread(NEWS_ASSISTANT_ID, thread.threadId);
      return await this.openaiAssistantService.getThreadResponse(threadRun.thread_id);
    } catch (err) {
      this.logger.error(this.getDailySummary.name, `err: ${this.utilsService.getErrorMessage(err)}`);
      return null;
    }
  }

  async getDailyPhoto(summaryContent: string): Promise<string> {
    try {
      return await this.openaiService.createImage(`${DAILY_PHOTO_PROMPT}\n\n${summaryContent}`);
    } catch (err) {
      this.logger.error(this.getDailyPhoto.name, `err: ${this.utilsService.getErrorMessage(err)}`);
      return null;
    }
  }
}
