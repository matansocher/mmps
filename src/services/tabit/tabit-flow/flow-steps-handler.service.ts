import TelegramBot from 'node-telegram-bot-api';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@core/logger/logger.service';
import { TabitMongoSubscriptionService } from '@core/mongo/tabit-mongo/services';
import { UtilsService } from '@core/utils/utils.service';
import { IFlowStepType, IUserFlowDetails } from '@services/tabit/interface';
import { TABIT_FLOW_STEPS } from '@services/tabit/tabit.config';
import { TabitApiService } from '@services/tabit/tabit-api/tabit-api.service';
import { FlowStepsManagerService } from '@services/tabit/tabit-flow/flow-steps-manager.service';
import { AreaHandler, DateHandler, DetailsHandler, NumOfSeatsHandler, StepHandler, TimeHandler } from '@services/tabit/tabit-flow/step-handlers';
import { TelegramGeneralService } from '@services/telegram/telegram-general.service';

@Injectable()
export class FlowStepsHandlerService {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly telegramGeneralService: TelegramGeneralService,
    private readonly flowStepsManagerService: FlowStepsManagerService,
    private readonly tabitApiService: TabitApiService,
    private readonly mongoSubscriptionService: TabitMongoSubscriptionService,
  ) {}

  async handleStep(bot: TelegramBot, chatId: number, currentStepUserInput: string): Promise<void> {
    const currentStepDetails = this.flowStepsManagerService.getCurrentUserStepDetails(chatId);

    const flowCurrentStep = TABIT_FLOW_STEPS[currentStepDetails.currentStepIndex];
    const flowNextStep = TABIT_FLOW_STEPS[currentStepDetails.currentStepIndex + 1];

    const handlerCurrentStepClass = this.getHandlerClass(bot, flowCurrentStep?.id);
    const handlerNextStepClass = this.getHandlerClass(bot, flowNextStep?.id);

    await handlerCurrentStepClass.handlePostUserAction(chatId, currentStepDetails, flowCurrentStep, currentStepUserInput);

    if (handlerNextStepClass) {
      await handlerNextStepClass.handlePreUserAction(chatId, currentStepDetails, flowNextStep);
    }

    const isLastStep = currentStepDetails.currentStepIndex + 1 === TABIT_FLOW_STEPS.length;
    if (isLastStep) {
      await this.handleLastStep(bot, chatId, currentStepDetails);
    } else {
      this.flowStepsManagerService.incrementCurrentUserStep(chatId);
    }
  }

  getHandlerClass(bot: TelegramBot, flowStepType: IFlowStepType): StepHandler {
    const baseDependencies: [TelegramBot, LoggerService, UtilsService, TelegramGeneralService, FlowStepsManagerService] = [
      bot, this.logger, this.utilsService, this.telegramGeneralService, this.flowStepsManagerService
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
    const isAvailable = await this.tabitApiService.getRestaurantAvailability(currentStepDetails);
    if (isAvailable) {
      await this.telegramGeneralService.sendMessage(bot, chatId, 'It looks like the restaurant is available now, go ahead and save your place');
    } else {
      await this.mongoSubscriptionService.addSubscription(chatId, currentStepDetails);
      // this.notifierBotService.notify(BOTS.TABIT.name, { data: { currentStepDetails }, action: ANALYTIC_EVENT_NAMES.SUBSCRIBE, }, chatId, this.mongoUserService);
      await this.telegramGeneralService.sendMessage(bot, chatId, 'OK, I will let you know once I see it is open'); // $$$$$$$$$$$$$$$$$$$$$$ more meaningful data on what is the subscription is about
    }
    this.flowStepsManagerService.resetCurrentUserStep(chatId);
  }
}
