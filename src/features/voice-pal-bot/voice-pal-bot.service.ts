import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Inject, Injectable } from '@nestjs/common';
import { BOTS } from '@core/config/telegram.config';
import { LoggerService } from '@core/logger/logger.service';
import { TelegramGeneralService } from '@services/telegram/telegram-general.service';
import { UtilsService } from '@services/utils/utils.service';
import { UserSelectedActionsService } from '@services/voice-pal/user-selected-actions.service';
import { VOICE_PAL_OPTIONS } from '@services/voice-pal/voice-pal.config';
import { VoicePalService } from '@services/voice-pal/voice-pal.service';

@Injectable()
export class VoicePalBotService {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly userSelectedActionsService: UserSelectedActionsService,
    private readonly telegramGeneralService: TelegramGeneralService,
    private readonly voicePalService: VoicePalService,
    @Inject(BOTS.VOICE_PAL.name) private readonly bot: TelegramBot,
  ) {
    this.createBotEventListeners();
    this.createErrorEventListeners();
  }

  createErrorEventListeners(): void {
    this.bot.on('polling_error', async (error) => this.telegramGeneralService.botErrorHandler(BOTS.VOICE_PAL.name, 'polling_error', error));
    this.bot.on('error', async (error) => this.telegramGeneralService.botErrorHandler(BOTS.VOICE_PAL.name, 'error', error));
  }

  createBotEventListeners(): void {
    // const messageAggregator = new MessageAggregator(handleMessage);
    // this.bot.on('message', (message) => messageAggregator.handleIncomingMessage(message));
    this.bot.on('message', (message: Message) => this.handleMessage(message));
  }

  async handleMessage(message: Message): Promise<void> {
    const functionName = 'message listener';
    const { chatId, telegramUserId, firstName, lastName, username, text } = this.telegramGeneralService.getMessageData(message);
    const logBody = `chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      this.logger.info(functionName, `${logBody} - start`);

      // const voicePalService = new this.voicePalService(bot, chatId);
      // const voicePalService = new VoicePalService(bot, chatId);
      const availableActions = Object.keys(VOICE_PAL_OPTIONS).map((option: string) => VOICE_PAL_OPTIONS[option].displayName);
      if (availableActions.includes(text)) {
        await this.voicePalService.handleActionSelection(text, { telegramUserId, chatId, firstName, lastName, username });
      } else {
        const userAction = this.userSelectedActionsService.getCurrentUserAction(chatId);
        await this.voicePalService.handleAction(message, userAction);
      }

      this.logger.info(functionName, `${logBody} - success`);
    } catch (err) {
      this.logger.error(functionName, `${logBody} - error - ${this.utilsService.getErrorMessage(err)}`);
      await this.telegramGeneralService.sendMessage(this.bot, chatId, `Sorry, but something went wrong`);
    }
  }
}