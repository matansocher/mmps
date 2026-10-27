import { type Bot, type Context, InlineKeyboard } from 'grammy';
import { MY_USER_NAME } from '@core/config';
import { getErrorMessage, Logger } from '@core/utils';
import { sleep } from '@core/utils';
import { notify } from '@services/notifier';
import { buildInlineKeyboard, getCallbackQueryData, getMessageData, UserDetails } from '@services/telegram';
import {
  addSubscription,
  getCountryByCapital,
  getCountryByName,
  getStateByName,
  getSubscription,
  getUserGameLogs,
  getUserLanguage,
  saveUserDetails,
  setUserLanguage,
  updateGameLog,
  updateSubscription,
} from '@shared/worldly';
import { userPreferencesCacheService } from './cache';
import { areaName, capitalName, worldlyText } from './language';
import { generateStatisticsMessage, getLogicTeaser } from './utils';
import { ANALYTIC_EVENT_NAMES, BOT_ACTIONS, BOT_CONFIG, getWorldlyCommands, GLOBE_APP_URL, INLINE_KEYBOARD_SEPARATOR } from './worldly.config';
import { WorldlyService } from './worldly.service';

export class WorldlyController {
  private readonly logger = new Logger('worldly:controller');

  constructor(
    private readonly worldlyService: WorldlyService,
    private readonly bot: Bot,
  ) {}

  init(): void {
    const { START, FIRE_MODE, RANDOM, MAP, US_MAP, FLAG, CAPITAL, GLOBE, LOGIC, ACTIONS } = BOT_CONFIG.commands;

    this.bot.command(START.command.replace('/', ''), (ctx) => this.startHandler(ctx));
    this.bot.command(FIRE_MODE.command.replace('/', ''), (ctx) => this.fireModeHandler(ctx));
    this.bot.command(RANDOM.command.replace('/', ''), (ctx) => this.randomHandler(ctx));
    this.bot.command(MAP.command.replace('/', ''), (ctx) => this.mapHandler(ctx));
    this.bot.command(US_MAP.command.replace('/', ''), (ctx) => this.USMapHandler(ctx));
    this.bot.command(FLAG.command.replace('/', ''), (ctx) => this.flagHandler(ctx));
    this.bot.command(CAPITAL.command.replace('/', ''), (ctx) => this.capitalHandler(ctx));
    this.bot.command(GLOBE.command.replace('/', ''), (ctx) => this.globeHandler(ctx));
    this.bot.command(LOGIC.command.replace('/', ''), (ctx) => this.logicHandler(ctx));
    this.bot.command(ACTIONS.command.replace('/', ''), (ctx) => this.actionsHandler(ctx));
    this.bot.on('callback_query:data', (ctx) => this.callbackQueryHandler(ctx));
    this.bot.catch((err) => this.logger.error(`${getErrorMessage(err)}`));
  }

  async startHandler(ctx: Context): Promise<void> {
    const { chatId, userDetails } = getMessageData(ctx);
    await this.userStart(ctx, chatId, userDetails);
    notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.START }, userDetails);
  }

  private async actionsHandler(ctx: Context): Promise<void> {
    const { chatId } = getMessageData(ctx);
    const text = worldlyText(await getUserLanguage(chatId));
    const subscription = await getSubscription(chatId);
    const keyboard = buildInlineKeyboard([
      { text: text.statistics, data: `${BOT_ACTIONS.STATISTICS}` },
      !subscription?.isActive ? { text: text.subscribe, data: `${BOT_ACTIONS.START}`, style: 'success' as const } : { text: text.unsubscribe, data: `${BOT_ACTIONS.STOP}`, style: 'danger' as const },
      { text: text.language, data: BOT_ACTIONS.LANGUAGE },
      { text: text.contact, data: `${BOT_ACTIONS.CONTACT}` },
    ]);
    await ctx.reply(text.actions, { reply_markup: keyboard });
    await ctx.deleteMessage().catch(() => {});
  }

  private async globeHandler(ctx: Context): Promise<void> {
    const { chatId, userDetails } = getMessageData(ctx);
    const text = worldlyText(await getUserLanguage(chatId));
    const keyboard = new InlineKeyboard().webApp(text.globe, GLOBE_APP_URL);
    await ctx.reply(text.globePrompt, { reply_markup: keyboard });
    notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.GLOBE }, userDetails);
  }

  private async logicHandler(ctx: Context): Promise<void> {
    const { chatId, userDetails } = getMessageData(ctx);
    const language = await getUserLanguage(chatId);
    try {
      const { text, keyboard } = await getLogicTeaser(new Date(), language);
      await ctx.reply(text, { reply_markup: keyboard });
      notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.LOGIC }, userDetails);
    } catch (err) {
      this.logger.error(`${this.logicHandler.name} - error - ${getErrorMessage(err)}`);
      await ctx.reply(worldlyText(language).logicError);
    }
  }

  async fireModeHandler(ctx: Context): Promise<void> {
    const { chatId, userDetails } = getMessageData(ctx);
    try {
      await ctx.reply(worldlyText(await getUserLanguage(chatId)).fire);
      await userPreferencesCacheService.saveUserPreferences(chatId, { onFireMode: true });
      await this.worldlyService.randomGameHandler(chatId);
      notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.FIRE }, userDetails);
    } catch (err) {
      notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.FIRE, error: `❗️ ${err}` }, userDetails);
      throw err;
    }
  }

  async randomHandler(ctx: Context): Promise<void> {
    const { chatId, userDetails } = getMessageData(ctx);
    try {
      await this.worldlyService.randomGameHandler(chatId);
      notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.RANDOM }, userDetails);
    } catch (err) {
      notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.RANDOM, error: `❗️ ${err}` }, userDetails);
      throw err;
    }
  }

  async mapHandler(ctx: Context): Promise<void> {
    const { chatId, userDetails } = getMessageData(ctx);
    try {
      await this.worldlyService.mapHandler(chatId);
      notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.MAP }, userDetails);
    } catch (err) {
      notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.MAP, error: `❗️ ${err}` }, userDetails);
      throw err;
    }
  }

  async USMapHandler(ctx: Context): Promise<void> {
    const { chatId, userDetails } = getMessageData(ctx);
    try {
      await this.worldlyService.USMapHandler(chatId);
      notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.US_MAP }, userDetails);
    } catch (err) {
      notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.US_MAP, error: `❗️ ${err}` }, userDetails);
      throw err;
    }
  }

  async flagHandler(ctx: Context): Promise<void> {
    const { chatId, userDetails } = getMessageData(ctx);
    try {
      await this.worldlyService.flagHandler(chatId);
      notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.FLAG }, userDetails);
    } catch (err) {
      notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.FLAG, error: `❗️ ${err}` }, userDetails);
      throw err;
    }
  }

  async capitalHandler(ctx: Context): Promise<void> {
    const { chatId, userDetails } = getMessageData(ctx);
    try {
      await this.worldlyService.capitalHandler(chatId);
      notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.CAPITAL }, userDetails);
    } catch (err) {
      notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.CAPITAL, error: `❗️ ${err}` }, userDetails);
      throw err;
    }
  }

  private async callbackQueryHandler(ctx: Context): Promise<void> {
    const { chatId, userDetails, data: response } = getCallbackQueryData(ctx);

    const [action, selectedName, correctName, gameId] = response.split(INLINE_KEYBOARD_SEPARATOR);
    try {
      switch (action) {
        case BOT_ACTIONS.LANGUAGE: {
          const text = worldlyText(await getUserLanguage(chatId));
          await ctx.reply(text.chooseLanguage, {
            reply_markup: buildInlineKeyboard([
              { text: 'English', data: `${BOT_ACTIONS.SET_LANGUAGE}|en` },
              { text: 'עברית', data: `${BOT_ACTIONS.SET_LANGUAGE}|he` },
              { text: text.back, data: BOT_ACTIONS.ACTIONS },
            ]),
          });
          await ctx.deleteMessage().catch(() => {});
          break;
        }
        case BOT_ACTIONS.SET_LANGUAGE:
          if (selectedName !== 'en' && selectedName !== 'he') {
            await ctx.answerCallbackQuery();
            return;
          }
          await saveUserDetails(userDetails);
          await setUserLanguage(chatId, selectedName);
          await this.bot.api.setMyCommands(getWorldlyCommands(selectedName), { scope: { type: 'chat', chat_id: chatId } }).catch(() => {});
          await ctx.reply(worldlyText(selectedName).languageSaved);
          await this.actionsHandler(ctx);
          break;
        case BOT_ACTIONS.ACTIONS:
          await this.actionsHandler(ctx);
          break;
        case BOT_ACTIONS.START:
          await this.userStart(ctx, chatId, userDetails);
          await ctx.deleteMessage().catch(() => {});
          notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.START }, userDetails);
          break;
        case BOT_ACTIONS.STOP:
          await this.stopHandler(ctx, chatId);
          await ctx.deleteMessage().catch(() => {});
          notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.STOP }, userDetails);
          break;
        case BOT_ACTIONS.CONTACT:
          await this.contactHandler(ctx);
          await ctx.deleteMessage().catch(() => {});
          notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.CONTACT }, userDetails);
          break;
        case BOT_ACTIONS.STATISTICS:
          await this.statisticsHandler(ctx, chatId);
          await ctx.deleteMessage().catch(() => {});
          notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.STATISTICS }, userDetails);
          break;
        case BOT_ACTIONS.MAP:
          await this.mapAnswerHandler(ctx, selectedName, correctName);
          await updateGameLog({ chatId, gameId, selected: selectedName });
          notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ANSWERED, game: '🗺️', isCorrect: correctName === selectedName ? '🟢' : '🔴', correct: correctName, selected: selectedName }, userDetails);
          break;
        case BOT_ACTIONS.US_MAP:
          await this.USMapAnswerHandler(ctx, selectedName, correctName);
          await updateGameLog({ chatId, gameId, selected: selectedName });
          notify(
            BOT_CONFIG,
            { action: ANALYTIC_EVENT_NAMES.ANSWERED, game: '🇺🇸 🗺️', isCorrect: correctName === selectedName ? '🟢' : '🔴', correct: correctName, selected: selectedName },
            userDetails,
          );
          break;
        case BOT_ACTIONS.FLAG:
          await this.flagAnswerHandler(ctx, selectedName, correctName);
          await updateGameLog({ chatId, gameId, selected: selectedName });
          notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ANSWERED, game: '🏁', isCorrect: correctName === selectedName ? '🟢' : '🔴', correct: correctName, selected: selectedName }, userDetails);
          break;
        case BOT_ACTIONS.CAPITAL:
          await this.capitalAnswerHandler(ctx, selectedName, correctName);
          await updateGameLog({ chatId, gameId, selected: selectedName });
          notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ANSWERED, game: '🏛️', isCorrect: correctName === selectedName ? '🟢' : '🔴', correct: correctName, selected: selectedName }, userDetails);
          break;
        default:
          notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ERROR, response }, userDetails);
          throw new Error('Invalid action');
      }

      await ctx.answerCallbackQuery().catch(() => {});

      if (![BOT_ACTIONS.MAP, BOT_ACTIONS.US_MAP, BOT_ACTIONS.FLAG, BOT_ACTIONS.CAPITAL].includes(action as BOT_ACTIONS)) {
        return;
      }
      // If the user is in fire mode, send a new game immediately
      const userPreferences = await userPreferencesCacheService.getUserPreferences(chatId);
      if (userPreferences?.onFireMode) {
        await sleep(1000);
        await this.worldlyService.randomGameHandler(chatId);
      }
    } catch (err) {
      notify(BOT_CONFIG, { action: `${action} answer`, error: `❗️ ${err}` }, userDetails);
      throw err;
    }
  }

  private async userStart(ctx: Context, chatId: number, userDetails: UserDetails): Promise<void> {
    const saveResult = await saveUserDetails(userDetails);

    const subscription = await getSubscription(chatId);
    if (subscription) {
      await updateSubscription(chatId, { isActive: true });
    } else {
      await addSubscription(chatId);
    }

    const text = worldlyText(await getUserLanguage(chatId));
    const newUserReplyText = text.welcome;
    const existingUserReplyText = text.welcomeBack;
    const keyboard = new InlineKeyboard().webApp(text.globe, GLOBE_APP_URL);
    await ctx.reply(saveResult === 'updated' ? existingUserReplyText : newUserReplyText, { reply_markup: keyboard });
  }

  private async stopHandler(ctx: Context, chatId: number): Promise<void> {
    await updateSubscription(chatId, { isActive: false });
    await ctx.reply(worldlyText(await getUserLanguage(chatId)).stopped);
  }

  private async contactHandler(ctx: Context): Promise<void> {
    const { chatId } = getCallbackQueryData(ctx);
    await ctx.reply(`${worldlyText(await getUserLanguage(chatId)).contactMessage}\n${MY_USER_NAME}`);
  }

  private async statisticsHandler(ctx: Context, chatId: number): Promise<void> {
    const language = await getUserLanguage(chatId);
    const userGameLogs = await getUserGameLogs(chatId);
    if (!userGameLogs?.length) {
      await ctx.reply(worldlyText(language).noStatistics);
      return;
    }

    const replyText = generateStatisticsMessage(userGameLogs, language);
    await ctx.reply(replyText);
  }

  private async mapAnswerHandler(ctx: Context, selectedName: string, correctName: string): Promise<void> {
    const { chatId } = getCallbackQueryData(ctx);
    const language = await getUserLanguage(chatId);
    const text = worldlyText(language);
    await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
    const correctCountry = await getCountryByName(correctName);
    const replyText = `${selectedName !== correctName ? text.incorrect : text.correct} ${correctCountry.emoji} ${areaName(correctCountry, language)} ${correctCountry.emoji}`;
    await ctx.editMessageCaption({ caption: replyText }).catch(() => {});
    await ctx.react(selectedName !== correctName ? '👎' : '👍').catch(() => {});
  }

  private async USMapAnswerHandler(ctx: Context, selectedName: string, correctName: string): Promise<void> {
    const { chatId } = getCallbackQueryData(ctx);
    const language = await getUserLanguage(chatId);
    const text = worldlyText(language);
    await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
    const correctState = await getStateByName(correctName);
    const replyText = `${selectedName !== correctName ? text.incorrect : text.correct} ${areaName(correctState, language)}`;
    await ctx.editMessageCaption({ caption: replyText }).catch(() => {});
    await ctx.react(selectedName !== correctName ? '👎' : '👍').catch(() => {});
  }

  private async flagAnswerHandler(ctx: Context, selectedName: string, correctName: string): Promise<void> {
    const { chatId } = getCallbackQueryData(ctx);
    const language = await getUserLanguage(chatId);
    const text = worldlyText(language);
    await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
    const correctCountry = await getCountryByName(correctName);
    const replyText = `${selectedName !== correctName ? text.incorrect : text.correct} ${correctCountry.emoji} ${areaName(correctCountry, language)} ${correctCountry.emoji}`;
    await ctx.editMessageText(replyText).catch(() => {});
    await ctx.react(selectedName !== correctName ? '👎' : '👍').catch(() => {});
  }

  private async capitalAnswerHandler(ctx: Context, selectedName: string, correctName: string): Promise<void> {
    const { chatId } = getCallbackQueryData(ctx);
    const language = await getUserLanguage(chatId);
    const text = worldlyText(language);
    await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
    const correctCountry = await getCountryByCapital(correctName);
    const replyText = `${selectedName !== correctName ? text.incorrect : text.correct} ${text.capitalOf(`${correctCountry.emoji} ${areaName(correctCountry, language)} ${correctCountry.emoji}`, capitalName(correctCountry, language))}`;
    await ctx.editMessageText(replyText).catch(() => {});
    await ctx.react(selectedName !== correctName ? '👎' : '👍').catch(() => {});
  }
}
