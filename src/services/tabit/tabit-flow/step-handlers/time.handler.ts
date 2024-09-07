import TelegramBot from 'node-telegram-bot-api';
import { LoggerService } from '@core/logger/logger.service';
import { UtilsService } from '@core/utils/utils.service';
import { IFlowStep, IInlineKeyboardButton, IUserFlowDetails } from '@services/tabit/interface';
import { BOT_BUTTONS_ACTIONS } from '@services/tabit/tabit.config';
import { FlowStepsManagerService } from '@services/tabit/tabit-flow/flow-steps-manager.service';
import { StepHandler } from '@services/tabit/tabit-flow/step-handlers/step.handler';
import { convertInlineKeyboardButtonToCallbackData } from '@services/tabit/tabit.utils';
import { TelegramGeneralService } from '@services/telegram/telegram-general.service';

const DAYS_OF_WEEK = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export class TimeHandler extends StepHandler {
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
      // get the available opening hours for the restaurant and show to the user
      const { restaurantDetails, date } = currentStepDetails;
      // const dayOfWeek = DAYS_OF_WEEK[new Date(date).getDay()];
      // const restaurantOpeningHours = restaurantDetails.openingHours;
      // const openingHours = restaurantOpeningHours[dayOfWeek] || restaurantOpeningHours['default'];
      const times = ['20:00', '21:00']; // this should be changed to hours with 30 minutes margin from the openingHours arrays

      const inlineKeyboardButtons = times.map((time: string) => {
        const callbackData = { action: BOT_BUTTONS_ACTIONS.TIME, data: time } as IInlineKeyboardButton;
        return { text: time, callback_data: convertInlineKeyboardButtonToCallbackData(callbackData) };
      });
      const inlineKeyboardMarkup = this.telegramGeneralService.getInlineKeyboardMarkup(inlineKeyboardButtons);
      const resText = flowStep.preUserActionResponseMessage;
      await this.telegramGeneralService.sendMessage(this.bot, chatId, resText, inlineKeyboardMarkup);
    } catch (err) {
      this.logger.error(`${TimeHandler.name} - ${this.handlePreUserAction.name}`, `error - ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  async handlePostUserAction(chatId: number, currentStepDetails: IUserFlowDetails, flowStep: IFlowStep, userInput: string): Promise<void> {
    try {
      const dayOfWeek = DAYS_OF_WEEK[new Date(currentStepDetails.date).getDay()];
      // const restaurantOpeningHours = currentStepDetails.restaurantDetails.openingHours;
      // const openingHours = restaurantOpeningHours[dayOfWeek] || restaurantOpeningHours['default'];
      // validate
      // transform

      // $$$$$$$$$$$$$$$$$$$$ dont forget to transform to utc from the user timezone
      const time = userInput;
      this.flowStepsManagerService.addUserStepDetail(chatId, { time });
    } catch (err) {
      this.logger.error(`${TimeHandler.name} - ${this.handlePostUserAction.name}`, `error - ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }
}
