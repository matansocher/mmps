import TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { LoggerService } from '@core/logger';
import { MY_USER_ID } from '@core/notifier-bot/notifier-bot.config';
import { UtilsService } from '@core/utils';
import { OpenaiAssistantService, OpenaiService } from '@services/openai';
import { BOTS, TelegramGeneralService } from '@services/telegram';
import {
  FUN_FACTS_ASSISTANT_ID,
  FUN_FACTS_ASSISTANT_THREAD_ID,
  FUN_FACT_PHOTO_PROMPT,
  HOURS_OF_DAY,
  TODAY_FACTS_HOUR_OF_DAY, TODAY_FACT_PROMPT
} from './fun-facts-bot.config';

@Injectable()
export class FunFactsSchedulerService {
  readonly chatIds = [MY_USER_ID];

  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly openaiService: OpenaiService,
    private readonly openaiAssistantService: OpenaiAssistantService,
    private readonly telegramGeneralService: TelegramGeneralService,
    @Inject(BOTS.FUN_FACTS.name) private readonly bot: TelegramBot,
  ) {}

  @Cron(`0 ${TODAY_FACTS_HOUR_OF_DAY} * * *`, { name: 'today-facts-scheduler', timeZone: DEFAULT_TIMEZONE })
  async handleTodayFactIntervalFlow(): Promise<void> {
    try {
      const todayFact = await this.getTodayFact();
      if (!todayFact) {
        this.logger.error(this.handleTodayFactIntervalFlow.name, 'error - could not get chat completion');
        return;
      }
      await Promise.all(this.chatIds.map((chatId) => this.telegramGeneralService.sendMessage(this.bot, chatId, todayFact)));
    } catch (err) {
      const errorMessage = `error - ${this.utilsService.getErrorMessage(err)}`;
      this.logger.error(this.handleTodayFactIntervalFlow.name, errorMessage);
      this.telegramGeneralService.sendMessage(this.bot, MY_USER_ID, errorMessage);
    }
  }

  @Cron(`0 ${HOURS_OF_DAY.join(',')} * * *`, { name: 'fun-facts-scheduler', timeZone: DEFAULT_TIMEZONE })
  async handleFunFactIntervalFlow(): Promise<void> {
    try {
      const funFact = await this.getFunFact();
      if (!funFact) {
        this.logger.error(this.handleFunFactIntervalFlow.name, 'error - could not get chat completion');
        return;
      }
      const funFactPhoto = await this.getPhoto(funFact);
      await Promise.all(this.chatIds.map((chatId) => this.telegramGeneralService.sendMessage(this.bot, chatId, funFact)));
      if (funFactPhoto) {
        await Promise.all(this.chatIds.map((chatId) => this.telegramGeneralService.sendPhoto(this.bot, chatId, funFactPhoto))).catch((err) => {
          this.logger.error(this.handleFunFactIntervalFlow.name, `error sending image - ${this.utilsService.getErrorMessage(err)}`);
        });
      }
    } catch (err) {
      const errorMessage = `error - ${this.utilsService.getErrorMessage(err)}`;
      this.logger.error(this.handleFunFactIntervalFlow.name, errorMessage);
      this.telegramGeneralService.sendMessage(this.bot, MY_USER_ID, errorMessage);
    }
  }

  async getTodayFact(): Promise<string> {
    try {
      return this.openaiService.getChatCompletion(TODAY_FACT_PROMPT.replace('{date}', this.utilsService.getDateString()));
    } catch (err) {
      this.logger.error(this.getTodayFact.name, `err: ${this.utilsService.getErrorMessage(err)}`);
      return null;
    }
  }

  async getFunFact(): Promise<string> {
    try {
      await this.openaiAssistantService.addMessageToThread(FUN_FACTS_ASSISTANT_THREAD_ID, 'Please generate another', 'user');
      const threadRun = await this.openaiAssistantService.runThread(FUN_FACTS_ASSISTANT_ID, FUN_FACTS_ASSISTANT_THREAD_ID);
      return this.openaiAssistantService.getThreadResponse(threadRun.thread_id);
    } catch (err) {
      this.logger.error(this.getFunFact.name, `err: ${this.utilsService.getErrorMessage(err)}`);
      return null;
    }
  }

  async getPhoto(content: string): Promise<string> {
    try {
      return this.openaiService.createImage(`${FUN_FACT_PHOTO_PROMPT}\n\n${content}`);
    } catch (err) {
      this.logger.error(this.getPhoto.name, `err: ${this.utilsService.getErrorMessage(err)}`);
      return null;
    }
  }
}
