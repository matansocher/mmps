import TelegramBot from 'node-telegram-bot-api';
import { LoggerService } from '@core/logger/logger.service';
import { UtilsService } from '@core/utils/utils.service';
import { IFlowStep, IOntopoRestaurant, IUserFlowDetails } from '@services/ontopo/interface';
import { OntopoApiService } from '@services/ontopo/ontopo-api/ontopo-api.service';
import { FlowStepsManagerService } from '@services/ontopo/ontopo-flow/flow-steps-manager.service';
import { StepHandler } from '@services/ontopo/ontopo-flow/step-handlers/step.handler';
import { OntopoUtilsService } from '@services/ontopo/ontopo-flow/ontopo-utils.service';
import { TelegramGeneralService } from '@services/telegram/telegram-general.service';

export class DetailsHandler extends StepHandler {
  constructor(
    private readonly bot: TelegramBot,
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly telegramGeneralService: TelegramGeneralService,
    private readonly flowStepsManagerService: FlowStepsManagerService,
    private readonly ontopoUtilsService: OntopoUtilsService,
    private readonly ontopoApiService: OntopoApiService,
  ) {
    super();
  }

  validateInput(userInput: string): boolean {
    // $$$$$$$$$$$$$$$$$$$$$$$$$ how do I validate the user input - currently if no result of restaurant details - case is handled here below
    return true;
  }

  async handlePostUserAction(chatId: number, flowStepsOptions: IUserFlowDetails, flowStep: IFlowStep, userInput: string): Promise<void> {
    try {
      const isInputValid = this.validateInput(userInput);
      if (!isInputValid) {
        await this.telegramGeneralService.sendMessage(this.bot, chatId, `I am sorry, I didn't find any restaurants matching your search - '${userInput}'`);
        return;
      }
      // const restaurantId = this.ontopoApiService.getRestaurantId(userInput);
      const restaurantDetails: IOntopoRestaurant = await this.ontopoApiService.getRestaurantDetails(userInput);
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