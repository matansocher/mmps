import TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { RollinsparkMongoSubscriptionService } from '@core/mongo/rollinspark-mongo';
import { NotifierBotService } from '@core/notifier-bot';
import { getErrorMessage } from '@core/utils';
import { BOTS } from '@services/telegram';
import { ANALYTIC_EVENT_STATES, NAME_TO_PLAN_ID_MAP } from './constants';
import { RollinsparkService } from './rollinspark.service';
import { ExpectedAptDetails } from './interfaces';

const INTERVAL_MINUTES = 5;

type PlanAvailability = Record<number, ExpectedAptDetails[]>;

@Injectable()
export class RollinsparkSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(RollinsparkSchedulerService.name);
  latestPlansAvailability: PlanAvailability = Object.values(NAME_TO_PLAN_ID_MAP).reduce((acc, planId: number) => {
    acc[planId] = [];
    return acc;
  }, {} as PlanAvailability);

  constructor(
    private readonly rollinsparkService: RollinsparkService,
    private readonly mongoSubscriptionService: RollinsparkMongoSubscriptionService,
    private readonly notifierBotService: NotifierBotService,
    @Inject(BOTS.ROLLINSPARK.name) private readonly bot: TelegramBot,
  ) {}

  async onModuleInit(): Promise<void> {
    const allPlanIds = Object.values(NAME_TO_PLAN_ID_MAP);
    const plansAvailability = await this.getPlansAvailability(allPlanIds);
    this.latestPlansAvailability = plansAvailability;

    // this.handleIntervalFlow(); // for testing purposes
  }

  @Cron(`*/${INTERVAL_MINUTES} * * * *`, { name: 'rollinspark-scheduler', timeZone: DEFAULT_TIMEZONE })
  async handleIntervalFlow(): Promise<void> {
    try {
      const subscriptions = await this.mongoSubscriptionService.getActiveSubscriptions();
      if (!subscriptions?.length) {
        this.logger.log('No active subscriptions found.');
        return;
      }
      const planIds = subscriptions.map((sub) => sub.planId);
      const newPlansAvailability = await this.getPlansAvailability(planIds);
      const changedPlanIds = planIds.filter((planId) => !this.isPlanSimilarToLatest(planId, this.latestPlansAvailability, newPlansAvailability));
      if (!changedPlanIds.length) {
        this.logger.log('No changes detected in plan availability');
        return;
      }

      for (const planId of changedPlanIds) {
        const relevantSubscriptions = subscriptions.filter((sub) => sub.planId === planId);
        const chatIds = relevantSubscriptions.map((sub) => sub.chatId);
        const planName = Object.keys(NAME_TO_PLAN_ID_MAP).find((key) => NAME_TO_PLAN_ID_MAP[key] === planId);
        if (chatIds.length && planName) {
          await this.alertSubscriptions(chatIds, planName);
        }
      }

      this.latestPlansAvailability = newPlansAvailability;
      this.logger.log('Updated latestPlansAvailability after changes.');
    } catch (err) {
      this.notifierBotService.notify(BOTS.ROLLINSPARK.name, { action: `${this.handleIntervalFlow.name} - ${ANALYTIC_EVENT_STATES.ERROR}` }, null, null);
      this.logger.error(this.handleIntervalFlow.name, `error - ${getErrorMessage(err)}`);
    }
  }

  async getPlansAvailability(planIds: number[]): Promise<PlanAvailability> {
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
      }, {} as PlanAvailability);
    } catch (err) {
      this.logger.error(this.getPlansAvailability.name, `Error fetching plans availability: ${getErrorMessage(err)}`);
      this.notifierBotService.notify(BOTS.ROLLINSPARK.name, { action: `${ANALYTIC_EVENT_STATES.REFRESH}` }, null, null);
      return null;
    }
  }

  isPlanSimilarToLatest(planId: number, oldPlansAvailability: PlanAvailability, newPlansAvailability: PlanAvailability): boolean {
    const oldApts = oldPlansAvailability[planId]?.map((res) => res.ApartmentId).sort() || [];
    const newApts = newPlansAvailability[planId]?.map((res) => res.ApartmentId).sort() || [];

    // Check for additions or removals
    const addedApts = newApts.filter((id) => !oldApts.includes(id));
    const removedApts = oldApts.filter((id) => !newApts.includes(id));

    if (addedApts.length > 0 || removedApts.length > 0) {
      this.logger.log(`Plan ${planId} has changes. Added apartments: ${addedApts.join(', ')}, Removed apartments: ${removedApts.join(', ')}`);
      return false;
    }

    return true;
  }

  async alertSubscriptions(chatIds: number[], planName: string): Promise<void> {
    try {
      const messageText = [
        `I think I found a new apartment (${planName}) uploaded to the rollins park neighborhood website!`,
        `Go check it out here:`,
        `https://www.rollinspark.net/floor-plans`,
      ].join('\n');
      await Promise.all([
        ...chatIds.map((chatId) => this.bot.sendMessage(chatId, messageText)),
        this.notifierBotService.notify(BOTS.ROLLINSPARK.name, { action: ANALYTIC_EVENT_STATES.ALERTED }, null, null)
      ]);
    } catch (err) {
      this.logger.error(this.alertSubscriptions.name, `error - ${getErrorMessage(err)}`);
      this.notifierBotService.notify(BOTS.ROLLINSPARK.name, { action: `${this.alertSubscriptions.name} - ${ANALYTIC_EVENT_STATES.ERROR}` }, null, null);
    }
  }
}
