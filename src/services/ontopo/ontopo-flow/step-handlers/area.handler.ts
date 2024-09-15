import TelegramBot from 'node-telegram-bot-api';
import { LoggerService } from '@core/logger/logger.service';
import { UtilsService } from '@core/utils/utils.service';
import { IFlowStep, IFlowStepType, IInlineKeyboardButton, IOntopoRestaurantArea, IUserFlowDetails } from '@services/ontopo/interface';
import { FlowStepsManagerService } from '@services/ontopo/ontopo-flow/flow-steps-manager.service';
import { StepHandler } from '@services/ontopo/ontopo-flow/step-handlers/step.handler';
import { OntopoUtilsService } from '@services/ontopo/ontopo-flow/ontopo-utils.service';
import { BOT_BUTTONS_ACTIONS } from '@services/ontopo/ontopo.config';
import { TelegramGeneralService } from '@services/telegram/telegram-general.service';

export class AreaHandler extends StepHandler {
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

  validateInput(userInput: string, { currentStepDetails }): boolean {
    const { restaurantDetails } = currentStepDetails;
    const relevantArea = restaurantDetails.areas.find((area: IOntopoRestaurantArea) => area.displayName === userInput);
    return !!relevantArea;
  }

  transformInput(userInput: string, { restaurantDetails }) {
    const relevantArea = restaurantDetails.areas.find((area: IOntopoRestaurantArea) => area.displayName === userInput);
    return relevantArea.name;
  }

  async handlePreUserAction(chatId: number, currentStepDetails: IUserFlowDetails, flowStep: IFlowStep): Promise<void> {
    try {
      const { restaurantDetails } = currentStepDetails;
      const areas = restaurantDetails.areas.map((area: IOntopoRestaurantArea) => area.displayName);
      const inlineKeyboardButtons = areas.map((area: string) => {
        const callbackData = { action: BOT_BUTTONS_ACTIONS.AREA, data: area } as IInlineKeyboardButton;
        return { text: area, callback_data: this.ontopoUtilsService.convertInlineKeyboardButtonToCallbackData(callbackData) };
      });
      const inlineKeyboardMarkup = this.telegramGeneralService.getInlineKeyboardMarkup(inlineKeyboardButtons, 2);
      const { message_id } = await this.telegramGeneralService.sendMessage(this.bot, chatId, flowStep.preUserActionResponseMessage, inlineKeyboardMarkup);
      this.flowStepsManagerService.updateUserStepMessageId(chatId, IFlowStepType.AREA, message_id);
    } catch (err) {
      this.logger.error(`${AreaHandler.name} - ${this.handlePreUserAction.name}`, `error - ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  async handlePostUserAction(chatId: number, currentStepDetails: IUserFlowDetails, flowStep: IFlowStep, userInput: string): Promise<void> {
    try {
      const isInputValid = this.validateInput(userInput, { currentStepDetails });
      if (!isInputValid) {
        await this.telegramGeneralService.sendMessage(this.bot, chatId, `I dont think there is an area called ${userInput} in the restaurant, please choose something that exists`);
        return;
      }
      const area = this.transformInput(userInput, { restaurantDetails: currentStepDetails.restaurantDetails });
      this.flowStepsManagerService.addUserStepDetail(chatId, { area });
      const { botQuestionsMessageIds } = currentStepDetails;
      if (botQuestionsMessageIds[IFlowStepType.AREA]) {
        await this.telegramGeneralService.deleteMessage(this.bot, chatId, botQuestionsMessageIds[IFlowStepType.AREA]);
      }
      await this.telegramGeneralService.sendMessage(this.bot, chatId, `Where: ${area}`);
    } catch (err) {
      this.logger.error(`${AreaHandler.name} - ${this.handlePostUserAction.name}`, `error - ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }
}
