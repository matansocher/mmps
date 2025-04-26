import type TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { CoachMongoSubscriptionService } from '@core/mongo/coach-mongo';
import { NotifierService } from '@core/notifier';
import { getDateString } from '@core/utils';
import { ANALYTIC_EVENT_NAMES, BOT_CONFIG } from './coach.config';
import { CoachService } from './coach.service';

const HOURS_TO_NOTIFY = [12, 19, 23];

@Injectable()
export class CoachBotSchedulerService implements OnModuleInit {
  constructor(
    private readonly coachService: CoachService,
    private readonly mongoSubscriptionService: CoachMongoSubscriptionService,
    private readonly notifier: NotifierService,
    @Inject(BOT_CONFIG.id) private readonly bot: TelegramBot,
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

      const responseText = await this.coachService.getMatchesSummaryMessage(getDateString());
      if (!responseText) {
        return;
      }

      const chatIds = subscriptions.map((subscription) => subscription.chatId);
      const replyText = [`זה המצב הנוכחי של משחקי היום:`, responseText].join('\n\n');
      await Promise.all(chatIds.map((chatId) => this.bot.sendMessage(chatId, replyText, { parse_mode: 'Markdown' })));
    } catch (err) {
      this.notifier.notify(BOT_CONFIG, { action: `cron - ${ANALYTIC_EVENT_NAMES.ERROR}`, error: err });
    }
  }
}
