import TelegramBot from 'node-telegram-bot-api';
import { DAYS_OF_WEEK } from '@core/config/main.config';
import { LoggerService } from '@core/logger/logger.service';
import { UtilsService } from '@core/utils/utils.service';
import { IFlowStep, IFlowStepType, IInlineKeyboardButton, ITabitRestaurantReservationHour, IUserFlowDetails } from '@services/tabit/interface';
import { BOT_BUTTONS_ACTIONS } from '@services/tabit/tabit.config';
import { FlowStepsManagerService } from '@services/tabit/tabit-flow/flow-steps-manager.service';
import { StepHandler } from '@services/tabit/tabit-flow/step-handlers/step.handler';
import { TabitUtilsService } from '@services/tabit/tabit-flow/tabit-utils.service';
import { TelegramGeneralService } from '@services/telegram';

const POPULAR_HOURS = ['12:00', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30'];

export class TimeHandler extends StepHandler {
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
    const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return regex.test(userInput);
  }

  transformInput(userInput: string) {
    return userInput;
  }

  async handlePreUserAction(chatId: number, currentStepDetails: IUserFlowDetails, flowStep: IFlowStep): Promise<void> {
    try {
      const { restaurantDetails, date } = currentStepDetails;
      const dayOfWeek = DAYS_OF_WEEK[new Date(date).getDay()].toLowerCase().slice(0, 3);
      const relevantReservationHoursDay = restaurantDetails.reservationHours[dayOfWeek] || restaurantDetails.reservationHours['default'];
      const availableTimes = this.getAvailableTimes(relevantReservationHoursDay, 15);
      availableTimes.forEach((time: string) => {
        if (POPULAR_HOURS.includes(time)) {
          const index = availableTimes.indexOf(time);
          availableTimes.splice(index, 1);
          availableTimes.unshift(time);
        }
      });
      const times = availableTimes.slice(0, 9).sort();

      const inlineKeyboardButtons = times.map((time: string) => {
        const callbackData = { action: BOT_BUTTONS_ACTIONS.TIME, data: time } as IInlineKeyboardButton;
        return { text: time, callback_data: this.tabitUtilsService.convertInlineKeyboardButtonToCallbackData(callbackData) };
      });
      const inlineKeyboardMarkup = this.telegramGeneralService.getInlineKeyboardMarkup(inlineKeyboardButtons, 3);
      const { message_id } = await this.telegramGeneralService.sendMessage(this.bot, chatId, flowStep.preUserActionResponseMessage, inlineKeyboardMarkup);
      this.flowStepsManagerService.updateUserStepMessageId(chatId, IFlowStepType.TIME, message_id);
    } catch (err) {
      this.logger.error(`${TimeHandler.name} - ${this.handlePreUserAction.name}`, `error - ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  async handlePostUserAction(chatId: number, currentStepDetails: IUserFlowDetails, flowStep: IFlowStep, userInput: string): Promise<void> {
    try {
      const isInputValid = this.validateInput(userInput);
      if (!isInputValid) {
        await this.telegramGeneralService.sendMessage(this.bot, chatId, 'I think this is not the right time format, I am looking for something like hh:mm');
        return;
      }
      const time = this.transformInput(userInput);
      const [hours, minutes] = time.split(':').map(Number);
      currentStepDetails.date.setHours(hours, minutes, 0, 0);
      this.flowStepsManagerService.addUserStepDetail(chatId, { time, date: currentStepDetails.date });
      const { botQuestionsMessageIds } = currentStepDetails;
      if (botQuestionsMessageIds[IFlowStepType.TIME]) {
        await this.telegramGeneralService.deleteMessage(this.bot, chatId, botQuestionsMessageIds[IFlowStepType.TIME]);
      }
      await this.telegramGeneralService.sendMessage(this.bot, chatId, `Time: ${time}`);
    } catch (err) {
      this.logger.error(`${TimeHandler.name} - ${this.handlePostUserAction.name}`, `error - ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  private getAvailableTimes(timeRanges: ITabitRestaurantReservationHour[], minutesGap: number): string[] {
    const times: string[] = [];
    timeRanges.forEach((timeRange: ITabitRestaurantReservationHour) => {
      times.push(...this.getAvailableTimesForRange(timeRange, minutesGap));
    });
    return Array.from(new Set(times)).sort();
  }

  private getAvailableTimesForRange(timeRange: ITabitRestaurantReservationHour, minutesGap: number): string[] {
    const times: string[] = [];

    // Parse the input times into Date objects
    const startTime = new Date();
    const endTime = new Date();

    const [startHours, startMinutes] = timeRange.from.split(':').map(Number);
    const [endHours, endMinutes] = timeRange.to.split(':').map(Number);

    startTime.setHours(startHours, startMinutes, 0, 0);
    endTime.setHours(endHours, endMinutes, 0, 0);

    const currentTime = new Date(startTime);

    // Loop to add times in 15-minute increments
    while (currentTime <= endTime) {
      const formattedTime = currentTime.toTimeString().slice(0, 5); // Format as HH:mm
      times.push(formattedTime);

      // Increment time by 15 minutes
      currentTime.setMinutes(currentTime.getMinutes() + minutesGap);
    }

    return times;
  }
}
