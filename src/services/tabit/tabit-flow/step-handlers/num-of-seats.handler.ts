import TelegramBot from 'node-telegram-bot-api';
import { LoggerService } from '@core/logger/logger.service';
import { UtilsService } from '@core/utils/utils.service';
import { IFlowStep, IInlineKeyboardButton, IUserFlowDetails } from '@services/tabit/interface';
import { BOT_BUTTONS_ACTIONS } from '@services/tabit/tabit.config';
import { FlowStepsManagerService } from '@services/tabit/tabit-flow/flow-steps-manager.service';
import { StepHandler } from '@services/tabit/tabit-flow/step-handlers/step.handler';
import { convertInlineKeyboardButtonToCallbackData } from '@services/tabit/tabit.utils';
import { TelegramGeneralService } from '@services/telegram/telegram-general.service';

export class NumOfSeatsHandler extends StepHandler {
  constructor(
    private readonly bot: TelegramBot,
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly telegramGeneralService: TelegramGeneralService,
    private readonly flowStepsManagerService: FlowStepsManagerService,
  ) {
    super();
  }

  async handlePreUserAction(chatId: number, currentStepDetails: IUserFlowDetails, flowStep: IFlowStep): Promise<void> {
    try {
      // get possible num of seats for the restaurant and show to the user
      const { restaurantDetails } = currentStepDetails;
      const options = [];
      for (let i = 1; i < restaurantDetails.maxNumOfSeats; i++) {
        options.push(i.toString());
      }
      const inlineKeyboardButtons = options.map((option: string) => {
        const callbackData = { action: BOT_BUTTONS_ACTIONS.NUM_OF_SEATS, data: option } as IInlineKeyboardButton;
        return { text: option, callback_data: convertInlineKeyboardButtonToCallbackData(callbackData) };
      });
      const inlineKeyboardMarkup = this.telegramGeneralService.getInlineKeyboardMarkup(inlineKeyboardButtons);
      const resText = flowStep.preUserActionResponseMessage;
      await this.telegramGeneralService.sendMessage(this.bot, chatId, resText, inlineKeyboardMarkup);
    } catch (err) {
      this.logger.error(`${NumOfSeatsHandler.name} - ${this.handlePreUserAction.name}`, `error - ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  async handlePostUserAction(chatId: number, currentStepDetails: IUserFlowDetails, flowStep: IFlowStep, userInput: string): Promise<void> {
    try {
      const numOfSeats = parseInt(userInput);
      if (isNaN(numOfSeats)) {
        await this.telegramGeneralService.sendMessage(this.bot, chatId, 'Please enter a valid number of seats');
        return;
      }
      this.flowStepsManagerService.addUserStepDetail(chatId, { numOfSeats });
    } catch (err) {
      this.logger.error(`${NumOfSeatsHandler.name} - ${this.handlePostUserAction.name}`, `error - ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }
}
