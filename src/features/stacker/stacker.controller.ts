import type { Bot, Context } from 'grammy';
import { Logger } from '@core/utils';
import { buildInlineKeyboard, getCallbackQueryData, getMessageData } from '@services/telegram';
import { Level, LEVELS, Topic, TOPICS, upsertStackerUser } from '@shared/stacker';
import { BOT_ACTIONS, BOT_CONFIG, INLINE_KEYBOARD_SEPARATOR, LEVEL_LABELS, TOPIC_LABELS } from './stacker.config';
import { StackerService } from './stacker.service';

export class StackerController {
  private readonly logger = new Logger(StackerController.name);

  constructor(
    private readonly stackerService: StackerService,
    private readonly bot: Bot,
  ) {}

  init(): void {
    const { START, PLAY, STOP } = BOT_CONFIG.commands;

    this.bot.command(START.command.replace('/', ''), (ctx) => this.startHandler(ctx));
    this.bot.command(PLAY.command.replace('/', ''), (ctx) => this.playHandler(ctx));
    this.bot.command(STOP.command.replace('/', ''), (ctx) => this.stopHandler(ctx));
    this.bot.on('callback_query', (ctx) => this.callbackQueryHandler(ctx));
    this.bot.on('message:text', (ctx) => this.textHandler(ctx));
  }

  private async startHandler(ctx: Context): Promise<void> {
    const { chatId, userDetails } = getMessageData(ctx);
    await upsertStackerUser(chatId, userDetails.telegramUserId, userDetails.username);

    const welcomeMessage = [
      '👋 Welcome to *Stacker* — your programming practice bot!',
      '',
      '🎯 Sharpen your skills with bite-sized questions across:',
      '• JavaScript / TypeScript / Node.js',
      '• Python · SQL · Algorithms',
      '',
      '📚 Pick a topic and a level, then commit to one question at a time.',
      'Wrong answers loop back until you nail them.',
      '',
      'Commands:',
      '/play — Start a new round',
      '/stop — End the current round',
    ].join('\n');

    await ctx.reply(welcomeMessage, { parse_mode: 'Markdown' });
    await this.sendTopicPicker(ctx);
  }

  private async playHandler(ctx: Context): Promise<void> {
    await this.sendTopicPicker(ctx);
  }

  private async stopHandler(ctx: Context): Promise<void> {
    const { chatId } = getMessageData(ctx);
    const stopped = await this.stackerService.stopSession(chatId);
    if (!stopped) await ctx.reply('No active round. Use /play to start one.');
  }

  private async textHandler(ctx: Context): Promise<void> {
    const { chatId, messageId, text } = getMessageData(ctx);
    if (!text || text.startsWith('/')) return;
    try {
      await this.stackerService.gradeTextAnswer(chatId, text, messageId);
    } catch (err) {
      this.logger.error(`Error grading text answer, ${err}`);
    }
  }

  private async sendTopicPicker(ctx: Context): Promise<void> {
    const keyboard = buildInlineKeyboard(
      Object.values(TOPICS).map((topic) => ({
        text: TOPIC_LABELS[topic],
        data: [BOT_ACTIONS.TOPIC, topic].join(INLINE_KEYBOARD_SEPARATOR),
      })),
      2,
    );
    await ctx.reply('📚 Pick a topic:', { reply_markup: keyboard });
  }

  private async sendLevelPicker(ctx: Context, topic: Topic): Promise<void> {
    const keyboard = buildInlineKeyboard(
      Object.values(LEVELS).map((level) => ({
        text: LEVEL_LABELS[level],
        data: [BOT_ACTIONS.LEVEL, topic, level].join(INLINE_KEYBOARD_SEPARATOR),
      })),
    );
    await ctx.reply(`${TOPIC_LABELS[topic]}\n\n🎚️ Pick a level:`, { reply_markup: keyboard });
  }

  private async callbackQueryHandler(ctx: Context): Promise<void> {
    const { chatId, messageId, data, userDetails } = getCallbackQueryData(ctx);
    if (!data) return;

    const [action, ...params] = data.split(INLINE_KEYBOARD_SEPARATOR);

    try {
      switch (action) {
        case BOT_ACTIONS.PLAY: {
          await this.sendTopicPicker(ctx);
          await ctx.deleteMessage().catch(() => {});
          break;
        }

        case BOT_ACTIONS.TOPIC: {
          const topic = params[0] as Topic;
          await this.sendLevelPicker(ctx, topic);
          await ctx.deleteMessage().catch(() => {});
          break;
        }

        case BOT_ACTIONS.LEVEL: {
          const [topic, level] = params as [Topic, Level];
          await ctx.deleteMessage().catch(() => {});
          await this.stackerService.beginSession(chatId, userDetails.telegramUserId, userDetails.username, topic, level);
          break;
        }

        case BOT_ACTIONS.ANSWER: {
          const answerIndex = parseInt(params[0], 10);
          await this.stackerService.gradeButtonAnswer(chatId, messageId, answerIndex);
          break;
        }

        default:
          await ctx.answerCallbackQuery({ text: 'Unknown action' });
      }

      await ctx.answerCallbackQuery().catch(() => {});
    } catch (err) {
      this.logger.error(`Error handling callback query, ${err}`);
      await ctx.answerCallbackQuery({ text: 'Something went wrong. Please try again.', show_alert: true });
    }
  }
}
