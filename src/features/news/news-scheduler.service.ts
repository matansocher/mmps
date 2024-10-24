import TelegramBot from 'node-telegram-bot-api';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { DEFAULT_TIMEZONE } from '@core/config/main.config';
import { LoggerService } from '@core/logger';
import {
  NewsMongoAnalyticLogService,
  NewsMongoSubscriptionService,
  NewsMongoThreadService,
  NewsMongoUserService,
  SubscriptionModel,
} from '@core/mongo/news-mongo';
import { NotifierBotService } from '@core/notifier-bot/notifier-bot.service';
import { UtilsService } from '@core/utils';
import { NewsService } from '@services/news';
import { OpenaiAssistantService } from '@services/openai';
import { BOTS, TelegramGeneralService } from '@services/telegram';
import { ANALYTIC_EVENT_NAMES } from './news-bot.config';

@Injectable()
export class NewsSchedulerService implements OnModuleInit {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly newsService: NewsService,
    private readonly mongoAnalyticLogService: NewsMongoAnalyticLogService,
    private readonly mongoUserService: NewsMongoUserService,
    private readonly mongoThreadService: NewsMongoThreadService,
    private readonly mongoSubscriptionService: NewsMongoSubscriptionService,
    private readonly telegramGeneralService: TelegramGeneralService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly notifierBotService: NotifierBotService,
    private readonly openaiAssistantService: OpenaiAssistantService,
    @Inject(BOTS.NEWS.name) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    this.newsService.refreshChannelsDetails();
  }

  @Cron('0 20 * * *', { name: 'news-scheduler', timeZone: DEFAULT_TIMEZONE })
  async handleIntervalFlow() {
    const subscriptions = (await this.mongoSubscriptionService.getActiveSubscriptions()) as SubscriptionModel[];
    if (subscriptions?.length) {
      const chatIds = subscriptions.map((subscription: SubscriptionModel) => subscription.chatId);
      const summaryContent = await this.newsService.getDailySummary();
      const summaryPhoto = summaryContent ? await this.newsService.getDailyPhoto(summaryContent) : null;
      if (!summaryContent) {
        this.logger.error(this.handleIntervalFlow.name, 'error - could not get daily summary or photo');
        return;
      }
      await this.alertSubscriptions(chatIds, summaryContent, summaryPhoto);
      await this.handleAssistantThreadRefresh();
      await this.newsService.refreshChannelsDetails();
    }
  }

  async alertSubscriptions(chatIds: number[], summaryContent: string, summaryPhoto: string): Promise<any> {
    try {
      for (const chatId of chatIds) {
        if (summaryPhoto) {
          await this.telegramGeneralService.sendPhoto(this.bot, chatId, summaryPhoto);
        }
        await this.telegramGeneralService.sendMessage(this.bot, chatId, summaryContent);
      }
      this.notifierBotService.notify(BOTS.NEWS.name, { action: ANALYTIC_EVENT_NAMES.SUBSCRIPTION_FULFILLED, chatIds }, null, null);
    } catch (err) {
      this.logger.error(this.alertSubscriptions.name, `error - ${this.utilsService.getErrorMessage(err)}`);
    }
  }

  async handleAssistantThreadRefresh() {
    const currentThread = await this.mongoThreadService.getCurrentThread();
    if (currentThread) {
      await this.mongoThreadService.stopThread(currentThread.threadId);
    }

    const threadId = await this.openaiAssistantService.createThread();
    await this.mongoThreadService.saveThread(threadId);
  }
}
