import TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { LoggerService } from '@core/logger';
import { MY_USER_ID } from '@core/notifier-bot/notifier-bot.config';
import { UtilsService } from '@core/utils';
import { OpenaiAssistantService } from '@services/openai';
import { type GoogleArticle, GoogleSearchService } from '@services/google-search';
import { BOTS, TelegramGeneralService } from '@services/telegram';
import { TEACHER_ASSISTANT_ID, LOCAL_FILES_PATH, HOURS_OF_DAY, THREAD_MESSAGE_INSTRUCTIONS } from './teacher-bot.config';

@Injectable()
export class TeacherSchedulerService {
  readonly chatIds = [MY_USER_ID]; // $$$$$$$$$$$$$$$$$$$ add tootie

  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly openaiAssistantService: OpenaiAssistantService,
    private readonly googleSearchService: GoogleSearchService,
    private readonly telegramGeneralService: TelegramGeneralService,
    @Inject(BOTS.TEACHER.name) private readonly bot: TelegramBot,
  ) {}

  @Cron(`0 ${HOURS_OF_DAY.join(',')} * * *`, { name: 'teacher-scheduler', timeZone: DEFAULT_TIMEZONE })
  async handleIntervalFlow(topic: string): Promise<void> {
    const articles = await this.googleSearchService.searchContent(topic);
    if (!articles?.length) {
      return;
    }

    const fileName = await this.writeContentsToFile(articles);

    const openAIFileID = await this.openaiAssistantService.uploadFile(fileName);

    const summary = await this.getSummary(openAIFileID);

    await Promise.all(this.chatIds.map((chatId) => this.telegramGeneralService.sendMessage(this.bot, chatId, summary)));

    await Promise.all([this.openaiAssistantService.deleteFile(openAIFileID), this.utilsService.deleteFile(fileName)]);
  }

  async writeContentsToFile(articlesContents: GoogleArticle[]): Promise<string> {
    const filePath = `${LOCAL_FILES_PATH}/teacher-articles-${Date.now()}.txt`;
    const fileContent = articlesContents.map(({ title, link, content }, i) => `#${i + 1}\n${title}\n${link}\n${content}\n`).join('\n\n');
    await this.utilsService.writeFile(filePath, fileContent);
    return filePath;
  }

  async getSummary(openAIFileID: string): Promise<string> {
    const threadId = await this.openaiAssistantService.createThread();
    await this.openaiAssistantService.addMessageToThread(threadId, THREAD_MESSAGE_INSTRUCTIONS, 'user', openAIFileID);
    const threadRun = await this.openaiAssistantService.runThread(TEACHER_ASSISTANT_ID, threadId);
    return this.openaiAssistantService.getThreadResponse(threadRun.thread_id);
  }
}
