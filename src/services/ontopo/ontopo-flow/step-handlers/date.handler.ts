import TelegramBot from 'node-telegram-bot-api';
import { LoggerService } from '@core/logger/logger.service';
import { UtilsService } from '@core/utils/utils.service';
import { IUserFlowDetails, IInlineKeyboardButton, IFlowStep, IFlowStepType } from '@services/ontopo/interface';
import { FlowStepsManagerService } from '@services/ontopo/ontopo-flow/flow-steps-manager.service';
import { StepHandler } from '@services/ontopo/ontopo-flow/step-handlers/step.handler';
import { OntopoUtilsService } from '@services/ontopo/ontopo-flow/ontopo-utils.service';
import { BOT_BUTTONS_ACTIONS } from '@services/ontopo/ontopo.config';
import { TelegramGeneralService } from '@services/telegram/telegram-general.service';

export class DateHandler extends StepHandler {
  constructor(
    private readonly bot: TelegramBot,
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly telegramGeneralService: TelegramGeneralService,
    private readonly flowStepsManagerService: FlowStepsManagerService,
    private readonly ontopoUtilsService: OntopoUtilsService,
  ) {
    super();
  }

  validateInput(userInput: string): boolean {
    const regex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
    return regex.test(userInput);
  }

  transformInput(userInput: string): Date {
    return new Date(new Date(userInput).setHours(0, 0, 0, 0));
  }

  async handlePreUserAction(chatId: number, currentStepDetails: IUserFlowDetails, flowStep: IFlowStep): Promise<void> {
    try {
      const { restaurantDetails } = currentStepDetails;
      const dates = this.getDatesForNextXMonths().slice(0, 10);
      const inlineKeyboardButtons = dates.map((date: string) => {
        const callbackData = { action: BOT_BUTTONS_ACTIONS.DATE, data: date } as IInlineKeyboardButton;
        return { text: date, callback_data: this.ontopoUtilsService.convertInlineKeyboardButtonToCallbackData(callbackData) };
      });
      const inlineKeyboardMarkup = this.telegramGeneralService.getInlineKeyboardMarkup(inlineKeyboardButtons, 2);
      const { message_id } = await this.telegramGeneralService.sendMessage(this.bot, chatId, flowStep.preUserActionResponseMessage, inlineKeyboardMarkup);
      this.flowStepsManagerService.updateUserStepMessageId(chatId, IFlowStepType.DATE, message_id);
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
      const { botQuestionsMessageIds } = currentStepDetails;
      if (botQuestionsMessageIds[IFlowStepType.DATE]) {
        await this.telegramGeneralService.deleteMessage(this.bot, chatId, botQuestionsMessageIds[IFlowStepType.DATE]);
      }
      await this.telegramGeneralService.sendMessage(this.bot, chatId, `Date: ${this.ontopoUtilsService.getDateStringFormat(date)}`);
    } catch (err) {
      this.logger.error(`${DateHandler.name} - ${this.handlePostUserAction.name}`, `error - ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  private getDatesForNextXMonths(): string[] {
    const dates: string[] = [];
    const today = new Date();

    // Get the date two months from now
    const twoMonthsFromNow = new Date(today);
    twoMonthsFromNow.setMonth(today.getMonth() + 2);

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
