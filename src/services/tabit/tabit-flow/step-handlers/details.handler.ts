import TelegramBot from 'node-telegram-bot-api';
import { LoggerService } from '@core/logger/logger.service';
import { UtilsService } from '@core/utils/utils.service';
import { IFlowStep, IUserFlowDetails } from '@services/tabit/interface';
import { FlowStepsManagerService } from '@services/tabit/tabit-flow/flow-steps-manager.service';
import { StepHandler } from '@services/tabit/tabit-flow/step-handlers/step.handler';
import { TabitApiService } from '@services/tabit/tabit-api/tabit-api.service';
import { TelegramGeneralService } from '@services/telegram/telegram-general.service';
import { ITabitRestaurant } from '@services/tabit/interface';

export class DetailsHandler extends StepHandler {
  constructor(
    private readonly bot: TelegramBot,
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly telegramGeneralService: TelegramGeneralService,
    private readonly flowStepsManagerService: FlowStepsManagerService,
    private readonly tabitApiService: TabitApiService,
  ) {
    super();
  }

  async handlePostUserAction(chatId: number, flowStepsOptions: IUserFlowDetails, flowStep: IFlowStep, userInput: string): Promise<void> {
    try {
      const restaurantDetails: ITabitRestaurant = await this.tabitApiService.getRestaurantDetails(userInput);
      if (!restaurantDetails) {
        const replyText = `I am sorry, I didn\'t find any restaurants matching your search - '${userInput}'`;
        await this.telegramGeneralService.sendMessage(this.bot, chatId, replyText);
      }
      if (!restaurantDetails.isOnlineBookingAvailable) {
        const replyText = `I see that the restaurant you selected doesn't support online booking, am I wrong? send me another restaurant link and I will check`;
        await this.telegramGeneralService.sendMessage(this.bot, chatId, replyText);
        this.flowStepsManagerService.resetCurrentUserStep(chatId);
      }
      this.flowStepsManagerService.addUserStepDetail(chatId, { restaurantDetails });
    } catch (err) {
      this.logger.error(`${DetailsHandler.name} - ${this.handlePostUserAction.name}`, `error - ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }
}