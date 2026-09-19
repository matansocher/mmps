import { Bot, Context, InlineKeyboard } from 'grammy';
import { MMPS_BASE_URL } from '@core/config';
import { getErrorMessage, Logger } from '@core/utils';
import { notify } from '@services/notifier';
import { getCallbackQueryData, getMessageData } from '@services/telegram';
import { getCatalogEntry } from './learner-catalog';
import { ANALYTIC_EVENT_NAMES, BOT_ACTIONS, BOT_CONFIG, INLINE_KEYBOARD_SEPARATOR } from './learner.config';
import { selectNextBite } from './learner-scheduler';
import { applyRatingServerSide, getProgress, markAnsweredByMessage, upsertSubscription } from './mongo';
import type { LearnerSchedulerService } from './learner-scheduler.service';
import type { LearnerRating } from './types';

const LEARNER_APP_URL = `${MMPS_BASE_URL}/learner`;

const RATING_LABELS: Record<LearnerRating, string> = {
  got_it: '💪 Got it',
  fuzzy: '🤔 Fuzzy',
  nope: '😵 Nope',
};

export function buildBiteMessage(biteId: string): { readonly text: string; readonly keyboard: InlineKeyboard } | null {
  const entry = getCatalogEntry(biteId);
  if (!entry) return null;

  const lines = [`📚 *${entry.title}*`];
  if (entry.subtitle) lines.push(entry.subtitle);
  if (entry.firstQuestion) lines.push('', `❓ ${entry.firstQuestion}`);
  lines.push('', 'How well do you know this?');

  const keyboard = new InlineKeyboard()
    .text(RATING_LABELS.got_it, `${BOT_ACTIONS.GOT_IT}${INLINE_KEYBOARD_SEPARATOR}${biteId}`)
    .text(RATING_LABELS.fuzzy, `${BOT_ACTIONS.FUZZY}${INLINE_KEYBOARD_SEPARATOR}${biteId}`)
    .text(RATING_LABELS.nope, `${BOT_ACTIONS.NOPE}${INLINE_KEYBOARD_SEPARATOR}${biteId}`)
    .row()
    .webApp('🚀 Open the app', LEARNER_APP_URL);

  return { text: lines.join('\n'), keyboard };
}

export class LearnerController {
  private readonly logger = new Logger('learner:controller');

  constructor(
    private readonly bot: Bot,
    private readonly scheduler: LearnerSchedulerService,
  ) {}

  init(): void {
    const { START, TODAY, APP, STOP } = BOT_CONFIG.commands;
    this.bot.command(START.command.replace('/', ''), (ctx) => this.startHandler(ctx));
    this.bot.command(TODAY.command.replace('/', ''), (ctx) => this.todayHandler(ctx));
    this.bot.command(APP.command.replace('/', ''), (ctx) => this.appHandler(ctx));
    this.bot.command(STOP.command.replace('/', ''), (ctx) => this.stopHandler(ctx));
    this.bot.on('callback_query:data', (ctx) => this.callbackQueryHandler(ctx));
    this.bot.catch((err) => this.logger.error(getErrorMessage(err)));
  }

  private async startHandler(ctx: Context): Promise<void> {
    const { chatId, userDetails } = getMessageData(ctx);
    await upsertSubscription(chatId, true);
    const text = [
      'היי 👋',
      'I turn two study guides — System Design 📐 and AI Engineering 🧠 — into small daily bites.',
      "I'll send you one short reminder a day. Rate each bite and I'll space out reviews so it actually sticks 🧠",
      'Open the full app any time with /app, or grab a bite now with /today.',
    ].join('\n\n');
    const keyboard = new InlineKeyboard().webApp('🚀 Open the app', LEARNER_APP_URL);
    await ctx.reply(text, { reply_markup: keyboard });
    notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.START }, userDetails);
    // Deliver the first bite right away so a new subscriber doesn't wait for the next daily tick.
    await this.scheduler.sendFirstBiteNow(chatId).catch((err) => this.logger.error(getErrorMessage(err)));
  }

  private async todayHandler(ctx: Context): Promise<void> {
    const { chatId, userDetails } = getMessageData(ctx);
    try {
      const doc = await getProgress(chatId);
      const progress = doc ?? { states: {}, streak: 0, lastStudyDate: null, updatedAt: null };
      const biteId = selectNextBite(progress);
      if (!biteId) {
        await ctx.reply('🎉 You are all caught up — nothing due right now. Come back later or explore in /app.');
        return;
      }
      const message = buildBiteMessage(biteId);
      if (!message) {
        await ctx.reply('Something went wrong picking a bite. Try /app.');
        return;
      }
      await ctx.reply(message.text, { reply_markup: message.keyboard, parse_mode: 'Markdown' });
      notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.TODAY }, userDetails);
    } catch (err) {
      notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.TODAY, error: `❗️ ${err}` }, userDetails);
      throw err;
    }
  }

  private async appHandler(ctx: Context): Promise<void> {
    const { userDetails } = getMessageData(ctx);
    const keyboard = new InlineKeyboard().webApp('🚀 Open the app', LEARNER_APP_URL);
    await ctx.reply('Open your learning app 👇', { reply_markup: keyboard });
    notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.APP }, userDetails);
  }

  private async stopHandler(ctx: Context): Promise<void> {
    const { chatId, userDetails } = getMessageData(ctx);
    await upsertSubscription(chatId, false);
    await ctx.reply(["No problem — I'll stop the daily reminders 🛑", 'You can still open the app any time with /app.'].join('\n\n'));
    notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.STOP }, userDetails);
  }

  private async callbackQueryHandler(ctx: Context): Promise<void> {
    const { chatId, userDetails, data } = getCallbackQueryData(ctx);
    const [action, biteId] = data.split(INLINE_KEYBOARD_SEPARATOR);

    if (![BOT_ACTIONS.GOT_IT, BOT_ACTIONS.FUZZY, BOT_ACTIONS.NOPE].includes(action as BOT_ACTIONS)) {
      await ctx.answerCallbackQuery().catch(() => {});
      return;
    }

    const rating = action as LearnerRating;
    try {
      await applyRatingServerSide(chatId, biteId, rating);

      const messageId = ctx.callbackQuery?.message?.message_id;
      if (messageId) await markAnsweredByMessage(chatId, messageId, rating).catch(() => null);

      await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
      await ctx.answerCallbackQuery({ text: `Saved: ${RATING_LABELS[rating]}` }).catch(() => {});
      await ctx.react(rating === 'nope' ? '👀' : '👍').catch(() => {});

      const entry = getCatalogEntry(biteId);
      notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.RATED, rating, bite: entry?.title ?? biteId }, userDetails);
    } catch (err) {
      await ctx.answerCallbackQuery({ text: 'Could not save, try again' }).catch(() => {});
      notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.RATED, error: `❗️ ${err}` }, userDetails);
      throw err;
    }
  }
}
