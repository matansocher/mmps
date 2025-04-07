import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MY_USER_NAME } from '@core/config';
import { WorldlyMongoSubscriptionService, WorldlyMongoUserService } from '@core/mongo/worldly-mongo';
import { NotifierService } from '@core/notifier';
import { BOTS, getCallbackQueryData, getInlineKeyboardMarkup, getMessageData, reactToMessage, registerHandlers, TELEGRAM_EVENTS, TelegramEventHandler, UserDetails } from '@services/telegram';
import { getCountryByCapital, getCountryByName } from './utils';
import { ANALYTIC_EVENT_NAMES, BOT_ACTIONS, WORLDLY_BOT_COMMANDS } from './worldly.config';
import { WorldlyService } from './worldly.service';

const customErrorMessage = 'Oops, something went wrong, but you can try again later 🙁';

@Injectable()
export class WorldlyController implements OnModuleInit {
  private readonly logger = new Logger(WorldlyController.name);

  constructor(
    private readonly worldlyService: WorldlyService,
    private readonly mongoUserService: WorldlyMongoUserService,
    private readonly mongoSubscriptionService: WorldlyMongoSubscriptionService,
    private readonly notifier: NotifierService,
    private readonly configService: ConfigService,
    @Inject(BOTS.WORLDLY.id) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    this.bot.setMyCommands(Object.values(WORLDLY_BOT_COMMANDS));

    const { COMMAND, CALLBACK_QUERY } = TELEGRAM_EVENTS;
    const { RANDOM, MAP, FLAG, CAPITAL, ACTIONS } = WORLDLY_BOT_COMMANDS;
    const handlers: TelegramEventHandler[] = [
      { event: COMMAND, regex: RANDOM.command, handler: (message) => this.randomHandler.call(this, message) },
      { event: COMMAND, regex: MAP.command, handler: (message) => this.mapHandler.call(this, message) },
      { event: COMMAND, regex: FLAG.command, handler: (message) => this.flagHandler.call(this, message) },
      { event: COMMAND, regex: CAPITAL.command, handler: (message) => this.capitalHandler.call(this, message) },
      { event: COMMAND, regex: ACTIONS.command, handler: (message) => this.actionsHandler.call(this, message) },
      { event: CALLBACK_QUERY, handler: (callbackQuery) => this.callbackQueryHandler.call(this, callbackQuery) },
    ];
    registerHandlers({ bot: this.bot, logger: this.logger, handlers, customErrorMessage });
  }

  private async actionsHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    const subscription = await this.mongoSubscriptionService.getSubscription(chatId);
    const inlineKeyboardButtons = [
      !subscription?.isActive
        ? { text: '🟢 Start getting daily geography games 🟢', callback_data: `${BOT_ACTIONS.START}` }
        : { text: '🛑 Stop getting daily geography games 🛑', callback_data: `${BOT_ACTIONS.STOP}` },
      { text: '📬 Contact 📬', callback_data: `${BOT_ACTIONS.CONTACT}` },
    ];
    await this.bot.sendMessage(chatId, '👨‍🏫 How can I help?', { ...(getInlineKeyboardMarkup(inlineKeyboardButtons) as any) });
  }

  async randomHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);
    return this.worldlyService.randomGameHandler(chatId, userDetails);
  }

  async mapHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);
    return this.worldlyService.mapHandler(chatId, userDetails);
  }

  async flagHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);
    return this.worldlyService.flagHandler(chatId, userDetails);
  }

  async capitalHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);
    return this.worldlyService.capitalHandler(chatId, userDetails);
  }

  private async callbackQueryHandler(callbackQuery: CallbackQuery): Promise<void> {
    const { chatId, userDetails, messageId, data: response } = getCallbackQueryData(callbackQuery);

    const [game, selectedName, correctName] = response.split(' - ');
    switch (game) {
      case BOT_ACTIONS.START:
        await this.startHandler(chatId, userDetails);
        await this.bot.deleteMessage(chatId, messageId);
        this.notifier.notify(BOTS.WORLDLY, { action: ANALYTIC_EVENT_NAMES.START }, userDetails);
        break;
      case BOT_ACTIONS.STOP:
        await this.stopHandler(chatId);
        await this.bot.deleteMessage(chatId, messageId);
        this.notifier.notify(BOTS.WORLDLY, { action: ANALYTIC_EVENT_NAMES.STOP }, userDetails);
        break;
      case BOT_ACTIONS.CONTACT:
        await this.contactHandler(chatId);
        await this.bot.deleteMessage(chatId, messageId);
        this.notifier.notify(BOTS.WORLDLY, { action: ANALYTIC_EVENT_NAMES.CONTACT }, userDetails);
        break;
      case BOT_ACTIONS.MAP:
        await this.mapAnswerHandler(chatId, messageId, selectedName, correctName);
        this.notifier.notify(BOTS.WORLDLY, { action: ANALYTIC_EVENT_NAMES.ANSWERED, game: '🗺️', correct: correctName, selected: selectedName }, userDetails);
        break;
      case BOT_ACTIONS.FLAG:
        await this.flagAnswerHandler(chatId, messageId, selectedName, correctName);
        this.notifier.notify(BOTS.WORLDLY, { action: ANALYTIC_EVENT_NAMES.ANSWERED, game: '🏁', correct: correctName, selected: selectedName }, userDetails);
        break;
      case BOT_ACTIONS.CAPITAL:
        await this.capitalAnswerHandler(chatId, messageId, selectedName, correctName);
        this.notifier.notify(BOTS.WORLDLY, { action: ANALYTIC_EVENT_NAMES.ANSWERED, game: '🏛️', correct: correctName, selected: selectedName }, userDetails);
        break;
      default:
        this.notifier.notify(BOTS.WORLDLY, { action: ANALYTIC_EVENT_NAMES.ERROR, response }, userDetails);
        throw new Error('Invalid action');
    }
  }

  private async startHandler(chatId: number, userDetails: UserDetails): Promise<void> {
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
  }

  private async stopHandler(chatId: number): Promise<void> {
    await this.mongoSubscriptionService.updateSubscription(chatId, false);
    await this.bot.sendMessage(chatId, `OK, I will stop sending you daily games 🛑`);
  }

  private async contactHandler(chatId: number): Promise<void> {
    await this.bot.sendMessage(chatId, `Gladly, you can talk to the person who created me, he will probably be able to help. Its ${MY_USER_NAME}`);
  }

  private async mapAnswerHandler(chatId: number, messageId: number, selectedName: string, correctName: string): Promise<void> {
    await this.bot.editMessageReplyMarkup({} as any, { message_id: messageId, chat_id: chatId });
    const correctCountry = getCountryByName(correctName);
    const replyText = `${selectedName !== correctName ? `Oops, Wrong` : `Correct!`} - ${correctCountry.emoji} ${correctName} ${correctCountry.emoji}`;
    await this.bot.editMessageCaption(replyText, { chat_id: chatId, message_id: messageId });
    await reactToMessage(this.configService.get(BOTS.WORLDLY.token), chatId, messageId, selectedName !== correctName ? '👎' : '👍');
  }

  private async flagAnswerHandler(chatId: number, messageId: number, selectedName: string, correctName: string): Promise<void> {
    await this.bot.editMessageReplyMarkup({} as any, { message_id: messageId, chat_id: chatId });
    const correctCountry = getCountryByName(correctName);
    const replyText = `${selectedName !== correctName ? `Oops, Wrong` : `Correct!`} - ${correctCountry.emoji} ${correctName} ${correctCountry.emoji}`;
    await this.bot.editMessageText(replyText, { chat_id: chatId, message_id: messageId });
    await reactToMessage(this.configService.get(BOTS.WORLDLY.token), chatId, messageId, selectedName !== correctName ? '👎' : '👍');
  }

  private async capitalAnswerHandler(chatId: number, messageId: number, selectedName: string, correctName: string): Promise<void> {
    await this.bot.editMessageReplyMarkup({} as any, { message_id: messageId, chat_id: chatId });
    const correctCountry = getCountryByCapital(correctName);
    const replyText = `${selectedName !== correctName ? `Oops, Wrong` : `Correct!`} - The capital city of ${correctCountry.emoji} ${correctCountry.capital} ${correctCountry.emoji} is ${correctCountry.capital}`;
    await this.bot.editMessageText(replyText, { chat_id: chatId, message_id: messageId });
    await reactToMessage(this.configService.get(BOTS.WORLDLY.token), chatId, messageId, selectedName !== correctName ? '👎' : '👍');
  }
}
