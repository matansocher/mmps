import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BOTS, getMessageData, handleCommand, MessagesAggregator, TELEGRAM_EVENTS } from '@services/telegram';
import { UserSelectedActionsService } from './user-selected-actions.service';
import { VOICE_PAL_OPTIONS } from './voice-pal.config';
import { VoicePalService } from './voice-pal.service';

@Injectable()
export class VoicePalBotService implements OnModuleInit {
  private readonly logger = new Logger(VoicePalBotService.name);

  constructor(
    private readonly userSelectedActionsService: UserSelectedActionsService,
    private readonly voicePalService: VoicePalService,
    @Inject(BOTS.VOICE_PAL.id) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    this.bot.on(TELEGRAM_EVENTS.MESSAGE, (message: Message) =>
      new MessagesAggregator().handleIncomingMessage(message, async (message: Message) => {
        await handleCommand({
          bot: this.bot,
          logger: this.logger,
          message,
          handlerName: this.handleMessage.name,
          handler: async () => this.handleMessage.call(this, message),
        });
      }),
    );
  }

  async handleMessage(message: Message): Promise<void> {
    const { chatId, text } = getMessageData(message);

    const availableActions = Object.keys(VOICE_PAL_OPTIONS).map((option: string) => VOICE_PAL_OPTIONS[option].displayName);
    if (availableActions.includes(text)) {
      await this.voicePalService.handleActionSelection(message, text);
    } else {
      const userAction = this.userSelectedActionsService.getCurrentUserAction(chatId);
      await this.voicePalService.handleAction(message, userAction);
    }
  }
}
