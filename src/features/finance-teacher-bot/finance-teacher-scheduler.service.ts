import { ExpectedGoogleArticle, GoogleArticle } from '@features/finance-teacher-bot/interface';
import axios from 'axios';
import * as cheerio from 'cheerio';
import TelegramBot from 'node-telegram-bot-api';
import { env } from 'node:process';
import { Inject, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { LoggerService } from '@core/logger';
import { MY_USER_ID } from '@core/notifier-bot/notifier-bot.config';
import { UtilsService } from '@core/utils';
import { OpenaiAssistantService, OpenaiService } from '@services/openai';
import { BOTS, TelegramGeneralService } from '@services/telegram';
import {
  OPENAI_ASSISTANT_ID,
  LOCAL_FILES_PATH,
  HOURS_OF_DAY,
  THREAD_MESSAGE_INSTRUCTIONS
} from './finance-teacher-bot.config';

@Injectable()
export class FinanceTeacherSchedulerService {
  readonly chatIds = [MY_USER_ID]; // $$$$$$$$$$$$$$$$$$$ add tootie

  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly openaiService: OpenaiService,
    private readonly openaiAssistantService: OpenaiAssistantService,
    private readonly telegramGeneralService: TelegramGeneralService,
    @Inject(BOTS.FINANCE_TEACHER.name) private readonly bot: TelegramBot,
  ) {}

  @Cron(`0 ${HOURS_OF_DAY.join(',')} * * *`, { name: 'finance-teacher-scheduler', timeZone: DEFAULT_TIMEZONE })
  async handleIntervalFlow(topic: string): Promise<void> {
    const rawArticles = await this.searchContent(topic);

    const articlesContents: GoogleArticle[] = await Promise.all(
      rawArticles.map(async (article: GoogleArticle) => {
        const content = await this.getArticleContent(article.link);
        return { ...article, content };
      }),
    );

    const articles = articlesContents.filter((article) => !!article?.content?.length);
    if (!articles?.length) {
      return;
    }

    const fileName = await this.writeContentsToFile(articles);

    const openAIFileID = await this.openaiAssistantService.uploadFile(fileName);

    const summary = await this.getSummary(openAIFileID);

    await Promise.all(this.chatIds.map((chatId) => this.telegramGeneralService.sendMessage(this.bot, chatId, summary)));

    await Promise.all([this.openaiAssistantService.deleteFile(openAIFileID), this.utilsService.deleteFile(fileName)]);
  }

  async searchContent(query: string): Promise<GoogleArticle[] | undefined> {
    try {
      const url = `https://www.googleapis.com/customsearch/v1?key=${env.GOOGLE_CUSTOM_SEARCH_API_KEY}&cx=${env.GOOGLE_CUSTOM_SEARCH_ENGINE_KEY}&q=${encodeURIComponent(query)}&lr=lang_he`;
      const response = await axios.get(url);
      return response?.data?.items?.map((item: ExpectedGoogleArticle) => ({ title: item.title, link: item.link, snippet: item.snippet }));
    } catch (error) {
      console.error('err:', error.message);
      return undefined;
    }
  }

  async getArticleContent(url: string): Promise<string | undefined> {
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      return $('h1, h2, h3, h4, h5, h6, p').map((i, el) => $(el).text()).get().join('\n');
    } catch (error) {
      console.error('error: ', error.message);
      return undefined;
    }
  }

  async writeContentsToFile(articlesContents: GoogleArticle[]): Promise<string> {
    const filePath = `${LOCAL_FILES_PATH}/finance-articles-${Date.now()}.txt`;
    const fileContent = articlesContents.map(({ title, link, content }, i) => `#${i + 1}\n${title}\n${link}\n${content}\n`).join('\n\n');
    await this.utilsService.writeFile(filePath, fileContent);
    return filePath;
  }

  async getSummary(openAIFileID: string): Promise<string> {
    const threadId = await this.openaiAssistantService.createThread();
    await this.openaiAssistantService.addMessageToThread(threadId, THREAD_MESSAGE_INSTRUCTIONS, 'user', openAIFileID);
    const threadRun = await this.openaiAssistantService.runThread(OPENAI_ASSISTANT_ID, threadId);
    return this.openaiAssistantService.getThreadResponse(threadRun.thread_id);
  }
}
