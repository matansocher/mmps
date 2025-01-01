import TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable } from '@nestjs/common';
import { LoggerService } from '@core/logger';
import { TeacherMongoLessonService } from '@core/mongo/teacher-mongo';
import { MY_USER_ID } from '@core/notifier-bot/notifier-bot.config';
import { UtilsService } from '@core/utils';
import { OpenaiAssistantService } from '@services/openai';
import { BOTS, TelegramGeneralService } from '@services/telegram';
import {
  TOTAL_LESSON_PARTS,
  TEACHER_ASSISTANT_ID,
  THREAD_MESSAGE_FIRST_PART,
  THREAD_MESSAGE_NEXT_PART
} from './teacher.config';

@Injectable()
export class TeacherService {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly mongoLessonService: TeacherMongoLessonService,
    private readonly openaiAssistantService: OpenaiAssistantService,
    private readonly telegramGeneralService: TelegramGeneralService,
    @Inject(BOTS.PROGRAMMING_TEACHER.name) private readonly bot: TelegramBot,
  ) {}

  async lessonFirstPart(): Promise<void> {
    const lesson = await this.mongoLessonService.getRandomLesson();
    if (!lesson) {
      return;
    }

    const { id: threadId } = await this.openaiAssistantService.createThread();
    await this.mongoLessonService.markLessonAsStarted(lesson._id, { assistantThreadId: threadId });
    const response = await this.getAssistantAnswer(threadId, `${THREAD_MESSAGE_FIRST_PART}. today's topic is ${lesson.topic}`);
    await this.sendMarkdownMessage(MY_USER_ID, response);
    await this.mongoLessonService.markLessonPartCompleted(lesson._id, TOTAL_LESSON_PARTS);
  }

  async lessonNextPart(): Promise<void> {
    const lesson = await this.mongoLessonService.getActiveLesson();
    if (!lesson) {
      return;
    }

    const response = await this.getAssistantAnswer(lesson.assistantThreadId, THREAD_MESSAGE_NEXT_PART);
    await this.sendMarkdownMessage(MY_USER_ID, response);
    await this.mongoLessonService.markLessonPartCompleted(lesson._id, TOTAL_LESSON_PARTS);
  }

  async getAssistantAnswer(threadId: string, prompt: string): Promise<string> {
    await this.openaiAssistantService.addMessageToThread(threadId, prompt, 'user');
    const threadRun = await this.openaiAssistantService.runThread(TEACHER_ASSISTANT_ID, threadId);
    return this.openaiAssistantService.getThreadResponse(threadRun.thread_id);
  }

  async sendMarkdownMessage(chatId: number, message: string): Promise<void> {
    try {
      await this.telegramGeneralService.sendMessage(this.bot, chatId, message, { parse_mode: 'Markdown' });
    } catch (err) {
      await this.telegramGeneralService.sendMessage(this.bot, chatId, message);
    }
  }
}
