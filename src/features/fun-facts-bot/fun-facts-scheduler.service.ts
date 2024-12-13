import { DEFAULT_TIMEZONE } from '@core/config/main.config';
import { FUN_FACT_PHOTO_PROMPT, FUN_FACT_PROMPT } from '@features/fun-facts-bot/fun-facts-bot.config';
import { Cron } from '@nestjs/schedule';
import { OpenaiService } from '@services/openai';
import TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable } from '@nestjs/common';
import { LoggerService } from '@core/logger';
import { MY_USER_ID } from '@core/notifier-bot/notifier-bot.config';
import { UtilsService } from '@core/utils';
import { BOTS, TelegramGeneralService } from '@services/telegram';

@Injectable()
export class FunFactsSchedulerService {
  readonly chatIds = [MY_USER_ID];

  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly openaiService: OpenaiService,
    private readonly telegramGeneralService: TelegramGeneralService,
    @Inject(BOTS.FUN_FACTS.name) private readonly bot: TelegramBot,
  ) {}

  @Cron('0 13,20 * * *', { name: 'news-scheduler', timeZone: DEFAULT_TIMEZONE })
  async handleIntervalFlow(): Promise<void> {
    try {
      const result = await this.openaiService.getChatCompletion(FUN_FACT_PROMPT);
      if (!result) {
        this.logger.error(this.handleIntervalFlow.name, 'error - could not get chat completion');
        return;
      }
      const resultPhoto = await this.getDailyPhoto(result);
      await Promise.all(this.chatIds.map((chatId) => this.telegramGeneralService.sendMessage(this.bot, chatId, result)));
      if (resultPhoto) {
        await Promise.all(this.chatIds.map((chatId) => this.telegramGeneralService.sendPhoto(this.bot, chatId, resultPhoto))).catch((err) => {
          this.logger.error(this.handleIntervalFlow.name, `error sending image - ${this.utilsService.getErrorMessage(err)}`);
        });
      }
    } catch (err) {
      this.telegramGeneralService.sendMessage(this.bot, MY_USER_ID, `error - ${this.utilsService.getErrorMessage(err)}`);
      this.logger.error(this.handleIntervalFlow.name, `error - ${this.utilsService.getErrorMessage(err)}`);
    }
  }

  async getDailyPhoto(content: string): Promise<string> {
    try {
      return this.openaiService.createImage(`${FUN_FACT_PHOTO_PROMPT}\n\n${content}`);
    } catch (err) {
      this.logger.error(this.getDailyPhoto.name, `err: ${this.utilsService.getErrorMessage(err)}`);
      return null;
    }
  }
}
