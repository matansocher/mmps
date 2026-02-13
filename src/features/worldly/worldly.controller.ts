import type { Context } from 'grammy';
import { MY_USER_NAME } from '@core/config';
import { Logger } from '@core/utils';
import { sleep } from '@core/utils';
import { notify } from '@services/notifier';
import { buildInlineKeyboard, getCallbackQueryData, getMessageData, provideTelegramBot, UserDetails } from '@services/telegram-grammy';
import { addSubscription, getCountryByCapital, getCountryByName, getStateByName, getSubscription, getUserGameLogs, saveUserDetails, updateGameLog, updateSubscription } from '@shared/worldly';
import { userPreferencesCacheService } from './cache';
import { generateStatisticsMessage } from './utils';
import { ANALYTIC_EVENT_NAMES, BOT_ACTIONS, BOT_CONFIG, INLINE_KEYBOARD_SEPARATOR } from './worldly.config';
import { WorldlyService } from './worldly.service';

const customErrorMessage = 'אופס, קרתה לי תקלה, אבל אפשר לנסות שוב מאוחר יותר 🙁';

export class WorldlyController {
  private readonly logger = new Logger(WorldlyController.name);
  private readonly bot = provideTelegramBot(BOT_CONFIG);

  constructor(private readonly worldlyService: WorldlyService) {}

  init(): void {
    const { START, FIRE_MODE, RANDOM, MAP, US_MAP, FLAG, CAPITAL, ACTIONS } = BOT_CONFIG.commands;

    this.bot.command(START.command.replace('/', ''), (ctx) => this.startHandler(ctx));
    this.bot.command(FIRE_MODE.command.replace('/', ''), (ctx) => this.fireModeHandler(ctx));
    this.bot.command(RANDOM.command.replace('/', ''), (ctx) => this.randomHandler(ctx));
    this.bot.command(MAP.command.replace('/', ''), (ctx) => this.mapHandler(ctx));
    this.bot.command(US_MAP.command.replace('/', ''), (ctx) => this.USMapHandler(ctx));
    this.bot.command(FLAG.command.replace('/', ''), (ctx) => this.flagHandler(ctx));
    this.bot.command(CAPITAL.command.replace('/', ''), (ctx) => this.capitalHandler(ctx));
    this.bot.command(ACTIONS.command.replace('/', ''), (ctx) => this.actionsHandler(ctx));
    this.bot.on('callback_query:data', (ctx) => this.callbackQueryHandler(ctx));
    this.bot.catch((err) => this.logger.error(`${err}`));
  }

  async startHandler(ctx: Context): Promise<void> {
    const { chatId, userDetails } = getMessageData(ctx);
    await this.userStart(ctx, chatId, userDetails);
    notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.START }, userDetails);
  }

  private async actionsHandler(ctx: Context): Promise<void> {
    const { chatId } = getMessageData(ctx);
    const subscription = await getSubscription(chatId);
    const keyboard = buildInlineKeyboard([
      { text: '📊 סטטיסטיקות 📊', data: `${BOT_ACTIONS.STATISTICS}` },
      !subscription?.isActive
        ? { text: '🟢 רוצה להתחיל לקבל משחקים יומיים 🟢', data: `${BOT_ACTIONS.START}` }
        : { text: '🛑 רוצה להפסיק לקבל משחקים יומיים 🛑', data: `${BOT_ACTIONS.STOP}` },
      { text: '📬 צור קשר 📬', data: `${BOT_ACTIONS.CONTACT}` },
    ]);
    await ctx.reply('איך אני יכול לעזור? 👨‍🏫', { reply_markup: keyboard });
    await ctx.deleteMessage().catch(() => {});
  }

  async fireModeHandler(ctx: Context): Promise<void> {
    const { chatId, userDetails } = getMessageData(ctx);
    try {
      await ctx.reply('מצוין! עכשיו נשחק ברצף 🔥');
      userPreferencesCacheService.saveUserPreferences(chatId, { onFireMode: true });
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
    const { chatId, userDetails, messageId, data: response } = getCallbackQueryData(ctx);

    const [action, selectedName, correctName, gameId] = response.split(INLINE_KEYBOARD_SEPARATOR);
    try {
      switch (action) {
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
          await this.contactHandler(ctx, chatId);
          await ctx.deleteMessage().catch(() => {});
          notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.CONTACT }, userDetails);
          break;
        case BOT_ACTIONS.STATISTICS:
          await this.statisticsHandler(ctx, chatId);
          await ctx.deleteMessage().catch(() => {});
          notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.STATISTICS }, userDetails);
          break;
        case BOT_ACTIONS.MAP:
          await this.mapAnswerHandler(chatId, messageId, selectedName, correctName);
          await updateGameLog({ chatId, gameId, selected: selectedName });
          notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ANSWERED, game: '🗺️', isCorrect: correctName === selectedName ? '🟢' : '🔴', correct: correctName, selected: selectedName }, userDetails);
          break;
        case BOT_ACTIONS.US_MAP:
          await this.USMapAnswerHandler(chatId, messageId, selectedName, correctName);
          await updateGameLog({ chatId, gameId, selected: selectedName });
          notify(
            BOT_CONFIG,
            { action: ANALYTIC_EVENT_NAMES.ANSWERED, game: '🇺🇸 🗺️', isCorrect: correctName === selectedName ? '🟢' : '🔴', correct: correctName, selected: selectedName },
            userDetails,
          );
          break;
        case BOT_ACTIONS.FLAG:
          await this.flagAnswerHandler(chatId, messageId, selectedName, correctName);
          await updateGameLog({ chatId, gameId, selected: selectedName });
          notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ANSWERED, game: '🏁', isCorrect: correctName === selectedName ? '🟢' : '🔴', correct: correctName, selected: selectedName }, userDetails);
          break;
        case BOT_ACTIONS.CAPITAL:
          await this.capitalAnswerHandler(chatId, messageId, selectedName, correctName);
          await updateGameLog({ chatId, gameId, selected: selectedName });
          notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ANSWERED, game: '🏛️', isCorrect: correctName === selectedName ? '🟢' : '🔴', correct: correctName, selected: selectedName }, userDetails);
          break;
        default:
          notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ERROR, response }, userDetails);
          throw new Error('Invalid action');
      }

      if (![BOT_ACTIONS.MAP, BOT_ACTIONS.US_MAP, BOT_ACTIONS.FLAG, BOT_ACTIONS.CAPITAL].includes(action as BOT_ACTIONS)) {
        return;
      }
      // If the user is in fire mode, send a new game immediately
      const userPreferences = userPreferencesCacheService.getUserPreferences(chatId);
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
    const userExists = await saveUserDetails(userDetails);

    const subscription = await getSubscription(chatId);
    subscription ? await updateSubscription(chatId, { isActive: true }) : await addSubscription(chatId);

    const newUserReplyText = [
      `היי 👋`,
      'אני בוט שיודע ללמד משחקי גיאוגרפיה בצורה הכי כיפית שיש 😁',
      'כל יום אני אשלח לכם כמה משחקים 🌎',
      'אפשר גם להתחיל משחק חדש מתי שרוצים בפקודות שלי, פה למטה 👇',
      `אם אתם רוצים שאני אפסיק לשלוח משחקים בכל יום, אפשר פשוט לבקש ממני בפקודה ׳פעולות׳, פה למטה 👇`,
    ].join('\n\n');
    const existingUserReplyText = `אין בעיה, אני אשלח משחקים בכל יום 🟢`;
    await ctx.reply(userExists ? existingUserReplyText : newUserReplyText);
  }

  private async stopHandler(ctx: Context, chatId: number): Promise<void> {
    await updateSubscription(chatId, { isActive: false });
    await ctx.reply(`אין בעיה, אני אפסיק לשלוח משחקים בכל יום 🛑`);
  }

  private async contactHandler(ctx: Context, chatId: number): Promise<void> {
    await ctx.reply(['אשמח לעזור', 'אפשר לדבר עם מי שיצר אותי, הוא בטח ידע לעזור', MY_USER_NAME].join('\n'));
  }

  private async statisticsHandler(ctx: Context, chatId: number): Promise<void> {
    const userGameLogs = await getUserGameLogs(chatId);
    if (!userGameLogs?.length) {
      await ctx.reply('אני רואה שעדיין לא שיחנו ביחד משחקים, אפשר להתחיל משחק חדש בפקודה ׳משחק אקראי׳ או בפקודה ׳מפה׳');
      return;
    }

    const replyText = generateStatisticsMessage(userGameLogs);
    await ctx.reply(replyText);
  }

  private async mapAnswerHandler(chatId: number, messageId: number, selectedName: string, correctName: string): Promise<void> {
    await this.bot.api.editMessageReplyMarkup(chatId, messageId, { reply_markup: undefined }).catch(() => {});
    const correctCountry = await getCountryByName(correctName);
    const replyText = `${selectedName !== correctName ? `אופס, טעות. התשובה הנכונה היא:` : `נכון!`} ${correctCountry.emoji} ${correctCountry.hebrewName} ${correctCountry.emoji}`;
    await this.bot.api.editMessageCaption(chatId, messageId, { caption: replyText }).catch(() => {});
    await this.bot.api.setMessageReaction(chatId, messageId, [{ type: 'emoji', emoji: selectedName !== correctName ? '👎' : '👍' }]).catch(() => {});
  }

  private async USMapAnswerHandler(chatId: number, messageId: number, selectedName: string, correctName: string): Promise<void> {
    await this.bot.api.editMessageReplyMarkup(chatId, messageId, { reply_markup: undefined }).catch(() => {});
    const correctState = await getStateByName(correctName);
    const replyText = `${selectedName !== correctName ? `אופס, טעות. התשובה הנכונה היא:` : `נכון!`} ${correctState.hebrewName}`;
    await this.bot.api.editMessageCaption(chatId, messageId, { caption: replyText }).catch(() => {});
    await this.bot.api.setMessageReaction(chatId, messageId, [{ type: 'emoji', emoji: selectedName !== correctName ? '👎' : '👍' }]).catch(() => {});
  }

  private async flagAnswerHandler(chatId: number, messageId: number, selectedName: string, correctName: string): Promise<void> {
    await this.bot.api.editMessageReplyMarkup(chatId, messageId, { reply_markup: undefined }).catch(() => {});
    const correctCountry = await getCountryByName(correctName);
    const replyText = `${selectedName !== correctName ? `אופס, טעות. התשובה הנכונה היא:` : `נכון!`} ${correctCountry.emoji} ${correctCountry.hebrewName} ${correctCountry.emoji}`;
    await this.bot.api.editMessageText(chatId, messageId, replyText).catch(() => {});
    await this.bot.api.setMessageReaction(chatId, messageId, [{ type: 'emoji', emoji: selectedName !== correctName ? '👎' : '👍' }]).catch(() => {});
  }

  private async capitalAnswerHandler(chatId: number, messageId: number, selectedName: string, correctName: string): Promise<void> {
    await this.bot.api.editMessageReplyMarkup(chatId, messageId, { reply_markup: undefined }).catch(() => {});
    const correctCountry = await getCountryByCapital(correctName);
    const replyText = `${selectedName !== correctName ? `אופס, טעות. התשובה הנכונה היא:` : `נכון!`} - עיר הבירה של ${correctCountry.emoji} ${correctCountry.hebrewName} ${correctCountry.emoji} היא ${correctCountry.hebrewCapital}`;
    await this.bot.api.editMessageText(chatId, messageId, replyText).catch(() => {});
    await this.bot.api.setMessageReaction(chatId, messageId, [{ type: 'emoji', emoji: selectedName !== correctName ? '👎' : '👍' }]).catch(() => {});
  }
}