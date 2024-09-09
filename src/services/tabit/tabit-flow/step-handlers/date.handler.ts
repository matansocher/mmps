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

  validateInput(userInput: string): boolean {
    const regex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
    return regex.test(userInput);
  }

  transformInput(userInput: string) {
    return new Date(new Date(userInput).setHours(0, 0, 0, 0));
  }

  async handlePreUserAction(chatId: number, currentStepDetails: IUserFlowDetails, flowStep: IFlowStep): Promise<void> {
    try {
      const { restaurantDetails } = currentStepDetails;
      const dates = this.getDatesForNextXMonths(restaurantDetails.maxMonthsAhead).slice(0, 10);
      const inlineKeyboardButtons = dates.map((date: string) => {
        const callbackData = { action: BOT_BUTTONS_ACTIONS.DATE, data: date } as IInlineKeyboardButton;
        return { text: date, callback_data: convertInlineKeyboardButtonToCallbackData(callbackData) };
      });
      const inlineKeyboardMarkup = this.telegramGeneralService.getInlineKeyboardMarkup(inlineKeyboardButtons, 2);
      await this.telegramGeneralService.sendMessage(this.bot, chatId, flowStep.preUserActionResponseMessage, inlineKeyboardMarkup);
    } catch (err) {
      this.logger.error(`${DateHandler.name} - ${this.handlePreUserAction.name}`, `error - ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  async handlePostUserAction(chatId: number, currentStepDetails: IUserFlowDetails, flowStep: IFlowStep, userInput: string): Promise<void> {
    try {
      const isInputValid = this.validateInput(userInput);
      if (!isInputValid) {
        await this.telegramGeneralService.sendMessage(this.bot, chatId, 'I think this is not the right date format, I am looking for something like yyyy-mm-dd');
        return;
      }
      const date = this.transformInput(userInput);
      this.flowStepsManagerService.addUserStepDetail(chatId, { date });
    } catch (err) {
      this.logger.error(`${DateHandler.name} - ${this.handlePostUserAction.name}`, `error - ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  private getDatesForNextXMonths(numOfMonths): string[] {
    const dates: string[] = [];
    const today = new Date();

    // Get the date two months from now
    const twoMonthsFromNow = new Date(today);
    twoMonthsFromNow.setMonth(today.getMonth() + numOfMonths);

    const currentDate = new Date(today);

    while (currentDate <= twoMonthsFromNow) {
      // Format the date to yyyy-mm-dd
      const formattedDate = currentDate.toISOString().split('T')[0];
      dates.push(formattedDate);

      // Move to the next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  }
}
