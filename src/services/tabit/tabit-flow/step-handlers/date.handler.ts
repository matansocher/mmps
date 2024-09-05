import TelegramBot from 'node-telegram-bot-api';
import { LoggerService } from '@core/logger/logger.service';
import { UtilsService } from '@core/utils/utils.service';
import { IUserFlowDetails, IInlineKeyboardButton, IFlowStep } from '@services/tabit/interface';
import { FlowStepsManagerService } from '@services/tabit/tabit-flow/flow-steps-manager.service';
import { StepHandler } from '@services/tabit/tabit-flow/step-handlers/step.handler';
import { BOT_BUTTONS_ACTIONS } from '@services/tabit/tabit.config';
import { convertInlineKeyboardButtonToCallbackData } from '@services/tabit/tabit.utils';
import { TelegramGeneralService } from '@services/telegram/telegram-general.service';

export class DateHandler extends StepHandler {
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
      // get first 10 of the available dates for the restaurant and show to the user
      const { restaurantDetails } = currentStepDetails;
      const dates = ['2024-11-01', '2024-11-02'];
      const inlineKeyboardButtons = dates.map((date: string) => {
        const callbackData = { action: BOT_BUTTONS_ACTIONS.DATE, data: date } as IInlineKeyboardButton;
        return { text: date, callback_data: convertInlineKeyboardButtonToCallbackData(callbackData) };
      });
      const inlineKeyboardMarkup = this.telegramGeneralService.getInlineKeyboardMarkup(inlineKeyboardButtons);
      const resText = flowStep.preUserActionResponseMessage;
      await this.telegramGeneralService.sendMessage(this.bot, chatId, resText, inlineKeyboardMarkup);
    } catch (err) {
      this.logger.error(`${DateHandler.name} - ${this.handlePreUserAction.name}`, `error - ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  async handlePostUserAction(chatId: number, currentStepDetails: IUserFlowDetails, flowStep: IFlowStep, userInput: string): Promise<void> {
    try {
      // validate
      // transform
      const date = userInput;
      this.flowStepsManagerService.addUserStepDetail(chatId, { date });
    } catch (err) {
      this.logger.error(`${DateHandler.name} - ${this.handlePostUserAction.name}`, `error - ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }
}
