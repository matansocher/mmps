import TelegramBot from 'node-telegram-bot-api';
import { LoggerService } from '@core/logger/logger.service';
import { UtilsService } from '@core/utils/utils.service';
import { IFlowStep, IInlineKeyboardButton, ITabitRestaurantArea, IUserFlowDetails } from '@services/tabit/interface';
import { FlowStepsManagerService } from '@services/tabit/tabit-flow/flow-steps-manager.service';
import { StepHandler } from '@services/tabit/tabit-flow/step-handlers/step.handler';
import { BOT_BUTTONS_ACTIONS } from '@services/tabit/tabit.config';
import { convertInlineKeyboardButtonToCallbackData } from '@services/tabit/tabit.utils';
import { TelegramGeneralService } from '@services/telegram/telegram-general.service';

export class AreaHandler extends StepHandler {
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
      // get the available areas for the restaurant and show to the user
      const { restaurantDetails } = currentStepDetails;
      const areas = restaurantDetails.areas.map((area: ITabitRestaurantArea) => area.displayName);
      const inlineKeyboardButtons = areas.map((area: string) => {
        const callbackData = { action: BOT_BUTTONS_ACTIONS.AREA, data: area } as IInlineKeyboardButton;
        return { text: area, callback_data: convertInlineKeyboardButtonToCallbackData(callbackData) };
      });
      const inlineKeyboardMarkup = this.telegramGeneralService.getInlineKeyboardMarkup(inlineKeyboardButtons);
      const resText = flowStep.preUserActionResponseMessage;
      await this.telegramGeneralService.sendMessage(this.bot, chatId, resText, inlineKeyboardMarkup);
    } catch (err) {
      this.logger.error(`${AreaHandler.name} - ${this.handlePreUserAction.name}`, `error - ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  async handlePostUserAction(chatId: number, currentStepDetails: IUserFlowDetails, flowStep: IFlowStep, userInput: string): Promise<void> {
    try {
      // validate in front of restaurantDetails
      const { restaurantDetails } = currentStepDetails;
      // transform
      const time = userInput;
      this.flowStepsManagerService.addUserStepDetail(chatId, { time });
    } catch (err) {
      this.logger.error(`${AreaHandler.name} - ${this.handlePostUserAction.name}`, `error - ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }
}
