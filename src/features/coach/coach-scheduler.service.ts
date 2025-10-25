import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { NotifierService } from '@core/notifier';
import { getDateString } from '@core/utils';
import { BLOCKED_ERROR, provideTelegramBot, sendShortenedMessage } from '@services/telegram';
import { getActiveSubscriptions, getUserDetails, updateSubscription } from '@shared/coach';
import { ANALYTIC_EVENT_NAMES, BOT_CONFIG } from './coach.config';
import { CoachService } from './coach.service';

const HOURS_TO_NOTIFY = [12, 23];

@Injectable()
export class CoachBotSchedulerService implements OnModuleInit {
  private readonly bot = provideTelegramBot(BOT_CONFIG);

  constructor(
    private readonly coachService: CoachService,
    private readonly notifier: NotifierService,
  ) {}

  onModuleInit(): void {
    setTimeout(() => {
      // this.handleIntervalFlow(); // for testing purposes
      // this.handlePredictionsFlow(); // for testing purposes
    }, 8000);
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

  @Cron(`0 13 * * *`, { name: 'coach-predictions-scheduler', timeZone: DEFAULT_TIMEZONE })
  async handlePredictionsFlow(): Promise<void> {
    try {
      const subscriptions = await getActiveSubscriptions();
      if (!subscriptions?.length) {
        return;
      }

      // Generate predictions once for all users (no league filtering)
      const predictionsText = await this.coachService.getMatchesPredictionsMessage(getDateString());
      if (!predictionsText) {
        return;
      }

      // Send the same predictions to all users
      const relevantSubscriptions = subscriptions.filter((chatId) => !!chatId);
      const chatIds = relevantSubscriptions.map(({ chatId }) => chatId);
      await Promise.all(
        chatIds.map(async (chatId) => {
          await sendShortenedMessage(this.bot, chatId, predictionsText, { parse_mode: 'Markdown' }).catch(async (err) => {
            const userDetails = await getUserDetails(chatId);
            if (err.message.includes(BLOCKED_ERROR)) {
              await updateSubscription(chatId, { isActive: false });
              this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ERROR, userDetails, error: BLOCKED_ERROR });
            } else {
              this.notifier.notify(BOT_CONFIG, { action: `predictions-cron - ${ANALYTIC_EVENT_NAMES.ERROR}`, userDetails, error: err });
            }
          });
        }),
      );
    } catch (err) {
      this.notifier.notify(BOT_CONFIG, { action: `predictions-cron - ${ANALYTIC_EVENT_NAMES.ERROR}`, error: err });
    }
  }
}
