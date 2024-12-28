import TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { LoggerService } from '@core/logger';
import { MY_USER_ID } from '@core/notifier-bot/notifier-bot.config';
import { UtilsService } from '@core/utils';
import { OpenaiAssistantService } from '@services/openai';
import { BOTS, TelegramGeneralService } from '@services/telegram';
import {
  TEACHER_ASSISTANT_ID,
  LOCAL_FILES_PATH,
  HOURS_OF_DAY,
  THREAD_MESSAGE_INSTRUCTIONS,
  MAX_NUMBER_OF_CHARS_PER_FILE,
} from './teacher-bot.config';

@Injectable()
export class TeacherSchedulerService {
  readonly chatIds = [MY_USER_ID]; // $$$$$$$$$$$$$$$$$$$ add tootie

  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly openaiAssistantService: OpenaiAssistantService,
    private readonly telegramGeneralService: TelegramGeneralService,
    @Inject(BOTS.TEACHER.name) private readonly bot: TelegramBot,
  ) {}

  @Cron(`0 ${HOURS_OF_DAY.join(',')} * * *`, { name: 'teacher-scheduler', timeZone: DEFAULT_TIMEZONE })
  async handleIntervalFlow(topic: string): Promise<void> {
    try {
      // const rawArticles = await this.googleSearchService.getGoogleSearchResults(topic);
      // if (!rawArticles?.length) {
      //   return;
      // }

      // const articlesContents: GoogleArticle[] = await Promise.all(
      //   rawArticles.map(async (article: GoogleArticle) => {
      //     const htmlContent = await this.scrapingService.getArticleContent(article.link);
      //     const content = this.scrapingService.getTextFromHtml(htmlContent);
      //     return { ...article, content };
      //   }),
      // );

      // const articles = articlesContents.filter((article: GoogleArticle) => !!article?.content?.length);
      // if (!articles.length) {
      //   return;
      // }

      // const filePath = await this.writeContentsToFile(articles);

      // const openAIFileID = await this.openaiAssistantService.uploadFile(filePath);

      // const summary = await this.getSummary(openAIFileID, topic);

      // await Promise.all(this.chatIds.map((chatId) => this.telegramGeneralService.sendMessage(this.bot, chatId, summary)));

      // await Promise.all([this.openaiAssistantService.deleteFile(openAIFileID), this.utilsService.deleteFile(filePath)]);
    } catch (err) {
      this.logger.error(this.handleIntervalFlow.name, `error in handleIntervalFlow: ${this.utilsService.getErrorMessage(err)}`);
      return;
    }
  }

  // async getSummary(openAIFileID: string, topic: string): Promise<string> {
  //   const threadId = await this.openaiAssistantService.createThread();
  //   await this.openaiAssistantService.addMessageToThread(threadId, `please help me learn ${topic} with the given data in the file`, 'user', openAIFileID);
  //   const threadRun = await this.openaiAssistantService.runThread(TEACHER_ASSISTANT_ID, threadId);
  //   return this.openaiAssistantService.getThreadResponse(threadRun.thread_id);
  // }
}
