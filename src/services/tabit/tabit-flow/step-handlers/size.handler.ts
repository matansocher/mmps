import TelegramBot from 'node-telegram-bot-api';
import { LoggerService } from '@core/logger';
import { UtilsService } from '@core/utils';
import { TelegramGeneralService } from '@services/telegram';
import { IFlowStep, IFlowStepType, IInlineKeyboardButton, IUserFlowDetails } from '../../interface';
import { BOT_BUTTONS_ACTIONS } from '../../tabit.config';
import { FlowStepsManagerService } from '../../tabit-flow/flow-steps-manager.service';
import { StepHandler } from '../../tabit-flow/step-handlers/step.handler';
import { TabitUtilsService } from '../../tabit-flow/tabit-utils.service';

const RESERVATION_MAX_SIZE = 8;

export class SizeHandler extends StepHandler {
  constructor(
    private readonly bot: TelegramBot,
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly telegramGeneralService: TelegramGeneralService,
    private readonly flowStepsManagerService: FlowStepsManagerService,
    private readonly tabitUtilsService: TabitUtilsService,
  ) {
    super();
  }

  validateInput(userInput: string): boolean {
    try {
      return !isNaN(parseInt(userInput));
    } catch (e) {
      return false;
    }
  }

  transformInput(userInput: string): number {
    return parseInt(userInput);
  }

  async handlePreUserAction(chatId: number, currentStepDetails: IUserFlowDetails, flowStep: IFlowStep): Promise<void> {
    try {
      const options = [];
      for (let i = 1; i <= RESERVATION_MAX_SIZE; i++) {
        options.push(i.toString());
      }
      const inlineKeyboardButtons = options.map((option: string) => {
        const callbackData = { action: BOT_BUTTONS_ACTIONS.SIZE, data: option } as IInlineKeyboardButton;
        return { text: option, callback_data: this.tabitUtilsService.convertInlineKeyboardButtonToCallbackData(callbackData) };
      });
      const inlineKeyboardMarkup = this.telegramGeneralService.getInlineKeyboardMarkup(inlineKeyboardButtons, 4);
      const { message_id } = await this.telegramGeneralService.sendMessage(this.bot, chatId, flowStep.preUserActionResponseMessage, inlineKeyboardMarkup);
      this.flowStepsManagerService.updateUserStepMessageId(chatId, IFlowStepType.SIZE, message_id);
    } catch (err) {
      this.logger.error(`${SizeHandler.name} - ${this.handlePreUserAction.name}`, `error - ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  async handlePostUserAction(chatId: number, currentStepDetails: IUserFlowDetails, flowStep: IFlowStep, userInput: string): Promise<void> {
    try {
      const isInputValid = this.validateInput(userInput);
      if (!isInputValid) {
        await this.telegramGeneralService.sendMessage(this.bot, chatId, 'Please enter a valid number of party size', {});
        return;
      }
      const size = this.transformInput(userInput);
      this.flowStepsManagerService.addUserStepDetail(chatId, { size });
      const { botQuestionsMessageIds } = currentStepDetails;
      if (botQuestionsMessageIds[IFlowStepType.SIZE]) {
        await this.telegramGeneralService.deleteMessage(this.bot, chatId, botQuestionsMessageIds[IFlowStepType.SIZE]);
      }
      await this.telegramGeneralService.sendMessage(this.bot, chatId, `How many: ${size}`);
    } catch (err) {
      this.logger.error(`${SizeHandler.name} - ${this.handlePostUserAction.name}`, `error - ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }
}
