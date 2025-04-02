import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BOTS, getMessageData, MessagesAggregator, registerHandlers, TELEGRAM_EVENTS, TelegramEventHandler } from '@services/telegram';
import { UserSelectedActionsService } from './user-selected-actions.service';
import { VOICE_PAL_OPTIONS } from './voice-pal.config';
import { VoicePalService } from './voice-pal.service';

@Injectable()
export class VoicePalController implements OnModuleInit {
  private readonly logger = new Logger(VoicePalController.name);

  constructor(
    private readonly userSelectedActionsService: UserSelectedActionsService,
    private readonly voicePalService: VoicePalService,
    @Inject(BOTS.VOICE_PAL.id) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    const { MESSAGE } = TELEGRAM_EVENTS;
    const handlers: TelegramEventHandler[] = [
      {
        event: MESSAGE,
        handler: (message) => {
          new MessagesAggregator().handleIncomingMessage(message as Message, async (message: Message) => {
            await this.handleMessage.call(this, message);
          });
        },
      },
    ];
    registerHandlers({ bot: this.bot, logger: this.logger, handlers });
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
