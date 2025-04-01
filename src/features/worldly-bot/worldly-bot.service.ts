import * as fs from 'fs';
import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MY_USER_NAME } from '@core/config';
import { WorldlyMongoSubscriptionService, WorldlyMongoUserService } from '@core/mongo/worldly-mongo';
import { NotifierBotService } from '@core/notifier-bot';
import { shuffleArray } from '@core/utils';
import { BOTS, getCallbackQueryData, getInlineKeyboardMarkup, getMessageData, reactToMessage, registerHandlers, TELEGRAM_EVENTS, TelegramEventHandler } from '@services/telegram';
import { getCountryByName, getCountryMap, getOtherOptions, getRandomCountry } from './utils';
import { ANALYTIC_EVENT_NAMES, WORLDLY_BOT_COMMANDS } from './worldly-bot.config';

const customErrorMessage = 'Oops, something went wrong, but you can try again later 🙁';

@Injectable()
export class WorldlyBotService implements OnModuleInit {
  private readonly logger = new Logger(WorldlyBotService.name);

  constructor(
    private readonly mongoUserService: WorldlyMongoUserService,
    private readonly mongoSubscriptionService: WorldlyMongoSubscriptionService,
    private readonly notifier: NotifierBotService,
    private readonly configService: ConfigService,
    @Inject(BOTS.WORLDLY.id) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    this.bot.setMyCommands(Object.values(WORLDLY_BOT_COMMANDS));

    const { COMMAND, CALLBACK_QUERY } = TELEGRAM_EVENTS;
    const { GAME, START, STOP, CONTACT } = WORLDLY_BOT_COMMANDS;
    const handlers: TelegramEventHandler[] = [
      { event: COMMAND, regex: GAME.command, handler: (message) => this.gameHandler.call(this, message) },
      { event: COMMAND, regex: START.command, handler: (message) => this.startHandler.call(this, message) },
      { event: COMMAND, regex: STOP.command, handler: (message) => this.stopHandler.call(this, message) },
      { event: COMMAND, regex: CONTACT.command, handler: (message) => this.contactHandler.call(this, message) },
      { event: CALLBACK_QUERY, handler: (callbackQuery) => this.callbackQueryHandler.call(this, callbackQuery) },
    ];
    registerHandlers({ bot: this.bot, logger: this.logger, handlers, customErrorMessage });
  }

  private async startHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);
    const userExists = await this.mongoUserService.saveUserDetails(userDetails);

    const subscription = await this.mongoSubscriptionService.getSubscription(chatId);
    subscription ? await this.mongoSubscriptionService.updateSubscription(chatId, true) : await this.mongoSubscriptionService.addSubscription(chatId);

    const newUserReplyText = [
      `Hi 👋`,
      `I am here to help you learn geography in a fun way`,
      `Every day, I will send you a geography game`,
      `You can trigger a game with the command on the bottom`,
      `If you want me to stop sending you geography games, just use the stop command on the bottom`,
    ].join('\n\n');
    const existingUserReplyText = `No problem, I will send you daily games`;
    await this.bot.sendMessage(chatId, userExists ? existingUserReplyText : newUserReplyText);

    this.notifier.notify(BOTS.WORLDLY, { action: ANALYTIC_EVENT_NAMES.START }, userDetails);
  }

  private async stopHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);
    await this.mongoSubscriptionService.updateSubscription(chatId, false);
    await this.bot.sendMessage(chatId, `OK, I will stop sending you daily games 🛑`);
    this.notifier.notify(BOTS.WORLDLY, { action: ANALYTIC_EVENT_NAMES.STOP }, userDetails);
  }

  private async contactHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);

    await this.bot.sendMessage(chatId, `Gladly, you can talk to the person who created me, he will probably be able to help. Its ${MY_USER_NAME}`);
    this.notifier.notify(BOTS.WORLDLY, { action: ANALYTIC_EVENT_NAMES.CONTACT }, userDetails);
  }

  async gameHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);

    const randomCountry = getRandomCountry();
    const imagePath = getCountryMap(randomCountry.name);
    if (!imagePath) {
      await this.bot.sendMessage(chatId, 'Oops, something went wrong with this country 😅');
      return;
    }

    const otherOptions = getOtherOptions(randomCountry);
    const inlineKeyboardMarkup = getInlineKeyboardMarkup(
      shuffleArray([
        { text: randomCountry.name, callback_data: `${randomCountry.name} - ${randomCountry.name}` },
        ...otherOptions.map((otherOption) => ({ text: otherOption.name, callback_data: `${otherOption.name} - ${randomCountry.name}` })),
      ]),
    );

    await this.bot.sendPhoto(chatId, fs.createReadStream(imagePath), { ...(inlineKeyboardMarkup as any), caption: 'Guess the country' });

    this.notifier.notify(BOTS.WORLDLY, { action: ANALYTIC_EVENT_NAMES.GAME }, userDetails);
  }

  private async callbackQueryHandler(callbackQuery: CallbackQuery): Promise<void> {
    const { chatId, userDetails, messageId, data: response } = getCallbackQueryData(callbackQuery);

    const [selectedName, correctName] = response.split(' - ');
    await this.bot.editMessageReplyMarkup({} as any, { message_id: messageId, chat_id: chatId });
    const correctCountry = getCountryByName(correctName);
    const answer = selectedName !== correctName ? `Oops, Wrong` : `Correct!`;
    const replyText = `${answer} - ${correctCountry.emoji} ${correctName} ${correctCountry.emoji}`;
    await this.bot.editMessageCaption(replyText, { chat_id: chatId, message_id: messageId });
    await reactToMessage(this.configService.get(BOTS.WORLDLY.token), chatId, messageId, selectedName !== correctName ? '👎' : '👍');
    this.notifier.notify(BOTS.WORLDLY, { action: ANALYTIC_EVENT_NAMES.ANSWERED, correct: correctName, selected: selectedName }, userDetails);
  }
}
