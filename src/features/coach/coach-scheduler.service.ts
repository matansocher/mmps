import cron from 'node-cron';
import { DEFAULT_TIMEZONE } from '@core/config';
import { Logger } from '@core/utils';
import { getDateString } from '@core/utils';
import { notify } from '@services/notifier';
import { BLOCKED_ERROR, provideTelegramBot, sendShortenedMessage } from '@services/telegram';
import { getActiveSubscriptions, getUserDetails, updateSubscription } from '@shared/coach';
import { ANALYTIC_EVENT_NAMES, BOT_CONFIG } from './coach.config';
import { CoachService } from './coach.service';

export class CoachBotSchedulerService {
  private readonly logger = new Logger(CoachBotSchedulerService.name);
  private readonly bot = provideTelegramBot(BOT_CONFIG);

  constructor(private readonly coachService: CoachService) {}

  init(): void {
    cron.schedule(
      `59 12,23 * * *`,
      async () => {
        await this.handleIntervalFlow();
      },
      { timezone: DEFAULT_TIMEZONE }
    );

    cron.schedule(
      `0 13 * * *`,
      async () => {
        await this.handlePredictionsFlow();
      },
      { timezone: DEFAULT_TIMEZONE }
    );

    setTimeout(() => {
      // this.handleIntervalFlow(); // for testing purposes
      // this.handlePredictionsFlow(); // for testing purposes
      // this.handlePredictionsResultsFlow(); // for testing purposes
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

  private async handlePredictionsFlow(): Promise<void> {
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
              notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ERROR, userDetails, error: BLOCKED_ERROR });
            } else {
              notify(BOT_CONFIG, { action: `predictions-cron - ${ANALYTIC_EVENT_NAMES.ERROR}`, userDetails, error: err });
            }
          });
        }),
      );
    } catch (err) {
      notify(BOT_CONFIG, { action: `predictions-cron - ${ANALYTIC_EVENT_NAMES.ERROR}`, error: err });
    }
  }

  // @Cron(`59 23 * * *`, { name: 'coach-predictions-results-scheduler', timeZone: DEFAULT_TIMEZONE })
  // async handlePredictionsResultsFlow(): Promise<void> {
  //   try {
  //     const subscriptions = await getActiveSubscriptions();
  //     if (!subscriptions?.length) {
  //       return;
  //     }
  //
  //     const todayDate = getDateString();
  //
  //     const predictionsResultsText = await this.coachService.getPredictionsResultsMessage(todayDate);
  //     if (!predictionsResultsText) {
  //       return;
  //     }
  //
  //     const relevantSubscriptions = subscriptions.filter((chatId) => !!chatId);
  //     const chatIds = relevantSubscriptions.map(({ chatId }) => chatId);
  //     await Promise.all(
  //       chatIds.map(async (chatId) => {
  //         await sendShortenedMessage(this.bot, chatId, predictionsResultsText, { parse_mode: 'Markdown' }).catch(async (err) => {
  //           const userDetails = await getUserDetails(chatId);
  //           notify(BOT_CONFIG, { action: `predictions-results-cron - ${ANALYTIC_EVENT_NAMES.ERROR}`, userDetails, error: err });
  //         });
  //       }),
  //     );
  //   } catch (err) {
  //     this.logger.error(`Failed to send evening predictions results: ${err}`);
  //     notify(BOT_CONFIG, { action: `predictions-results-cron - ${ANALYTIC_EVENT_NAMES.ERROR}`, error: err });
  //   }
  // }
}
