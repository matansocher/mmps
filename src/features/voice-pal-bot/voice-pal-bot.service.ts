import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BOTS, MessagesAggregatorService, TelegramGeneralService, getMessageData } from '@services/telegram';
import { UserSelectedActionsService, VOICE_PAL_OPTIONS, VoicePalService } from '@services/voice-pal';

@Injectable()
export class VoicePalBotService implements OnModuleInit {
  private readonly logger = new Logger(VoicePalBotService.name);

  constructor(
    private readonly userSelectedActionsService: UserSelectedActionsService,
    private readonly messagesAggregatorService: MessagesAggregatorService,
    private readonly telegramGeneralService: TelegramGeneralService,
    private readonly voicePalService: VoicePalService,
    @Inject(BOTS.VOICE_PAL.name) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    this.createBotEventListeners();
    this.createErrorEventListeners();
  }

  createErrorEventListeners(): void {
    this.bot.on('polling_error', async (error) => this.telegramGeneralService.botErrorHandler(BOTS.VOICE_PAL.name, 'polling_error', error));
    this.bot.on('error', async (error) => this.telegramGeneralService.botErrorHandler(BOTS.VOICE_PAL.name, 'error', error));
  }

  createBotEventListeners(): void {
    this.bot.on('message', (message: Message) =>
      this.messagesAggregatorService.handleIncomingMessage(message, (message: Message) => this.handleMessage(message)),
    );
  }

  // @Timer()
  async handleMessage(message: Message): Promise<void> {
    const { chatId, firstName, lastName, text } = getMessageData(message);
    const logBody = `chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      this.logger.log('message listener', `${logBody} - start`);

      const availableActions = Object.keys(VOICE_PAL_OPTIONS).map((option: string) => VOICE_PAL_OPTIONS[option].displayName);
      if (availableActions.includes(text)) {
        await this.voicePalService.handleActionSelection(message, text);
      } else {
        const userAction = this.userSelectedActionsService.getCurrentUserAction(chatId);
        await this.voicePalService.handleAction(message, userAction);
      }

      this.logger.log('message listener', `${logBody} - success`);
    } catch (err) {
      await this.bot.sendMessage(chatId, `Sorry, but something went wrong`);
    }
  }
}
