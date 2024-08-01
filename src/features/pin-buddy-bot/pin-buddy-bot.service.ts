import { Timer } from '@decorators';
import { PIN_BUDDY_OPTIONS } from '@services/pin-buddy/pin-buddy.config';
import { PinBuddyService } from '@services/pin-buddy/pin-buddy.service';
import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { BOTS } from '@services/telegram/telegram.config';
import { LoggerService } from '@core/logger/logger.service';
import { MessagesAggregatorService } from '@services/telegram/messages-aggregator.service';
import { TelegramGeneralService } from '@services/telegram/telegram-general.service';
import { UtilsService } from '@services/utils/utils.service';
import { UserSelectedActionsService } from '@services/pin-buddy/user-selected-actions.service';

@Injectable()
export class PinBuddyBotService implements OnModuleInit {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly userSelectedActionsService: UserSelectedActionsService,
    private readonly messagesAggregatorService: MessagesAggregatorService,
    private readonly telegramGeneralService: TelegramGeneralService,
    private readonly pinBuddyService: PinBuddyService,
    @Inject(BOTS.PIN_BUDDY.name) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    this.createBotEventListeners();
    this.createErrorEventListeners();
  }

  createErrorEventListeners(): void {
    this.bot.on('polling_error', async (error) => this.telegramGeneralService.botErrorHandler(BOTS.PIN_BUDDY.name, 'polling_error', error));
    this.bot.on('error', async (error) => this.telegramGeneralService.botErrorHandler(BOTS.PIN_BUDDY.name, 'error', error));
  }

  createBotEventListeners(): void {
    this.bot.on('message', (message: Message) =>
      this.messagesAggregatorService.handleIncomingMessage(message, (message: Message) => this.handleMessage(message)),
    );
  }

  @Timer()
  async handleMessage(message: Message): Promise<void> {
    const { chatId, telegramUserId, firstName, lastName, username, text } = this.telegramGeneralService.getMessageData(message);
    const logBody = `chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      this.logger.info('message listener', `${logBody} - start`);

      const availableActions = Object.keys(PIN_BUDDY_OPTIONS).map((option: string) => PIN_BUDDY_OPTIONS[option].displayName);
      if (availableActions.includes(text)) {
        await this.pinBuddyService.handleActionSelection(text, { telegramUserId, chatId, firstName, lastName, username });
      } else {
        const userAction = this.userSelectedActionsService.getCurrentUserAction(chatId);
        await this.pinBuddyService.handleAction(message, userAction);
      }

      this.logger.info('message listener', `${logBody} - success`);
    } catch (err) {
      this.logger.error('message listener', `${logBody} - error - ${this.utilsService.getErrorMessage(err)}`);
      await this.telegramGeneralService.sendMessage(this.bot, chatId, `Sorry, but something went wrong`);
    }
  }
}
