import TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { LoggerService } from '@core/logger';
import { MY_USER_ID } from '@core/notifier-bot/notifier-bot.config';
import { UtilsService } from '@core/utils';
import { FUN_FACT_PHOTO_PROMPT, FUN_FACT_PROMPT, HOURS_OF_DAY } from '@features/fun-facts-bot/fun-facts-bot.config';
import { OpenaiService } from '@services/openai';
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

  @Cron(`0 ${HOURS_OF_DAY.join(',')} * * *`, { name: 'fun-facts-scheduler', timeZone: DEFAULT_TIMEZONE })
  async handleIntervalFlow(): Promise<void> {
    try {
      const result = await this.openaiService.getChatCompletion(FUN_FACT_PROMPT);
      if (!result) {
        this.logger.error(this.handleIntervalFlow.name, 'error - could not get chat completion');
        return;
      }
      const resultPhoto = await this.getPhoto(result);
      await Promise.all(this.chatIds.map((chatId) => this.telegramGeneralService.sendMessage(this.bot, chatId, result)));
      if (resultPhoto) {
        await Promise.all(this.chatIds.map((chatId) => this.telegramGeneralService.sendPhoto(this.bot, chatId, resultPhoto))).catch((err) => {
          this.logger.error(this.handleIntervalFlow.name, `error sending image - ${this.utilsService.getErrorMessage(err)}`);
        });
      }
    } catch (err) {
      const errorMessage = `error - ${this.utilsService.getErrorMessage(err)}`;
      this.logger.error(this.handleIntervalFlow.name, errorMessage);
      this.telegramGeneralService.sendMessage(this.bot, MY_USER_ID, errorMessage);
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
