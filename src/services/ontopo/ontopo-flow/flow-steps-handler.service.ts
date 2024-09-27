import TelegramBot from 'node-telegram-bot-api';
import { Injectable } from '@nestjs/common';
import { MONTHS_OF_YEAR } from '@core/config/main.config';
import { LoggerService } from '@core/logger/logger.service';
import { OntopoMongoSubscriptionService, OntopoMongoUserService } from '@core/mongo/ontopo-mongo/services';
import { NotifierBotService } from '@core/notifier-bot/notifier-bot.service';
import { UtilsService } from '@core/utils/utils.service';
import { BOTS } from '@services/telegram/telegram.config';
import { IFlowStepType, IUserFlowDetails, IUserSelections } from '@services/ontopo/interface';
import { ANALYTIC_EVENT_NAMES, MAX_SUBSCRIPTIONS_NUMBER, ONTOPO_FLOW_STEPS, RESTAURANT_FOR_USER_BASE_URL } from '@services/ontopo/ontopo.config';
import { OntopoApiService } from '@services/ontopo/ontopo-api/ontopo-api.service';
import { FlowStepsManagerService } from '@services/ontopo/ontopo-flow/flow-steps-manager.service';
import { AreaHandler, DateHandler, DetailsHandler, SizeHandler, StepHandler, TimeHandler } from '@services/ontopo/ontopo-flow/step-handlers';
import { OntopoUtilsService } from '@services/ontopo/ontopo-flow/ontopo-utils.service';
import { TelegramGeneralService } from '@services/telegram/telegram-general.service';

@Injectable()
export class FlowStepsHandlerService {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly telegramGeneralService: TelegramGeneralService,
    private readonly flowStepsManagerService: FlowStepsManagerService,
    private readonly ontopoApiService: OntopoApiService,
    private readonly ontopoUtilsService: OntopoUtilsService,
    private readonly mongoSubscriptionService: OntopoMongoSubscriptionService,
    private readonly mongoUserService: OntopoMongoUserService,
    private readonly notifierBotService: NotifierBotService,
  ) {}

  async handleStep(bot: TelegramBot, chatId: number, currentStepUserInput: string): Promise<void> {
    let currentStepDetails = this.flowStepsManagerService.getCurrentUserStepDetails(chatId);

    const flowCurrentStep = ONTOPO_FLOW_STEPS[currentStepDetails.currentStepIndex];
    const flowNextStep = ONTOPO_FLOW_STEPS[currentStepDetails.currentStepIndex + 1];

    const handlerCurrentStepClass = this.getHandlerClass(bot, flowCurrentStep?.id);
    const handlerNextStepClass = this.getHandlerClass(bot, flowNextStep?.id);

    await handlerCurrentStepClass.handlePostUserAction(chatId, currentStepDetails, flowCurrentStep, currentStepUserInput);

    if (handlerNextStepClass) {
      currentStepDetails = this.flowStepsManagerService.getCurrentUserStepDetails(chatId);
      await handlerNextStepClass.handlePreUserAction(chatId, currentStepDetails, flowNextStep);
    }

    const isLastStep = currentStepDetails.currentStepIndex + 1 === ONTOPO_FLOW_STEPS.length;
    if (isLastStep) {
      currentStepDetails = this.flowStepsManagerService.getCurrentUserStepDetails(chatId);
      await this.handleLastStep(bot, chatId, currentStepDetails);
    } else {
      this.flowStepsManagerService.incrementCurrentUserStep(chatId);
    }
  }

  getHandlerClass(bot: TelegramBot, flowStepType: IFlowStepType): StepHandler {
    const baseDependencies: [TelegramBot, LoggerService, UtilsService, TelegramGeneralService, FlowStepsManagerService, OntopoUtilsService] = [
      bot, this.logger, this.utilsService, this.telegramGeneralService, this.flowStepsManagerService, this.ontopoUtilsService
    ];

    switch (flowStepType) {
      case IFlowStepType.DETAILS:
        return new DetailsHandler(...baseDependencies, this.ontopoApiService);
      case IFlowStepType.DATE:
        return new DateHandler(...baseDependencies);
      case IFlowStepType.TIME:
        return new TimeHandler(...baseDependencies);
      case IFlowStepType.SIZE:
        return new SizeHandler(...baseDependencies);
      case IFlowStepType.AREA:
        return new AreaHandler(...baseDependencies);
      default:
        return null;
    }
  }

  async handleLastStep(bot: TelegramBot, chatId: number, currentStepDetails: IUserFlowDetails): Promise<void> {
    const { restaurantDetails, size, date, time, area } = currentStepDetails;
    const userSelections: IUserSelections = { size, date, time, area };
    const { isAvailable, reservationDetails } = await this.ontopoApiService.getRestaurantAvailability(restaurantDetails.slug, userSelections);
    if (isAvailable) {
      const inlineKeyboardButtons = [{ text: 'Order Now!', url: this.ontopoUtilsService.getRestaurantLinkForUser(restaurantDetails.slug) }];
      const inlineKeyboardMarkup = this.telegramGeneralService.getInlineKeyboardMarkup(inlineKeyboardButtons);
      const date = `${MONTHS_OF_YEAR[new Date(reservationDetails.date).getMonth()]} ${new Date(reservationDetails.date).getDate()}`;
      const replyText = `I see that ${restaurantDetails.title} is now available at ${date} - ${reservationDetails.time}!\nI have occupied that time so wait a few minutes and then you should be able to order!`;
      await Promise.all([
        this.telegramGeneralService.sendMessage(bot, chatId, replyText, { ...inlineKeyboardMarkup }),
        this.notifierBotService.notify(BOTS.ONTOPO.name, { restaurant: restaurantDetails.title, action: ANALYTIC_EVENT_NAMES.SUBSCRIPTION_FULFILLED }, chatId, this.mongoUserService),
      ]);
    } else {
      const numOfSubscriptions = await this.mongoSubscriptionService.getSubscriptionsCount(chatId);
      if (numOfSubscriptions >= MAX_SUBSCRIPTIONS_NUMBER) {
        await this.telegramGeneralService.sendMessage(bot, chatId, `You have reached the maximum number of subscriptions - ${MAX_SUBSCRIPTIONS_NUMBER}. Please unsubscribe from one of them before adding a new one`);
        this.flowStepsManagerService.resetCurrentUserStep(chatId);
        return;
      }
      const subscription = await this.mongoSubscriptionService.addSubscription(chatId, currentStepDetails);
      const { text, inlineKeyboardMarkup } = this.ontopoUtilsService.getSubscriptionDetails(subscription);
      const resText = `Yay! You have successfully subscribed to the restaurant:\n\n${text}\n\nI will do my best to find you the a table and let you know once I do!`;
      await this.telegramGeneralService.sendPhoto(bot, subscription.chatId, subscription.restaurantDetails.image, { ...inlineKeyboardMarkup, caption: resText });
      this.notifierBotService.notify(BOTS.ONTOPO.name, { restaurant: restaurantDetails.title, action: ANALYTIC_EVENT_NAMES.SUBSCRIBE, }, chatId, this.mongoUserService);
    }
    this.flowStepsManagerService.resetCurrentUserStep(chatId);
  }
}
