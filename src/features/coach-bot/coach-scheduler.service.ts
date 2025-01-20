import TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { CoachMongoSubscriptionService } from '@core/mongo/coach-mongo';
import { NotifierBotService } from '@core/notifier-bot';
import { getErrorMessage } from '@core/utils';
import { BOTS } from '@services/telegram';
import { CoachService } from './coach.service';
import { ANALYTIC_EVENT_STATES } from './constants';

const HOURS_TO_NOTIFY = [12, 19, 23];

@Injectable()
export class CoachBotSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(CoachBotSchedulerService.name);

  constructor(
    private readonly coachService: CoachService,
    private readonly mongoSubscriptionService: CoachMongoSubscriptionService,
    private readonly notifierBotService: NotifierBotService,
    @Inject(BOTS.COACH.id) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    // this.handleIntervalFlow(null); // for testing purposes
  }

  @Cron(`59 ${HOURS_TO_NOTIFY.join(',')} * * *`, { name: 'coach-scheduler', timeZone: DEFAULT_TIMEZONE })
  async handleIntervalFlow(): Promise<void> {
    try {
      const subscriptions = await this.mongoSubscriptionService.getActiveSubscriptions();
      if (!subscriptions?.length) {
        return;
      }

      const responseText = await this.coachService.getMatchesSummaryMessage();
      if (!responseText) {
        return;
      }

      const chatIds = subscriptions.map((subscription) => subscription.chatId);
      await Promise.all(chatIds.map((chatId) => this.bot.sendMessage(chatId, responseText)));
    } catch (err) {
      const errorMessage = `error - ${getErrorMessage(err)}`;
      this.logger.error(`${this.handleIntervalFlow.name} - ${errorMessage}`);
      this.notifierBotService.notify(BOTS.COACH, { action: `cron - ${ANALYTIC_EVENT_STATES.ERROR}`, error: errorMessage }, null, null);
    }
  }
}
