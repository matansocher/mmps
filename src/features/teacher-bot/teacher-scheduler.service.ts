import TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { LoggerService } from '@core/logger';
import { MY_USER_ID } from '@core/notifier-bot/notifier-bot.config';
import { UtilsService } from '@core/utils';
import { type GoogleArticle, GoogleSearchService } from '@services/google-search';
import { OpenaiAssistantService } from '@services/openai';
import { ScrapingService } from '@services/scraping/scraping.service';
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
    private readonly scrapingService: ScrapingService,
    private readonly telegramGeneralService: TelegramGeneralService,
    @Inject(BOTS.TEACHER.name) private readonly bot: TelegramBot,
  ) {}

  @Cron(`0 ${HOURS_OF_DAY.join(',')} * * *`, { name: 'teacher-scheduler', timeZone: DEFAULT_TIMEZONE })
  async handleIntervalFlow(topic: string): Promise<void> {
    try {
      const rawArticles = await this.googleSearchService.getGoogleSearchResults(topic);
      if (!rawArticles?.length) {
        return;
      }

      const articlesContents: GoogleArticle[] = await Promise.all(
        rawArticles.map(async (article: GoogleArticle) => {
          const content = await this.scrapingService.getArticleContent(article.link);
          // const content = await this.scrapingService.getArticleContent('https://angular.dev/guide/signals');
          return { ...article, content };
        }),
      );

      const articles = articlesContents.filter((article: GoogleArticle) => !!article?.content?.length);
      if (!articles.length) {
        return;
      }

      const fileName = await this.writeContentsToFile(articles);

      const openAIFileID = await this.openaiAssistantService.uploadFile(fileName);

      const summary = await this.getSummary(openAIFileID, topic);

      await Promise.all(this.chatIds.map((chatId) => this.telegramGeneralService.sendMessage(this.bot, chatId, summary)));

      await Promise.all([this.openaiAssistantService.deleteFile(openAIFileID), this.utilsService.deleteFile(fileName)]);
    } catch (err) {
      this.logger.error(this.handleIntervalFlow.name, `error in handleIntervalFlow: ${this.utilsService.getErrorMessage(err)}`);
      return;
    }
  }

  async writeContentsToFile(articlesContents: GoogleArticle[]): Promise<string> {
    const filePath = `${LOCAL_FILES_PATH}/teacher-articles-${Date.now()}.txt`;
    const fileContent = articlesContents.map(({ title, link, content }, i) => `#${i + 1}\n${title}\n${link}\n${content}\n`).join('\n\n');
    await this.utilsService.writeFile(filePath, fileContent);
    return filePath;
  }

  async getSummary(openAIFileID: string, topic: string): Promise<string> {
    const threadId = await this.openaiAssistantService.createThread();
    await this.openaiAssistantService.addMessageToThread(threadId, `please help me learn ${topic} with the given data in the file`, 'user', openAIFileID);
    const threadRun = await this.openaiAssistantService.runThread(TEACHER_ASSISTANT_ID, threadId);
    return this.openaiAssistantService.getThreadResponse(threadRun.thread_id);
  }
}
