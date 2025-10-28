import { promises as fs } from 'fs';
import { CallbackQuery, InlineKeyboardMarkup, Message } from 'node-telegram-bot-api';
import { env } from 'node:process';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { LOCAL_FILES_PATH } from '@core/config';
import { deleteFile } from '@core/utils';
import { getAudioFromText } from '@services/openai';
import {
  BOT_BROADCAST_ACTIONS,
  getBotToken,
  getCallbackQueryData,
  getMessageData,
  MessageLoader,
  provideTelegramBot,
  reactToMessage,
  registerHandlers,
  removeItemFromInlineKeyboardMarkup,
  TELEGRAM_EVENTS,
  TelegramEventHandler,
} from '@services/telegram';
import { BOT_ACTIONS, BOT_CONFIG, INLINE_KEYBOARD_SEPARATOR } from './magister.config';
import { MagisterService } from './magister.service';
import { getActiveCourseParticipation, getCourse, getCourseParticipation, markCourseParticipationCompleted } from './mongo';
import { formatLessonProgress } from './utils';

const loaderMessage = '📚 Give me a few moments to prepare your lesson...';
const transcribeLoaderMessage = '🎧 Give me a few moments to transcribe it...';

@Injectable()
export class MagisterController implements OnModuleInit {
  private readonly logger = new Logger(MagisterController.name);
  private readonly bot = provideTelegramBot(BOT_CONFIG);
  private readonly botToken = getBotToken(BOT_CONFIG.id, env[BOT_CONFIG.token]);

  constructor(private readonly magisterService: MagisterService) {}

  onModuleInit(): void {
    const { COMMAND, MESSAGE, CALLBACK_QUERY } = TELEGRAM_EVENTS;
    const { START, COURSE, STATUS, NEXT } = BOT_CONFIG.commands;

    const handlers: TelegramEventHandler[] = [
      { event: COMMAND, regex: START.command, handler: (message) => this.startHandler.call(this, message) },
      { event: COMMAND, regex: COURSE.command, handler: (message) => this.courseHandler.call(this, message) },
      { event: COMMAND, regex: STATUS.command, handler: (message) => this.statusHandler.call(this, message) },
      { event: COMMAND, regex: NEXT.command, handler: (message) => this.nextHandler.call(this, message) },
      { event: MESSAGE, handler: (message) => this.messageHandler.call(this, message) },
      { event: CALLBACK_QUERY, handler: (callbackQuery) => this.callbackQueryHandler.call(this, callbackQuery) },
    ];

    registerHandlers({ bot: this.bot, logger: this.logger, handlers, isBlocked: true });
  }

  async startHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);

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

    await this.bot.sendMessage(chatId, replyText, { parse_mode: 'Markdown' });
  }

  private async courseHandler(message: Message): Promise<void> {
    const { chatId, messageId } = getMessageData(message);
    const activeCourse = await getActiveCourseParticipation(chatId);

    if (activeCourse?._id) {
      await markCourseParticipationCompleted(activeCourse._id.toString());
    }

    const result = await this.magisterService.startNewCourse(chatId, true);
    if (!result) return;

    const { course, courseParticipation } = result;

    const messageLoaderService = new MessageLoader(this.bot, this.botToken, chatId, messageId, { reactionEmoji: '🤔', loaderMessage });
    await messageLoaderService.handleMessageWithLoader(async () => {
      await this.magisterService.sendLesson(chatId, courseParticipation, course).catch((err) => {
        this.logger.error(`Error sending lesson after course start ${err}`);
      });
    });
  }

  private async statusHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    const activeCourse = await getActiveCourseParticipation(chatId);

    if (!activeCourse) {
      await this.bot.sendMessage(chatId, `📚 No active course\n\nUse /course to start your learning journey!`);
      return;
    }

    const course = await getCourse(activeCourse.courseId);
    const progressText = formatLessonProgress(activeCourse.currentLesson, activeCourse.totalLessons);

    const statusMessage = [`📚 *Course: ${course.topic}*`, ``, progressText].join('\n');

    await this.bot.sendMessage(chatId, statusMessage, { parse_mode: 'Markdown' });
  }

  private async nextHandler(message: Message): Promise<void> {
    const { chatId, messageId } = getMessageData(message);

    const messageLoaderService = new MessageLoader(this.bot, this.botToken, chatId, messageId, { reactionEmoji: '🤔', loaderMessage });
    await messageLoaderService.handleMessageWithLoader(async () => {
      await this.magisterService.processNextLesson(chatId);
    });
  }

  async messageHandler(message: Message): Promise<void> {
    const { chatId, messageId, text } = getMessageData(message);

    // Prevent built-in commands from being processed here
    if (Object.values(BOT_CONFIG.commands).some((command) => text.includes(command.command))) return;

    const activeCourseParticipation = await getActiveCourseParticipation(chatId);
    if (!activeCourseParticipation) {
      await this.bot.sendMessage(chatId, `I see you don't have an active course\nIf you want to start a new one, just use the ${BOT_CONFIG.commands.COURSE.command} command`);
      return;
    }

    const messageLoaderService = new MessageLoader(this.bot, this.botToken, chatId, messageId, { reactionEmoji: '🤔', loaderMessage: '💭 Let me think about your question...' });
    await messageLoaderService.handleMessageWithLoader(async () => {
      await this.magisterService.processQuestion(chatId, activeCourseParticipation, text);
    });
  }

  private async callbackQueryHandler(callbackQuery: CallbackQuery): Promise<void> {
    const { chatId, messageId, data: response, text, replyMarkup } = getCallbackQueryData(callbackQuery);

    await this.bot.answerCallbackQuery(callbackQuery.id).catch(() => {});

    const responseParts = response.split(INLINE_KEYBOARD_SEPARATOR);
    const [action, courseParticipationId] = responseParts;

    switch (action) {
      case BOT_ACTIONS.COMPLETE_LESSON:
        await this.handleCallbackCompleteLesson(chatId, messageId, courseParticipationId);
        break;

      case BOT_ACTIONS.TRANSCRIBE:
        await this.handleCallbackTranscribeMessage(chatId, messageId, text, replyMarkup);
        break;

      case BOT_ACTIONS.COMPLETE_COURSE:
        await this.handleCallbackCompleteCourse(chatId, messageId, courseParticipationId);
        break;

      case BOT_ACTIONS.QUIZ:
        await this.handleCallbackQuiz(chatId, courseParticipationId);
        break;

      case BOT_ACTIONS.QUIZ_ANSWER:
        const questionIndex = parseInt(responseParts[2], 10);
        const answerIndex = parseInt(responseParts[3], 10);
        await this.handleCallbackQuizAnswer(chatId, messageId, courseParticipationId, questionIndex, answerIndex);
        break;

      default:
        throw new Error('Invalid action');
    }
  }

  private async handleCallbackTranscribeMessage(chatId: number, messageId: number, text: string, replyMarkup: InlineKeyboardMarkup): Promise<void> {
    const messageLoaderService = new MessageLoader(this.bot, this.botToken, chatId, messageId, {
      loadingAction: BOT_BROADCAST_ACTIONS.UPLOADING_VOICE,
      loaderMessage: transcribeLoaderMessage,
    });

    await messageLoaderService.handleMessageWithLoader(async () => {
      const filteredInlineKeyboardMarkup = removeItemFromInlineKeyboardMarkup(replyMarkup, BOT_ACTIONS.TRANSCRIBE);
      await this.bot.editMessageReplyMarkup(filteredInlineKeyboardMarkup, { message_id: messageId, chat_id: chatId }).catch(() => {});

      await reactToMessage(this.botToken, chatId, messageId, '🤯');

      const result = await getAudioFromText(text);

      const audioFilePath = `${LOCAL_FILES_PATH}/magister-text-to-speech-${new Date().getTime()}.mp3`;
      const buffer = Buffer.from(await result.arrayBuffer());
      await fs.writeFile(audioFilePath, buffer);

      await this.bot.sendVoice(chatId, audioFilePath);
      await deleteFile(audioFilePath);
    });
  }

  private async handleCallbackCompleteLesson(chatId: number, messageId: number, courseParticipationId: string): Promise<void> {
    const courseParticipation = await getCourseParticipation(courseParticipationId);
    const messagesToUpdate = [messageId, ...(courseParticipation?.threadMessages || [])];

    await Promise.all(
      messagesToUpdate.map(async (message) => {
        await Promise.all([this.bot.editMessageReplyMarkup(undefined, { message_id: message, chat_id: chatId }).catch(() => {}), reactToMessage(this.botToken, chatId, message, '✅')]);
      }),
    );

    await this.magisterService.handleLessonCompletion(chatId, courseParticipationId);
  }

  private async handleCallbackCompleteCourse(chatId: number, messageId: number, courseParticipationId: string): Promise<void> {
    const courseParticipation = await markCourseParticipationCompleted(courseParticipationId);
    const messagesToUpdate = [messageId, ...(courseParticipation?.threadMessages || [])];

    await Promise.all(
      messagesToUpdate.map(async (message) => {
        await Promise.all([this.bot.editMessageReplyMarkup(undefined, { message_id: message, chat_id: chatId }).catch(() => {}), reactToMessage(this.botToken, chatId, message, '🎓')]);
      }),
    );

    await this.bot.sendMessage(chatId, `🎉 Congratulations! You've completed the course!\n\nGenerating your comprehensive summary...`);

    await this.magisterService.generateCourseSummary(courseParticipationId);
  }

  private async handleCallbackQuiz(chatId: number, courseParticipationId: string): Promise<void> {
    const quizLoaderMessage = '🎯 Generating your quiz...';
    const messageLoaderService = new MessageLoader(this.bot, this.botToken, chatId, undefined, { reactionEmoji: '🤔', loaderMessage: quizLoaderMessage });

    await messageLoaderService.handleMessageWithLoader(async () => {
      await this.magisterService.generateQuiz(courseParticipationId);

      const courseParticipation = await getCourseParticipation(courseParticipationId);
      if (!courseParticipation) {
        await this.bot.sendMessage(chatId, 'Something went wrong... Could not generate the quiz. Please try again later.');
        return;
      }

      await this.bot.sendMessage(chatId, [`🎯 *Final Quiz!*`, '', `5 questions to test your understanding of the entire course 🚀`].join('\n'), { parse_mode: 'Markdown' });

      await this.magisterService.sendQuizQuestion(chatId, courseParticipation, 0);
    });
  }

  private async handleCallbackQuizAnswer(chatId: number, messageId: number, courseParticipationId: string, questionIndex: number, answerIndex: number): Promise<void> {
    await this.magisterService.checkQuizAnswer(courseParticipationId, questionIndex, answerIndex, chatId, messageId);
  }
}
