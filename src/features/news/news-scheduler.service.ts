import TelegramBot from 'node-telegram-bot-api';
import { Cron } from '@nestjs/schedule';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { DEFAULT_TIMEZONE } from '@core/config';
import { LoggerService } from '@core/logger';
import { NewsMongoSubscriptionService, NewsMongoThreadService, SubscriptionModel } from '@core/mongo/news-mongo';
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
    private readonly mongoThreadService: NewsMongoThreadService,
    private readonly mongoSubscriptionService: NewsMongoSubscriptionService,
    private readonly telegramGeneralService: TelegramGeneralService,
    private readonly notifierBotService: NotifierBotService,
    private readonly openaiAssistantService: OpenaiAssistantService,
    @Inject(BOTS.NEWS.name) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    this.newsService.refreshChannelsDetails();
  }

  @Cron('0 20 * * *', { name: 'news-scheduler', timeZone: DEFAULT_TIMEZONE })
  async handleIntervalFlow() {
    try {
      const subscriptions = (await this.mongoSubscriptionService.getActiveSubscriptions()) as SubscriptionModel[];
      if (!subscriptions?.length) {
        return;
      }
      const chatIds = subscriptions.map((subscription: SubscriptionModel) => subscription.chatId);
      const summaryContent = await this.newsService.getDailySummary();
      if (!summaryContent) {
        this.logger.error(this.handleIntervalFlow.name, 'error - could not get daily summary or photo');
        return;
      }
      const summaryPhoto = await this.newsService.getDailyPhoto(summaryContent);
      await this.alertSubscriptions(chatIds, summaryContent, summaryPhoto);
      await this.handleAssistantThreadRefresh();
      await this.newsService.refreshChannelsDetails();
    } catch (err) {
      this.logger.error(this.handleIntervalFlow.name, `error - ${this.utilsService.getErrorMessage(err)}`);
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
