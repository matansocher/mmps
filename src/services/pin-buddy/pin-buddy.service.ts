import { PinBuddyUtilsService } from '@services/pin-buddy/pin-buddy-utils.service';
import { PIN_BUDDY_OPTIONS } from '@services/pin-buddy/pin-buddy.config';
import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Inject, Injectable } from '@nestjs/common';
import { BOTS } from '@services/telegram/telegram.config';
import { LoggerService } from '@core/logger/logger.service';
import { VoicePalMongoAnalyticLogService, VoicePalMongoUserService } from '@core/mongo/voice-pal-mongo/services';
import { ITelegramMessageData, MessageLoaderOptions } from '@services/telegram/interface';
import { MessageLoaderService } from '@services/telegram/message-loader.service';
import { TelegramGeneralService } from '@services/telegram/telegram-general.service';
import { UtilsService } from '@services/utils/utils.service';
import { IVoicePalOption } from '@services/voice-pal/interface';
import { UserSelectedActionsService } from '@services/pin-buddy/user-selected-actions.service';
import { ANALYTIC_EVENT_NAMES, ANALYTIC_EVENT_STATES } from './pin-buddy.config';

@Injectable()
export class PinBuddyService {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly messageLoaderService: MessageLoaderService,
    private readonly pinBuddyUtilsService: PinBuddyUtilsService,
    private readonly mongoUserService: VoicePalMongoUserService,
    private readonly mongoAnalyticLogService: VoicePalMongoAnalyticLogService,
    private readonly telegramGeneralService: TelegramGeneralService,
    private readonly userSelectedActionsService: UserSelectedActionsService,
    @Inject(BOTS.VOICE_PAL.name) private readonly bot: TelegramBot,
  ) {}

  async handleActionSelection(selection, { telegramUserId, chatId, firstName, lastName, username }: Partial<ITelegramMessageData>) {
    const relevantAction = Object.keys(PIN_BUDDY_OPTIONS).find((option: string) => PIN_BUDDY_OPTIONS[option].displayName === selection);

    let replyText = PIN_BUDDY_OPTIONS[relevantAction].selectedActionResponse;
    if (selection === PIN_BUDDY_OPTIONS.START.displayName) {
      this.mongoUserService.saveUserDetails({ telegramUserId, chatId, firstName, lastName, username });
      replyText = replyText.replace('{name}', firstName || username || '');
    } else {
      this.userSelectedActionsService.setCurrentUserAction(chatId, selection);
    }

    const analyticAction = ANALYTIC_EVENT_NAMES[selection];
    this.mongoAnalyticLogService.sendAnalyticLog(`${analyticAction} - ${ANALYTIC_EVENT_STATES.SET_ACTION}`, { chatId });

    this.logger.info(this.handleActionSelection.name, `chatId: ${chatId}, selection: ${selection}`);

    await this.telegramGeneralService.sendMessage(this.bot, chatId, replyText, this.pinBuddyUtilsService.getKeyboardOptions());
  }

  async handleAction(message: Message, userAction: IVoicePalOption) {
    const { chatId, text, audio, video, photo } = this.telegramGeneralService.getMessageData(message);

    if (!userAction) {
      return this.telegramGeneralService.sendMessage(this.bot, chatId, `Please select an action first.`);
    }

    const inputErrorMessage = this.pinBuddyUtilsService.validateActionWithMessage(userAction, { text, audio, video, photo });
    if (inputErrorMessage) {
      return this.telegramGeneralService.sendMessage(this.bot, chatId, inputErrorMessage, this.pinBuddyUtilsService.getKeyboardOptions());
    }

    const analyticAction = ANALYTIC_EVENT_NAMES[userAction.displayName];
    try {
      if (userAction && userAction.showLoader) {
        await this.messageLoaderService.handleMessageWithLoader(
          this.bot,
          chatId,
          { cycleDuration: 5000, loadingAction: userAction.loaderType } as MessageLoaderOptions,
          async (): Promise<void> => {
            await this[userAction.handler]({ chatId, text, audio, video, photo });
          },
        );
      } else {
        await this[userAction.handler]({ chatId, text, audio, video, photo });
      }

      this.mongoAnalyticLogService.sendAnalyticLog(`${analyticAction} - ${ANALYTIC_EVENT_STATES.FULFILLED}`, { chatId });
    } catch (err) {
      const errorMessage = this.utilsService.getErrorMessage(err);
      this.logger.error(this.handleAction.name, `error: ${errorMessage}`);
      this.mongoAnalyticLogService.sendAnalyticLog(`${analyticAction} - ${ANALYTIC_EVENT_STATES.ERROR}`, { chatId, error: errorMessage });
      throw err;
    }
  }

  async handleTranscribeAction({ chatId, video, audio }: Partial<ITelegramMessageData>): Promise<void> {
    try {
      await this.telegramGeneralService.sendMessage(this.bot, chatId, 'resText', this.pinBuddyUtilsService.getKeyboardOptions());
    } catch (err) {
      this.logger.error(this.handleTranscribeAction.name, `error: ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }
}
