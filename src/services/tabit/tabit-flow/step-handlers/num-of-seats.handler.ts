import TelegramBot from 'node-telegram-bot-api';
import { LoggerService } from '@core/logger/logger.service';
import { UtilsService } from '@core/utils/utils.service';
import { IFlowStep, IFlowStepType, IInlineKeyboardButton, IUserFlowDetails } from '@services/tabit/interface';
import { BOT_BUTTONS_ACTIONS } from '@services/tabit/tabit.config';
import { FlowStepsManagerService } from '@services/tabit/tabit-flow/flow-steps-manager.service';
import { StepHandler } from '@services/tabit/tabit-flow/step-handlers/step.handler';
import { TabitUtilsService } from '@services/tabit/tabit-flow/tabit-utils.service';
import { TelegramGeneralService } from '@services/telegram/telegram-general.service';

export class NumOfSeatsHandler extends StepHandler {
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

  transformInput(userInput: string) {
    return parseInt(userInput);
  }

  async handlePreUserAction(chatId: number, currentStepDetails: IUserFlowDetails, flowStep: IFlowStep): Promise<void> {
    try {
      const { restaurantDetails } = currentStepDetails;
      const options = [];
      for (let i = 1; i < restaurantDetails.maxNumOfSeats; i++) {
        options.push(i.toString());
      }
      const inlineKeyboardButtons = options.map((option: string) => {
        const callbackData = { action: BOT_BUTTONS_ACTIONS.NUM_OF_SEATS, data: option } as IInlineKeyboardButton;
        return { text: option, callback_data: this.tabitUtilsService.convertInlineKeyboardButtonToCallbackData(callbackData) };
      });
      const inlineKeyboardMarkup = this.telegramGeneralService.getInlineKeyboardMarkup(inlineKeyboardButtons, 4);
      const { message_id } = await this.telegramGeneralService.sendMessage(this.bot, chatId, flowStep.preUserActionResponseMessage, inlineKeyboardMarkup);
      this.flowStepsManagerService.updateUserStepMessageId(chatId, IFlowStepType.NUM_OF_SEATS, message_id);
    } catch (err) {
      this.logger.error(`${NumOfSeatsHandler.name} - ${this.handlePreUserAction.name}`, `error - ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  async handlePostUserAction(chatId: number, currentStepDetails: IUserFlowDetails, flowStep: IFlowStep, userInput: string): Promise<void> {
    try {
      const isInputValid = this.validateInput(userInput);
      if (!isInputValid) {
        await this.telegramGeneralService.sendMessage(this.bot, chatId, 'Please enter a valid number of seats', {});
        return;
      }
      const numOfSeats = this.transformInput(userInput);
      this.flowStepsManagerService.addUserStepDetail(chatId, { numOfSeats });
      const { botQuestionsMessageIds } = currentStepDetails;
      if (botQuestionsMessageIds[IFlowStepType.NUM_OF_SEATS]) {
        await this.telegramGeneralService.deleteMessage(this.bot, chatId, botQuestionsMessageIds[IFlowStepType.NUM_OF_SEATS]);
      }
      await this.telegramGeneralService.sendMessage(this.bot, chatId, `How many: ${numOfSeats}`);
    } catch (err) {
      this.logger.error(`${NumOfSeatsHandler.name} - ${this.handlePostUserAction.name}`, `error - ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }
}
