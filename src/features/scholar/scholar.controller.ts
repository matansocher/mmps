import { promises as fs } from 'fs';
import TelegramBot, { CallbackQuery, InlineKeyboardMarkup, Message } from 'node-telegram-bot-api';
import { env } from 'node:process';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { LOCAL_FILES_PATH, MY_USER_ID } from '@core/config';
import { deleteFile } from '@core/utils';
import { getAudioFromText } from '@services/openai';
import {
  BOT_BROADCAST_ACTIONS,
  getBotToken,
  getCallbackQueryData,
  getMessageData,
  MessageLoader,
  reactToMessage,
  registerHandlers,
  removeItemFromInlineKeyboardMarkup,
  TELEGRAM_EVENTS,
  TelegramEventHandler,
} from '@services/telegram';
import { getActiveCourseParticipation, getCourse, getCourseParticipation, markCourseParticipationCompleted } from './mongo';
import { BOT_ACTIONS, BOT_CONFIG } from './scholar.config';
import { ScholarService } from './scholar.service';
import { formatLessonProgress } from './utils';

const loaderMessage = '📚 Give me a few moments to prepare your lesson...';
const transcribeLoaderMessage = '🎧 Give me a few moments to transcribe it...';

@Injectable()
export class ScholarController implements OnModuleInit {
  private readonly logger = new Logger(ScholarController.name);
  private readonly botToken = getBotToken(BOT_CONFIG.id, env[BOT_CONFIG.token]);

  constructor(
    private readonly scholarService: ScholarService,
    @Inject(BOT_CONFIG.id) private readonly bot: TelegramBot,
  ) {}

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
      `I am *Scholar Bot* 📚 - your personal learning companion!`,
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
    const activeCourse = await getActiveCourseParticipation(MY_USER_ID);

    if (activeCourse?._id) {
      await markCourseParticipationCompleted(activeCourse._id.toString());
    }

    const messageLoaderService = new MessageLoader(this.bot, this.botToken, chatId, messageId, {
      reactionEmoji: '🤔',
      loaderMessage,
    });

    await messageLoaderService.handleMessageWithLoader(async () => {
      await this.scholarService.startNewCourse(chatId, true);
    });
  }

  private async statusHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    const activeCourse = await getActiveCourseParticipation(MY_USER_ID);

    if (!activeCourse) {
      await this.bot.sendMessage(chatId, `📚 No active course\n\nUse /course to start your learning journey!`);
      return;
    }

    const course = await getCourse(activeCourse.courseId);
    const progressText = formatLessonProgress(activeCourse.currentLesson, activeCourse.totalLessons, activeCourse.lessonsCompleted);

    let nextLessonText = '';
    if (activeCourse.nextLessonAvailableAt && activeCourse.isWaitingForNextLesson) {
      const timeStr = activeCourse.nextLessonAvailableAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      nextLessonText = `\n\n⏰ Next lesson available at: *${timeStr}*`;
    } else if (activeCourse.lessonsCompleted < activeCourse.currentLesson) {
      nextLessonText = `\n\n💡 Complete your current lesson to unlock the next one!`;
    }

    const statusMessage = [`📚 *Course: ${course.topic}*`, ``, progressText, nextLessonText, ``, course.materialSummary ? `📖 ${course.materialSummary}` : ''].join('\n');

    await this.bot.sendMessage(chatId, statusMessage, { parse_mode: 'Markdown' });
  }

  private async nextHandler(message: Message): Promise<void> {
    const { chatId, messageId } = getMessageData(message);

    const messageLoaderService = new MessageLoader(this.bot, this.botToken, chatId, messageId, {
      reactionEmoji: '🤔',
      loaderMessage,
    });

    await messageLoaderService.handleMessageWithLoader(async () => {
      await this.scholarService.processNextLesson(chatId);
    });
  }

  async messageHandler(message: Message): Promise<void> {
    const { chatId, messageId, text } = getMessageData(message);

    // Prevent built-in commands from being processed here
    if (Object.values(BOT_CONFIG.commands).some((command) => text.includes(command.command))) return;

    const activeCourseParticipation = await getActiveCourseParticipation(MY_USER_ID);
    if (!activeCourseParticipation) {
      await this.bot.sendMessage(chatId, `I see you don't have an active course\nIf you want to start a new one, just use the ${BOT_CONFIG.commands.COURSE.command} command`);
      return;
    }

    const messageLoaderService = new MessageLoader(this.bot, this.botToken, chatId, messageId, {
      reactionEmoji: '🤔',
      loaderMessage: '💭 Let me think about your question...',
    });

    await messageLoaderService.handleMessageWithLoader(async () => {
      await this.scholarService.processQuestion(chatId, activeCourseParticipation, text);
    });
  }

  private async callbackQueryHandler(callbackQuery: CallbackQuery): Promise<void> {
    const { chatId, messageId, data: response, text, replyMarkup } = getCallbackQueryData(callbackQuery);

    const [action, courseParticipationId] = response.split(' - ');

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

      const audioFilePath = `${LOCAL_FILES_PATH}/scholar-text-to-speech-${new Date().getTime()}.mp3`;
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

    await this.scholarService.handleLessonCompletion(chatId, courseParticipationId);
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

    this.scholarService.generateCourseSummary(courseParticipationId);
  }
}
