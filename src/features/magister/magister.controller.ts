import { promises as fs } from 'fs';
import type { Context } from 'grammy';
import { InputFile } from 'grammy';
import { LOCAL_FILES_PATH } from '@core/config';
import { Logger } from '@core/utils';
import { deleteFile } from '@core/utils';
import { getAudioFromText } from '@services/openai';
import { getCallbackQueryData, getMessageData, MessageLoader, provideTelegramBot, removeItemFromInlineKeyboardMarkup } from '@services/telegram';
import { BOT_ACTIONS, BOT_CONFIG, INLINE_KEYBOARD_SEPARATOR } from './magister.config';
import { MagisterService } from './magister.service';
import { getActiveCourseParticipation, getCourse, getCourseParticipation, markCourseParticipationCompleted } from './mongo';
import { formatLessonProgress } from './utils';

const loaderMessage = '📚 Give me a few moments to prepare your lesson...';
const transcribeLoaderMessage = '🎧 Give me a few moments to transcribe it...';

export class MagisterController {
  private readonly logger = new Logger(MagisterController.name);
  private readonly bot = provideTelegramBot(BOT_CONFIG);

  constructor(private readonly magisterService: MagisterService) {}

  init(): void {
    const { START, COURSE, STATUS, NEXT } = BOT_CONFIG.commands;

    this.bot.command(START.command.replace('/', ''), (ctx) => this.startHandler(ctx));
    this.bot.command(COURSE.command.replace('/', ''), (ctx) => this.courseHandler(ctx));
    this.bot.command(STATUS.command.replace('/', ''), (ctx) => this.statusHandler(ctx));
    this.bot.command(NEXT.command.replace('/', ''), (ctx) => this.nextHandler(ctx));
    this.bot.on('message:text', (ctx) => this.messageHandler(ctx));
    this.bot.on('callback_query:data', (ctx) => this.callbackQueryHandler(ctx));
    this.bot.catch((err) => this.logger.error(`${err}`));
  }

  async startHandler(ctx: Context): Promise<void> {
    const replyText = [
      `Hey There 👋`,
      ``,
      `I am *Magister Bot* 📚 - your personal learning companion!`,
      ``,
      `I teach from curated materials tailored to your learning goals.`,
      `Each course is broken into multiple lessons that adapt to the material depth.`,
      ``,
      `Complete lessons at your own pace - the next one unlocks when you're ready!`,
      ``,
      `Ready to start? Use /course to begin! 🚀`,
    ].join('\n');

    await ctx.reply(replyText, { parse_mode: 'Markdown' });
  }

  private async courseHandler(ctx: Context): Promise<void> {
    const { chatId, messageId } = getMessageData(ctx);
    const activeCourse = await getActiveCourseParticipation(chatId);

    if (activeCourse?._id) {
      await markCourseParticipationCompleted(activeCourse._id.toString());
    }

    const result = await this.magisterService.startNewCourse(chatId, true);
    if (!result) return;

    const { course, courseParticipation } = result;

    const messageLoaderService = new MessageLoader(this.bot, chatId, messageId, { reactionEmoji: '🤔', loaderMessage });
    await messageLoaderService.handleMessageWithLoader(async () => {
      await this.magisterService.sendLesson(chatId, courseParticipation, course).catch((err) => {
        this.logger.error(`Error sending lesson after course start ${err}`);
      });
    });
  }

  private async statusHandler(ctx: Context): Promise<void> {
    const { chatId } = getMessageData(ctx);
    const activeCourse = await getActiveCourseParticipation(chatId);

    if (!activeCourse) {
      await ctx.reply(`📚 No active course\n\nUse /course to start your learning journey!`);
      return;
    }

    const course = await getCourse(activeCourse.courseId);
    const progressText = formatLessonProgress(activeCourse.currentLesson, activeCourse.totalLessons);

    const statusMessage = [`📚 *Course: ${course.topic}*`, ``, progressText].join('\n');

    await ctx.reply(statusMessage, { parse_mode: 'Markdown' });
  }

  private async nextHandler(ctx: Context): Promise<void> {
    const { chatId, messageId } = getMessageData(ctx);

    const messageLoaderService = new MessageLoader(this.bot, chatId, messageId, { reactionEmoji: '🤔', loaderMessage });
    await messageLoaderService.handleMessageWithLoader(async () => {
      await this.magisterService.processNextLesson(chatId);
    });
  }

  async messageHandler(ctx: Context): Promise<void> {
    const { chatId, messageId, text } = getMessageData(ctx);

    const activeCourseParticipation = await getActiveCourseParticipation(chatId);
    if (!activeCourseParticipation) {
      await ctx.reply(`I see you don't have an active course\nIf you want to start a new one, just use the ${BOT_CONFIG.commands.COURSE.command} command`);
      return;
    }

    const messageLoaderService = new MessageLoader(this.bot, chatId, messageId, { reactionEmoji: '🤔', loaderMessage: '💭 Let me think about your question...' });
    await messageLoaderService.handleMessageWithLoader(async () => {
      await this.magisterService.processQuestion(chatId, activeCourseParticipation, text);
    });
  }

  private async callbackQueryHandler(ctx: Context): Promise<void> {
    const { chatId, messageId, data: response, text, replyMarkup } = getCallbackQueryData(ctx);

    await ctx.answerCallbackQuery().catch(() => {});

    const responseParts = response.split(INLINE_KEYBOARD_SEPARATOR);
    const [action, courseParticipationId] = responseParts;

    switch (action) {
      case BOT_ACTIONS.COMPLETE_LESSON:
        await this.handleCallbackCompleteLesson(chatId, messageId, courseParticipationId);
        break;

      case BOT_ACTIONS.TRANSCRIBE:
        await this.handleCallbackTranscribeMessage(ctx, chatId, messageId, text, replyMarkup);
        break;

      case BOT_ACTIONS.COMPLETE_COURSE:
        await this.handleCallbackCompleteCourse(chatId, messageId, courseParticipationId);
        break;

      case BOT_ACTIONS.QUIZ:
        await this.handleCallbackQuiz(chatId, courseParticipationId);
        break;

      case BOT_ACTIONS.QUIZ_ANSWER: {
        const questionIndex = parseInt(responseParts[2], 10);
        const answerIndex = parseInt(responseParts[3], 10);
        await this.handleCallbackQuizAnswer(chatId, messageId, courseParticipationId, questionIndex, answerIndex);
        break;
      }

      default:
        throw new Error('Invalid action');
    }
  }

  private async handleCallbackTranscribeMessage(ctx: Context, chatId: number, messageId: number, text: string, replyMarkup: any): Promise<void> {
    const messageLoaderService = new MessageLoader(this.bot, chatId, messageId, {
      loadingAction: 'upload_voice',
      loaderMessage: transcribeLoaderMessage,
    });

    await messageLoaderService.handleMessageWithLoader(async () => {
      if (replyMarkup) {
        const filteredInlineKeyboardMarkup = removeItemFromInlineKeyboardMarkup(replyMarkup, BOT_ACTIONS.TRANSCRIBE);
        await ctx.editMessageReplyMarkup({ reply_markup: filteredInlineKeyboardMarkup }).catch(() => {});
      }

      await ctx.react('👌').catch(() => {});

      const result = await getAudioFromText(text);

      const audioFilePath = `${LOCAL_FILES_PATH}/magister-text-to-speech-${new Date().getTime()}.mp3`;
      const buffer = Buffer.from(await result.arrayBuffer());
      await fs.writeFile(audioFilePath, buffer);

      await this.bot.api.sendVoice(chatId, new InputFile(audioFilePath));
      await deleteFile(audioFilePath);
    });
  }

  private async handleCallbackCompleteLesson(chatId: number, messageId: number, courseParticipationId: string): Promise<void> {
    const courseParticipation = await getCourseParticipation(courseParticipationId);
    const messagesToUpdate = [messageId, ...(courseParticipation?.threadMessages || [])];

    await Promise.all(
      messagesToUpdate.map(async (message) => {
        await Promise.all([
          this.bot.api.editMessageReplyMarkup(chatId, message, { reply_markup: undefined }).catch(() => {}),
          this.bot.api.setMessageReaction(chatId, message, [{ type: 'emoji', emoji: '✅' as any }]).catch(() => {}),
        ]);
      }),
    );

    await this.magisterService.handleLessonCompletion(chatId, courseParticipationId);
  }

  private async handleCallbackCompleteCourse(chatId: number, messageId: number, courseParticipationId: string): Promise<void> {
    const courseParticipation = await markCourseParticipationCompleted(courseParticipationId);
    const messagesToUpdate = [messageId, ...(courseParticipation?.threadMessages || [])];

    await Promise.all(
      messagesToUpdate.map(async (message) => {
        await Promise.all([
          this.bot.api.editMessageReplyMarkup(chatId, message, { reply_markup: undefined }).catch(() => {}),
          this.bot.api.setMessageReaction(chatId, message, [{ type: 'emoji', emoji: '🎓' as any }]).catch(() => {}),
        ]);
      }),
    );

    await this.bot.api.sendMessage(chatId, `🎉 Congratulations! You've completed the course!\n\nGenerating your comprehensive summary...`);

    await this.magisterService.generateCourseSummary(courseParticipationId);
  }

  private async handleCallbackQuiz(chatId: number, courseParticipationId: string): Promise<void> {
    const quizLoaderMessage = '🎯 Generating your quiz...';
    const messageLoaderService = new MessageLoader(this.bot, chatId, undefined, { reactionEmoji: '🤔', loaderMessage: quizLoaderMessage });

    await messageLoaderService.handleMessageWithLoader(async () => {
      await this.magisterService.generateQuiz(courseParticipationId);

      const courseParticipation = await getCourseParticipation(courseParticipationId);
      if (!courseParticipation) {
        await this.bot.api.sendMessage(chatId, 'Something went wrong... Could not generate the quiz. Please try again later.');
        return;
      }

      await this.bot.api.sendMessage(chatId, [`🎯 *Final Quiz!*`, '', `5 questions to test your understanding of the entire course 🚀`].join('\n'), { parse_mode: 'Markdown' });

      await this.magisterService.sendQuizQuestion(chatId, courseParticipation, 0);
    });
  }

  private async handleCallbackQuizAnswer(chatId: number, messageId: number, courseParticipationId: string, questionIndex: number, answerIndex: number): Promise<void> {
    await this.magisterService.checkQuizAnswer(courseParticipationId, questionIndex, answerIndex, chatId, messageId);
  }
}
