import { BOTS } from '@core/config/telegram.config';
import { LoggerService } from '@core/logger/logger.service';
import type { OnModuleInit } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { TelegramBotsFactoryService } from '@services/telegram/telegram-bots-factory.service';
import { TelegramGeneralService } from '@services/telegram/telegram-general.service';
import { UtilsService } from '@services/utils/utils.service';
import { VOICE_PAL_OPTIONS } from '@services/voice-pal/voice-pal.config';

@Injectable()
export class VoiceAplBotService implements OnModuleInit {
  private bot: any;

  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly telegramBotsFactoryService: TelegramBotsFactoryService,
    private readonly telegramGeneralService: TelegramGeneralService,
  ) {}

  onModuleInit() {
    this.telegramBotsFactoryService.createBot(BOTS.VOICE_PAL.name);
    this.bot = this.telegramBotsFactoryService.getBot(BOTS.VOICE_PAL.name);
    this.logger.info('onModuleInit', 'VoiceAplBotService has been initialized.');

    this.createBotEventListeners();
    this.createErrorEventListeners();
  }

  createErrorEventListeners() {
    this.bot.on('polling_error', async (error) => this.telegramGeneralService.botErrorHandler(BOTS.VOICE_PAL.name, 'polling_error', error));
    this.bot.on('error', async (error) => this.telegramGeneralService.botErrorHandler(BOTS.VOICE_PAL.name, 'error', error));
  }

  createBotEventListeners() {
    // const messageAggregator = new MessageAggregator(handleMessage);
    // this.bot.on('message', (message) => messageAggregator.handleIncomingMessage(message));
    this.bot.on('message', this.handleMessage);
  }

  async handleMessage(message) {
    const functionName = 'message listener';
    const { chatId, telegramUserId, firstName, lastName, username, text } = this.telegramGeneralService.getMessageData(message);
    const logBody = `chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      this.logger.info(functionName, `${logBody} - start`);

      const voicePalService = new VoicePalService(bot, chatId);
      const availableActions = Object.keys(VOICE_PAL_OPTIONS).map(option => VOICE_PAL_OPTIONS[option].displayName);
      if (availableActions.includes(text)) {
        await voicePalService.handleActionSelection(text, { telegramUserId, chatId, firstName, lastName, username });
      } else {
        const userAction = userSelectionService.getCurrentUserAction(chatId);
        await voicePalService.handleAction(message, userAction);
      }

      this.logger.info(functionName, `${logBody} - success`);
    } catch (err) {
      this.logger.error(functionName, `${logBody} - error - ${this.utilsService.getErrorMessage(err)}`);
      await this.telegramGeneralService.sendMessage(this.bot, chatId, `Sorry, but something went wrong`);
    }
  }
}
