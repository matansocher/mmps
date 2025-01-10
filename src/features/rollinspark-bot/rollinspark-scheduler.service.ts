import { isEqual as _isEqual } from 'lodash';
import TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { LoggerService } from '@core/logger';
import { RollinsparkMongoSubscriptionService } from '@core/mongo/rollinspark-mongo';
import { MY_USER_ID, NotifierBotService } from '@core/notifier-bot';
import { UtilsService } from '@core/utils';
import { BOTS, TelegramGeneralService } from '@services/telegram';
import { ANALYTIC_EVENT_STATES, NAME_TO_PLAN_ID_MAP } from './constants';
import { RollinsparkService } from './rollinspark.service';
import { ExpectedAptDetails } from '@features/rollinspark-bot/interfaces';

const INTERVAL_MINUTES = 5;

type PlanAvailability = Record<number, ExpectedAptDetails[]>;

@Injectable()
export class RollinsparkSchedulerService implements OnModuleInit {
  latestPlansAvailability: Record<number, ExpectedAptDetails[]> = Object.values(NAME_TO_PLAN_ID_MAP).reduce((acc, planId: number) => {
    acc[planId] = null; // Or initialize with an empty array if needed
    return acc;
  }, {});

  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly rollinsparkService: RollinsparkService,
    private readonly mongoSubscriptionService: RollinsparkMongoSubscriptionService,
    private readonly telegramGeneralService: TelegramGeneralService,
    private readonly notifierBotService: NotifierBotService,
    @Inject(BOTS.ROLLINSPARK.name) private readonly bot: TelegramBot,
  ) {}

  async onModuleInit(): Promise<void> {
    const allPlanIds = Object.values(NAME_TO_PLAN_ID_MAP);
    const plansAvailability = await this.getPlansAvailability(allPlanIds);
    this.latestPlansAvailability = plansAvailability;

    this.bot.sendPoll(MY_USER_ID, 'question', ['option1', 'option2'], { is_anonymous: false });
    // this.handleIntervalFlow(); // for testing purposes
  }

  @Cron(`*/${INTERVAL_MINUTES} * * * *`, { name: 'rollinspark-scheduler', timeZone: DEFAULT_TIMEZONE })
  async handleIntervalFlow(): Promise<void> {
    try {
      const subscriptions = await this.mongoSubscriptionService.getActiveSubscriptions();
      if (!subscriptions?.length) {
        return;
      }
      const planIds = subscriptions.map((sub) => sub.planId);
      const plansAvailability = await this.getPlansAvailability(planIds);
      // $$$$$$$$$$$$$$$$$$$$$$$$$$$ here we need to compare the latestPlansAvailability with the new results
      const planIdsWithChanges = Object.values(NAME_TO_PLAN_ID_MAP)
        .map((planId) => this.isPlanSimilarToLatest(planId, this.latestPlansAvailability, plansAvailability[planId]))
        .filter((isSimilar) => !isSimilar);

      if (!planIdsWithChanges.length) {
        return;
      }



      // planIdsWithChanges.map((planId) => {
      //   const relevantSubscriptions = subscriptions.filter((sub) => sub.planId === planId);
      //   const chatIds = relevantSubscriptions?.map((sub) => sub.chatId);
      //   const planName = Object.keys(NAME_TO_PLAN_ID_MAP).find((key) => NAME_TO_PLAN_ID_MAP[key] === planId);
      //   return this.alertSubscriptions(chatIds, planName);
      // });

      this.latestPlansAvailability = plansAvailability;
    } catch (err) {
      this.notifierBotService.notify(BOTS.ROLLINSPARK.name, { action: `${this.handleIntervalFlow.name} - ${ANALYTIC_EVENT_STATES.ERROR}` }, null, null);
      this.logger.error(this.handleIntervalFlow.name, `error - ${this.utilsService.getErrorMessage(err)}`);
    }
  }

  async getPlansAvailability(planIds: number[]): Promise<{ planId: number; aptsDetails: ExpectedAptDetails[] }> {
    try {
      const results = await Promise.all(
        planIds.map(async (planId) => {
          const aptsDetails = await this.rollinsparkService.getAptsDetails(planId);
          return { planId, aptsDetails };
        }),
      );

      return results.reduce((acc, { planId, aptsDetails }) => {
        acc[planId] = aptsDetails;
        return acc;
      }, {} as any);
    } catch (err) {
      this.logger.error(this.getPlansAvailability.name, `error - ${this.utilsService.getErrorMessage(err)}`);
      this.notifierBotService.notify(BOTS.ROLLINSPARK.name, { action: `${ANALYTIC_EVENT_STATES.REFRESH}` }, null, null);
      return null;
    }
  }

  // async refreshPlanAvailability(planId: number): Promise<void> {
  //   const aptsDetails = await this.rollinsparkService.getAptsDetails(planId);
  //   if (!aptsDetails) {
  //     this.logger.error(this.refreshPlanAvailability.name, 'error - could not get daily summary or photo');
  //     return;
  //   }
  //   const isResSimilarToLatest = await this.isResSimilarToLatest(aptsDetails);
  //   if (this.latestPlansAvailability?.length && !this.isFirstTime && !isResSimilarToLatest) {
  //     await this.alertSubscriptions(this.chatIds);
  //   }
  //   this.latestPlansAvailability = aptsDetails;
  // }

  isPlanSimilarToLatest(planId: number, oldPlansAvailability: PlanAvailability, newPlansAvailability: PlanAvailability): boolean {
    const oldAptsIds = oldPlansAvailability[planId].map((res) => res.ApartmentId).sort();
    const newAptsIds = newPlansAvailability[planId].map((res) => res.ApartmentId).sort();
    if (!oldAptsIds || !newAptsIds) {
      return false;
    }

    // const existingKeys = this.latestPlansAvailability.map((res) => res.ApartmentId).sort();
    // const newKeys = newResult.map((res) => res.ApartmentId).sort();

    // return _isEqual(existingKeys, newKeys);
    return _isEqual(1, 2);
  }

  async alertSubscriptions(chatIds: number[], planName: string): Promise<void> {
    try {
      const messageText = [
        `I think I found a new apartment (${planName}) uploaded to the rollins park neighborhood website!`,
        `Go check it out here:`,
        `https://www.rollinspark.net/floor-plans`,
      ].join('\n');
      await Promise.all(chatIds.map((chatId) => this.telegramGeneralService.sendMessage(this.bot, chatId, messageText)));
    } catch (err) {
      this.logger.error(this.alertSubscriptions.name, `error - ${this.utilsService.getErrorMessage(err)}`);
      this.notifierBotService.notify(BOTS.ROLLINSPARK.name, { action: `${this.alertSubscriptions.name} - ${ANALYTIC_EVENT_STATES.ERROR}` }, null, null);
    }
  }
}
