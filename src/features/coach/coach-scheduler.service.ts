import type TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { NotifierService } from '@core/notifier';
import { getDateString } from '@core/utils';
import { BLOCKED_ERROR, sendShortenedMessage } from '@services/telegram';
import { getActiveSubscriptions, getUserDetails, updateSubscription } from '@shared/coach/mongo';
import { ANALYTIC_EVENT_NAMES, BOT_CONFIG } from './coach.config';
import { CoachService } from './coach.service';

const HOURS_TO_NOTIFY = [12, 23];

@Injectable()
export class CoachBotSchedulerService implements OnModuleInit {
  constructor(
    private readonly coachService: CoachService,
    private readonly notifier: NotifierService,
    @Inject(BOT_CONFIG.id) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    // this.handleIntervalFlow(); // for testing purposes
  }

  @Cron(`59 ${HOURS_TO_NOTIFY.join(',')} * * *`, { name: 'coach-scheduler', timeZone: DEFAULT_TIMEZONE })
  async handleIntervalFlow(): Promise<void> {
    try {
      const subscriptions = await getActiveSubscriptions();
      if (!subscriptions?.length) {
        return;
      }

      const relevantSubscriptions = subscriptions.filter((chatId) => !!chatId);
      for (const { chatId, customLeagues } of relevantSubscriptions) {
        try {
          const responseText = await this.coachService.getMatchesSummaryMessage(getDateString(), customLeagues);
          if (!responseText) {
            continue;
          }
          const replyText = [`זה המצב הנוכחי של משחקי היום:`, responseText].join('\n\n');
          await sendShortenedMessage(this.bot, chatId, replyText, { parse_mode: 'Markdown' });
        } catch (err) {
          const userDetails = await getUserDetails(chatId);
          if (err.message.includes(BLOCKED_ERROR)) {
            await updateSubscription(chatId, { isActive: false });
            this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ERROR, userDetails, error: BLOCKED_ERROR });
          } else {
            this.notifier.notify(BOT_CONFIG, { action: `cron - ${ANALYTIC_EVENT_NAMES.ERROR}`, userDetails, error: err });
          }
        }
      }
    } catch (err) {
      this.notifier.notify(BOT_CONFIG, { action: `cron - ${ANALYTIC_EVENT_NAMES.ERROR}`, error: err });
    }
  }
}
