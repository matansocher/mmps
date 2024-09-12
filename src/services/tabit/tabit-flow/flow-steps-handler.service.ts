import { MONTHS_OF_YEAR } from '@core/config/main.config';
import TelegramBot from 'node-telegram-bot-api';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@core/logger/logger.service';
import { TabitMongoSubscriptionService } from '@core/mongo/tabit-mongo/services';
import { UtilsService } from '@core/utils/utils.service';
import { IFlowStepType, IUserFlowDetails, IUserSelections } from '@services/tabit/interface';
import { MAX_SUBSCRIPTIONS_NUMBER, TABIT_FLOW_STEPS } from '@services/tabit/tabit.config';
import { TabitApiService } from '@services/tabit/tabit-api/tabit-api.service';
import { FlowStepsManagerService } from '@services/tabit/tabit-flow/flow-steps-manager.service';
import { AreaHandler, DateHandler, DetailsHandler, NumOfSeatsHandler, StepHandler, TimeHandler } from '@services/tabit/tabit-flow/step-handlers';
import { TabitUtilsService } from '@services/tabit/tabit-flow/tabit-utils.service';
import { TelegramGeneralService } from '@services/telegram/telegram-general.service';

@Injectable()
export class FlowStepsHandlerService {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly telegramGeneralService: TelegramGeneralService,
    private readonly flowStepsManagerService: FlowStepsManagerService,
    private readonly tabitApiService: TabitApiService,
    private readonly tabitUtilsService: TabitUtilsService,
    private readonly mongoSubscriptionService: TabitMongoSubscriptionService,
  ) {}

  async handleStep(bot: TelegramBot, chatId: number, currentStepUserInput: string): Promise<void> {
    let currentStepDetails = this.flowStepsManagerService.getCurrentUserStepDetails(chatId);

    const flowCurrentStep = TABIT_FLOW_STEPS[currentStepDetails.currentStepIndex];
    const flowNextStep = TABIT_FLOW_STEPS[currentStepDetails.currentStepIndex + 1];

    const handlerCurrentStepClass = this.getHandlerClass(bot, flowCurrentStep?.id);
    const handlerNextStepClass = this.getHandlerClass(bot, flowNextStep?.id);

    await handlerCurrentStepClass.handlePostUserAction(chatId, currentStepDetails, flowCurrentStep, currentStepUserInput);

    if (handlerNextStepClass) {
      currentStepDetails = this.flowStepsManagerService.getCurrentUserStepDetails(chatId);
      await handlerNextStepClass.handlePreUserAction(chatId, currentStepDetails, flowNextStep);
    }

    const isLastStep = currentStepDetails.currentStepIndex + 1 === TABIT_FLOW_STEPS.length;
    if (isLastStep) {
      currentStepDetails = this.flowStepsManagerService.getCurrentUserStepDetails(chatId);
      await this.handleLastStep(bot, chatId, currentStepDetails);
    } else {
      this.flowStepsManagerService.incrementCurrentUserStep(chatId);
    }
  }

  getHandlerClass(bot: TelegramBot, flowStepType: IFlowStepType): StepHandler {
    const baseDependencies: [TelegramBot, LoggerService, UtilsService, TelegramGeneralService, FlowStepsManagerService, TabitUtilsService] = [
      bot, this.logger, this.utilsService, this.telegramGeneralService, this.flowStepsManagerService, this.tabitUtilsService
    ];

    switch (flowStepType) {
      case IFlowStepType.DETAILS:
        return new DetailsHandler(...baseDependencies, this.tabitApiService);
      case IFlowStepType.DATE:
        return new DateHandler(...baseDependencies);
      case IFlowStepType.TIME:
        return new TimeHandler(...baseDependencies);
      case IFlowStepType.NUM_OF_SEATS:
        return new NumOfSeatsHandler(...baseDependencies);
      case IFlowStepType.AREA:
        return new AreaHandler(...baseDependencies);
      default:
        return null;
    }
  }

  async handleLastStep(bot: TelegramBot, chatId: number, currentStepDetails: IUserFlowDetails): Promise<void> {
    const { restaurantDetails, numOfSeats, date, time, area } = currentStepDetails;
    const userSelections: IUserSelections = { numOfSeats, date, time, area };
    const { isAvailable } = await this.tabitApiService.getRestaurantAvailability(restaurantDetails, userSelections);
    if (isAvailable) {
      const restaurantLinkUrl = this.tabitUtilsService.getRestaurantLinkForUser(restaurantDetails.id);
      const inlineKeyboardButtons = [{ text: 'Order Now!', url: restaurantLinkUrl }];
      const inlineKeyboardMarkup = this.telegramGeneralService.getInlineKeyboardMarkup(inlineKeyboardButtons);
      const date = `${MONTHS_OF_YEAR[new Date(userSelections.date).getMonth()]} ${new Date(userSelections.date).getDate()}`;
      const replyText = `I see that ${restaurantDetails.title} is now available at ${date} - ${userSelections.time}!\nI have occupied that time so wait a few minutes and then you should be able to order!`;
      await Promise.all([
        this.telegramGeneralService.sendMessage(bot, chatId, replyText, { ...inlineKeyboardMarkup }),
        // this.notifierBotService.notify(BOTS.TABIT.name, { data: { restaurant: restaurantTitle }, action: tabitConfig.ANALYTIC_EVENT_NAMES.SUBSCRIPTION_FULFILLED }, chatId, this.mongoUserService),
      ]);
    } else {
      const numOfSubscriptions = await this.mongoSubscriptionService.getSubscriptionsCount(chatId);
      if (numOfSubscriptions >= MAX_SUBSCRIPTIONS_NUMBER) {
        await this.telegramGeneralService.sendMessage(bot, chatId, `You have reached the maximum number of subscriptions - ${MAX_SUBSCRIPTIONS_NUMBER}. Please unsubscribe from one of them before adding a new one`);
        this.flowStepsManagerService.resetCurrentUserStep(chatId);
        return;
      }
      const subscription = await this.mongoSubscriptionService.addSubscription(chatId, currentStepDetails);
      // this.notifierBotService.notify(BOTS.TABIT.name, { data: { currentStepDetails }, action: ANALYTIC_EVENT_NAMES.SUBSCRIBE, }, chatId, this.mongoUserService);
      const { text, inlineKeyboardMarkup } = this.tabitUtilsService.getSubscriptionDetails(subscription);
      const resText = `Yay! You have successfully subscribed to the restaurant:\n\n${text}\n\nI will let you know when a table is available for you!`;
      return this.telegramGeneralService.sendPhoto(bot, subscription.chatId, subscription.restaurantDetails.image, { ...inlineKeyboardMarkup, caption: resText });
    }
    this.flowStepsManagerService.resetCurrentUserStep(chatId);
  }
}
