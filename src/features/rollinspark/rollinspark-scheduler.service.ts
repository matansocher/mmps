import { AVIV_USER_ID, MY_USER_ID } from '@core/notifier-bot/notifier-bot.config';
import axios from 'axios';
import { isEqual as _isEqual } from 'lodash';
import { DEFAULT_TIMEZONE } from '@core/config/main.config';
import { LoggerService } from '@core/logger';
import { UtilsService } from '@core/utils';
import { Inject, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BOTS, TelegramGeneralService } from '@services/telegram';
import TelegramBot from 'node-telegram-bot-api';

@Injectable()
export class RollinsparkSchedulerService {
  latestResult = [];
  currentCount = 0;

  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly telegramGeneralService: TelegramGeneralService,
    @Inject(BOTS.ROLLINSPARK.name) private readonly bot: TelegramBot,
  ) {}

  @Cron('*/5 * * * *', { name: 'rollinspark-scheduler', timeZone: DEFAULT_TIMEZONE })
  async handleIntervalFlow() {
    try {
      const chatIds = [AVIV_USER_ID, MY_USER_ID];
      const aptsDetails = await this.getAptsDetails();
      if (!aptsDetails) {
        this.logger.error(this.handleIntervalFlow.name, 'error - could not get daily summary or photo');
        return;
      }
      const isResSimilarToLatest = await this.isResSimilarToLatest(aptsDetails);
      if (!isResSimilarToLatest) {
        await this.alertSubscriptions(chatIds);
      }
      this.latestResult = aptsDetails;
      this.currentCount++;
    } catch (err) {
      this.bot.sendMessage(MY_USER_ID, `error - ${this.utilsService.getErrorMessage(err)}`);
      this.logger.error(this.handleIntervalFlow.name, `error - ${this.utilsService.getErrorMessage(err)}`);
    }
  }

  async alertSubscriptions(chatIds: number[]): Promise<any> {
    try {
      for (const chatId of chatIds) {
        await this.telegramGeneralService.sendMessage(this.bot, chatId, `I found a change in the rollins park apartment availability`);
      }
    } catch (err) {
      this.logger.error(this.alertSubscriptions.name, `error - ${this.utilsService.getErrorMessage(err)}`);
    }
  }

  async getAptsDetails() {
    try {
      const url = 'https://www.rollinspark.net/wp-admin/admin-ajax.php';
      const body = {
        action: 'pcyfp_fetch_apt_availability',
        _ajax_nonce: '611d11be01',
        planid: 2405134,
      };
      const result = await axios.post(url, body, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      return result.data;
    } catch (err) {
      throw err;
    }
  }

  async isResSimilarToLatest(newResult): Promise<boolean> {
    if (!this.latestResult) {
      return false;
    }
    const existingKeys = this.latestResult.map((res) => res.ApartmentId).sort();
    const newKeys = newResult.map((res) => res.ApartmentId).sort();

    if (this.currentCount === 12) {
      const messageText = `Just letting you know that I am on it, lets result: ${newKeys}`;
      await Promise.all([this.bot.sendMessage(MY_USER_ID, messageText), this.bot.sendMessage(AVIV_USER_ID, messageText)]);
      this.currentCount = 0;
    }

    return _isEqual(existingKeys, newKeys);
  }
}
