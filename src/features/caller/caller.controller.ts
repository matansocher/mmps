import { Response } from 'express';
import TelegramBot, { BotCommand, CallbackQuery, Message } from 'node-telegram-bot-api';
import { join } from 'node:path';
import { twiml } from 'twilio';
import { Controller, Get, Inject, Logger, OnModuleInit, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CallerMongoSubscriptionService, Subscription } from '@core/mongo/caller-mongo';
import { getCallbackQueryData, getInlineKeyboardMarkup, getMessageData, registerHandlers, TELEGRAM_EVENTS, TelegramEventHandler } from '@services/telegram';
import { BOT_ACTIONS, BOT_CONFIG, MAX_NUM_OF_SUBSCRIPTIONS_PER_USER } from './caller.config';
import { isValidTimeOfDay } from './utils';

const customErrorMessage = `מצטער, אבל קרתה לי תקלה. אפשר לנסות שוב מאוחר יותר 😥`;

@Controller('caller')
export class CallerController implements OnModuleInit {
  private readonly logger = new Logger(CallerController.name);

  constructor(
    private readonly subscriptionDB: CallerMongoSubscriptionService,
    private readonly configService: ConfigService,
    @Inject(BOT_CONFIG.id) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    const { COMMAND, MESSAGE, CALLBACK_QUERY } = TELEGRAM_EVENTS;
    const { START, LIST } = BOT_CONFIG.commands;
    const handlers: TelegramEventHandler[] = [
      { event: COMMAND, regex: START.command, handler: (message) => this.startHandler.call(this, message) },
      { event: COMMAND, regex: LIST.command, handler: (message) => this.listHandler.call(this, message) },
      { event: MESSAGE, handler: (message) => this.textHandler.call(this, message) },
      { event: CALLBACK_QUERY, handler: (callbackQuery) => this.callbackQueryHandler.call(this, callbackQuery) },
    ];
    registerHandlers({ bot: this.bot, logger: this.logger, handlers, customErrorMessage, isBlocked: true });
  }

  @Get('audio')
  async audio(@Res() res: Response) {
    this.logger.log(`/audio callback endpoint hit by Twilio`);

    const filePath = join(process.cwd(), 'assets', 'recordings', 'audio.mp3');
    res.sendFile(filePath);
  }

  @Post('voice')
  handleVoice(@Res() res: Response) {
    this.logger.log(`/voice callback endpoint hit by Twilio`);

    const response = new twiml.VoiceResponse();
    response.play(`${this.configService.get('WEBHOOK_PROXY_URL')}/caller/audio`);

    res.type('text/xml');
    res.send(response.toString());
  }

  async startHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    await this.bot.sendMessage(chatId, `Lets go! 🚀`);
  }

  async listHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);

    try {
      const subscriptions = await this.subscriptionDB.getActiveSubscriptions(chatId);
      if (!subscriptions.length) {
        await this.bot.sendMessage(chatId, 'You have no active subscriptions at the moment');
        return;
      }

      const promisesArr = subscriptions.map((subscription: Subscription) => {
        const inlineKeyboardButtons = [{ text: '⛔️ Remove ⛔️', callback_data: `${BOT_ACTIONS.REMOVE} - ${subscription.time}` }];
        return this.bot.sendMessage(chatId, subscription.time, getInlineKeyboardMarkup(inlineKeyboardButtons));
      });
      await Promise.all(promisesArr);
    } catch (err) {
      throw err;
    }
  }

  async textHandler(message: Message): Promise<void> {
    const { chatId, text } = getMessageData(message);
    const userInput = text.trim();

    // prevent built in options to be processed also here
    if (Object.values(BOT_CONFIG.commands).some((command: BotCommand) => userInput.includes(command.command))) return;

    if (!isValidTimeOfDay(text)) {
      await this.bot.sendMessage(chatId, 'Invalid Format. Please use HH:MM format (24-hour clock).');
      return;
    }

    const activeSubscriptions = await this.subscriptionDB.getActiveSubscriptions(chatId);
    if (activeSubscriptions?.length >= MAX_NUM_OF_SUBSCRIPTIONS_PER_USER) {
      await this.bot.sendMessage(chatId, `I am sorry, but you already have ${MAX_NUM_OF_SUBSCRIPTIONS_PER_USER} active subscriptions. Please remove one before adding a new one.`);
      return;
    }

    const existingSubscription = activeSubscriptions.find((s) => s.time === userInput);
    if (existingSubscription) {
      await this.bot.sendMessage(chatId, 'All good, you already have a notification for this time');
      return;
    }

    await this.subscriptionDB.addSubscription(chatId, userInput);
    const replyText = `Great! I will notify you when the restaurant opens at ${userInput} ⏰`;
    await this.bot.sendMessage(chatId, replyText);
  }

  private async callbackQueryHandler(callbackQuery: CallbackQuery): Promise<void> {
    const { chatId, messageId, data: text } = getCallbackQueryData(callbackQuery);

    try {
      const time = text.replace(`${BOT_ACTIONS.REMOVE} - `, '');
      const activeSubscriptions = await this.subscriptionDB.getActiveSubscriptions(chatId);

      if (text.startsWith(`${BOT_ACTIONS.REMOVE} - `)) {
        let replyText;
        const existingSubscription = activeSubscriptions.find((s) => s.time === time);
        if (existingSubscription) {
          await this.subscriptionDB.archiveSubscription(chatId, time);
          replyText = `All right, removed ${time}`;
        } else {
          replyText = `All good, you dont have scheduled call for ${time}`;
        }
        await this.bot.sendMessage(chatId, replyText);
        await this.bot.editMessageReplyMarkup(undefined, { message_id: messageId, chat_id: chatId }).catch(() => {});
      }
    } catch (err) {
      throw err;
    }
  }
}
