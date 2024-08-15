import { PinBuddyMongoAnalyticLogService, PinBuddyMongoUserService } from '@core/mongo/pin-buddy/services';
import { PinBuddyUtilsService } from '@services/pin-buddy/pin-buddy-utils.service';
import { PinBuddyService } from '@services/pin-buddy/pin-buddy.service';
import { ANALYTIC_EVENT_NAMES, INITIAL_BOT_RESPONSE } from '@services/pin-buddy/pin-buddy.config';
import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { BOTS } from '@services/telegram/telegram.config';
import { LoggerService } from '@core/logger/logger.service';
import { MessagesAggregatorService } from '@services/telegram/messages-aggregator.service';
import { TelegramGeneralService } from '@services/telegram/telegram-general.service';
import { UtilsService } from '@services/utils/utils.service';

@Injectable()
export class PinBuddyBotService implements OnModuleInit {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly messagesAggregatorService: MessagesAggregatorService,
    private readonly mongoUserService: PinBuddyMongoUserService,
    private readonly mongoAnalyticLogService: PinBuddyMongoAnalyticLogService,
    private readonly pinBuddyUtilsService: PinBuddyUtilsService,
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
    this.bot.onText(/\/start/, (message: Message) => this.startHandler(message));
    this.bot.on('message', (message: Message) => this.handleMessage(message));
    // $$$$$$$$$$$$$$$$$$ add event listener to delete messages
    // $$$$$$$$$$$$$$$$$$ add event listener for clearing chat history
  }

  async startHandler(message: Message): Promise<void> {
    const { chatId, firstName, lastName, telegramUserId, username } = this.telegramGeneralService.getMessageData(message);
    const logBody = `start :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      this.logger.info(this.startHandler.name, `${logBody} - start`);
      this.mongoUserService.saveUserDetails({ chatId, telegramUserId, firstName, lastName, username });
      const replyText = INITIAL_BOT_RESPONSE.replace('{name}', firstName || username || '');
      await this.telegramGeneralService.sendMessage(this.bot, chatId, replyText, await this.pinBuddyUtilsService.getKeyboardOptions(chatId));
      this.mongoAnalyticLogService.sendAnalyticLog(ANALYTIC_EVENT_NAMES.START, { chatId });
      this.logger.info(this.startHandler.name, `${logBody} - success`);
    } catch (err) {
      this.logger.error(this.startHandler.name, `${logBody} - error - ${this.utilsService.getErrorMessage(err)}`);
      await this.telegramGeneralService.sendMessage(this.bot, chatId, `Sorry, but something went wrong`, await this.pinBuddyUtilsService.getKeyboardOptions(chatId));
    }
  }

  async handleMessage(message: Message): Promise<void> {
    const { chatId, firstName, lastName, username, text, messageId, replyToMessageId } = this.telegramGeneralService.getMessageData(message);
    const logBody = `chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    if (text === '/start') return;

    try {
      this.logger.info(this.handleMessage.name, `${logBody} - start`);

      const isReplyToMessage = !!replyToMessageId;
      const isStringParsableToInt = this.pinBuddyUtilsService.isStringParsableToInt(text);
      const [userMessageId, userText] = text.split(' - ');
      const isClickedOnStarredMessage = this.pinBuddyUtilsService.isStringParsableToInt(userMessageId) && !!userText;
      if (isReplyToMessage) {
        // if a user replies to a message, assuming the reply text is the string he wants to title the saved message, the bot will:
        await this.pinBuddyService.handleReplyToMessage({ chatId, messageId, replyToMessageId, text });
      } else if (isStringParsableToInt) {
        // if a user sends a message with a number, the bot will try to find the message id and unstar it
        await this.pinBuddyService.handleUnstarMessage({ chatId, messageId, text });
      } else if (isClickedOnStarredMessage) {
        await this.pinBuddyService.handleClickOnStarredMessage({ chatId, messageId: parseInt(userMessageId) });
      }
      this.logger.info(this.handleMessage.name, `${logBody} - success`);
    } catch (err) {
      this.logger.error(this.handleMessage.name, `${logBody} - error - ${this.utilsService.getErrorMessage(err)}`);
      await this.telegramGeneralService.sendMessage(this.bot, chatId, `Sorry, but something went wrong`);
    }
  }
}
