import TelegramBot from 'node-telegram-bot-api';
import { LoggerService } from '@core/logger';
import { UtilsService } from '@core/utils';
import { TelegramGeneralService } from '@services/telegram/telegram-general.service';
import { IFlowStep, ITabitRestaurant, IUserFlowDetails } from '../../interface';
import { TabitApiService } from '../../tabit-api/tabit-api.service';
import { FlowStepsManagerService } from '../../tabit-flow/flow-steps-manager.service';
import { StepHandler } from '../../tabit-flow/step-handlers/step.handler';
import { TabitUtilsService } from '../../tabit-flow/tabit-utils.service';

export class DetailsHandler extends StepHandler {
  constructor(
    private readonly bot: TelegramBot,
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly telegramGeneralService: TelegramGeneralService,
    private readonly flowStepsManagerService: FlowStepsManagerService,
    private readonly tabitUtilsService: TabitUtilsService,
    private readonly tabitApiService: TabitApiService,
  ) {
    super();
  }

  validateInput(userInput: string): boolean {
    const restaurantId = this.tabitApiService.getRestaurantId(userInput);
    return !!restaurantId && userInput.toLowerCase().includes('tabit');
  }

  async handlePostUserAction(chatId: number, flowStepsOptions: IUserFlowDetails, flowStep: IFlowStep, userInput: string): Promise<void> {
    try {
      const isInputValid = this.validateInput(userInput);
      if (!isInputValid) {
        await this.telegramGeneralService.sendMessage(this.bot, chatId, `I am sorry, I didn't find any restaurants matching your search - '${userInput}'`);
        return;
      }
      const restaurantId = this.tabitApiService.getRestaurantId(userInput);
      const restaurantDetails: ITabitRestaurant = await this.tabitApiService.getRestaurantDetails(restaurantId);
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
