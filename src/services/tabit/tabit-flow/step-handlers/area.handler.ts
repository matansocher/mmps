import TelegramBot from 'node-telegram-bot-api';
import { LoggerService } from '@core/logger';
import { UtilsService } from '@core/utils';
import { TelegramGeneralService } from '@services/telegram';
import { IFlowStep, IFlowStepType, IInlineKeyboardButton, ITabitRestaurantArea, IUserFlowDetails } from '../../interface';
import { FlowStepsManagerService } from '../../tabit-flow/flow-steps-manager.service';
import { StepHandler } from '../../tabit-flow/step-handlers/step.handler';
import { TabitUtilsService } from '../../tabit-flow/tabit-utils.service';
import { ANY_AREA, BOT_BUTTONS_ACTIONS } from '../../tabit.config';

export class AreaHandler extends StepHandler {
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

  validateInput(userInput: string, { currentStepDetails }): boolean {
    const { restaurantDetails } = currentStepDetails;
    const relevantArea = [...restaurantDetails.areas, { displayName: ANY_AREA, name: ANY_AREA }].find((area: ITabitRestaurantArea) => area.displayName === userInput);
    return !!relevantArea;
  }

  transformInput(userInput: string, { restaurantDetails }): string {
    const relevantArea = [...restaurantDetails.areas, { displayName: ANY_AREA, name: ANY_AREA }].find((area: ITabitRestaurantArea) => area.displayName === userInput);
    return relevantArea.name;
  }

  async handlePreUserAction(chatId: number, currentStepDetails: IUserFlowDetails, flowStep: IFlowStep): Promise<void> {
    try {
      const { restaurantDetails } = currentStepDetails;
      const areas = restaurantDetails.areas?.map((area: ITabitRestaurantArea) => area.displayName) || [];
      areas.push(ANY_AREA);

      const inlineKeyboardButtons = areas.map((area: string) => {
        const callbackData = { action: BOT_BUTTONS_ACTIONS.AREA, data: area } as IInlineKeyboardButton;
        return { text: area, callback_data: this.tabitUtilsService.convertInlineKeyboardButtonToCallbackData(callbackData) };
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
