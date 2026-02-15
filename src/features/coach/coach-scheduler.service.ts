import type { Bot } from 'grammy';
import cron from 'node-cron';
import { DEFAULT_TIMEZONE } from '@core/config';
import { getDateString } from '@core/utils';
import { notify } from '@services/notifier';
import { BLOCKED_ERROR, sendShortenedMessage } from '@services/telegram';
import { getActiveSubscriptions, getUserDetails, updateSubscription } from '@shared/coach';
import { ANALYTIC_EVENT_NAMES, BOT_CONFIG } from './coach.config';
import { CoachService } from './coach.service';

export class CoachBotSchedulerService {
  constructor(
    private readonly coachService: CoachService,
    private readonly bot: Bot,
  ) {}

  init(): void {
    cron.schedule(
      `59 12,23 * * *`,
      async () => {
        await this.handleIntervalFlow();
      },
      { timezone: DEFAULT_TIMEZONE },
    );

    setTimeout(() => {
      // this.handleIntervalFlow(); // for testing purposes
    }, 8000);
  }

  private async handleIntervalFlow(): Promise<void> {
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
            notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ERROR, userDetails, error: BLOCKED_ERROR });
          } else {
            notify(BOT_CONFIG, { action: `cron - ${ANALYTIC_EVENT_NAMES.ERROR}`, userDetails, error: err });
          }
        }
      }
    } catch (err) {
      notify(BOT_CONFIG, { action: `cron - ${ANALYTIC_EVENT_NAMES.ERROR}`, error: err });
    }
  }
}
