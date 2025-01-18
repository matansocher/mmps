import TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { CoachMongoSubscriptionService } from '@core/mongo/coach-mongo';
import { NotifierBotService } from '@core/notifier-bot';
import { getDateString, getErrorMessage, isDateStringFormat } from '@core/utils';
import { Scores365Service } from '@services/scores-365';
import { BOTS } from '@services/telegram';
import { ANALYTIC_EVENT_STATES } from './coach-bot.service';
import { generateMatchResultsString } from './utils/generate-match-details-string';

const HOURS_TON_NOTIFY = [12, 19, 23];

@Injectable()
export class CoachBotSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(CoachBotSchedulerService.name);

  constructor(
    private readonly scores365Service: Scores365Service,
    private readonly mongoSubscriptionService: CoachMongoSubscriptionService,
    private readonly notifierBotService: NotifierBotService,
    @Inject(BOTS.COACH.id) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    // this.handleIntervalFlow(null); // for testing purposes
  }

  @Cron(`59 ${HOURS_TON_NOTIFY.join(',')} * * *`, { name: 'coach-scheduler', timeZone: DEFAULT_TIMEZONE })
  async handleIntervalFlow(chatId: number = null): Promise<void> {
    try {
      const subscriptions = chatId ? [chatId] : await this.mongoSubscriptionService.getActiveSubscriptions();
      if (!subscriptions?.length) {
        return;
      }

      const responseText = await this.getMatchesSummaryMessage(getDateString(new Date()));
      if (!responseText) {
        return;
      }

      const chatIds = subscriptions.map((subscription) => subscription.chatId);
      await Promise.all(chatIds.map((chatId) => this.bot.sendMessage(chatId, responseText)));
    } catch (err) {
      const errorMessage = `error - ${getErrorMessage(err)}`;
      this.logger.error(this.handleIntervalFlow.name, errorMessage);
      this.notifierBotService.notify(BOTS.COACH, { action: `cron - ${ANALYTIC_EVENT_STATES.ERROR}`, error: errorMessage }, null, null);
    }
  }

  async getMatchesSummaryMessage(dateString: string): Promise<string> {
    const competitions = await this.scores365Service.getCompetitions();
    if (!competitions?.length) {
      this.logger.error(this.handleIntervalFlow.name, 'error - could not get competitions');
      return;
    }
    const competitionsWithMatches = await Promise.all(
      competitions.map((competition) => this.scores365Service.getMatchesForCompetition(competition, dateString)),
    );
    if (!competitionsWithMatches?.length) {
      this.logger.error(this.handleIntervalFlow.name, 'error - could not get matches');
      return;
    }

    const competitionsWithMatchesFiltered = competitionsWithMatches.filter(({ matches }) => matches?.length);
    if (!competitionsWithMatchesFiltered?.length) {
      this.logger.log(this.handleIntervalFlow.name, 'no competitions with matches found');
      return;
    }
    return generateMatchResultsString(competitionsWithMatchesFiltered);
  }
}
