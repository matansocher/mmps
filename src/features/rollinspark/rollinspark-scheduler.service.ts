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

const INTERVAL_MINUTES = 5;
const COUNT_TO_NOTIFY = (60 / INTERVAL_MINUTES) * 6; // represents - (hour) * notify every 6 hours

@Injectable()
export class RollinsparkSchedulerService {
  readonly chatIds = [AVIV_USER_ID, MY_USER_ID];
  latestResult = [];
  currentCount = 0;
  isFirstTime = true;

  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly telegramGeneralService: TelegramGeneralService,
    @Inject(BOTS.ROLLINSPARK.name) private readonly bot: TelegramBot,
  ) {}

  @Cron(`*/${INTERVAL_MINUTES} * * * *`, { name: 'rollinspark-scheduler', timeZone: DEFAULT_TIMEZONE })
  async handleIntervalFlow() {
    try {
      const aptsDetails = await this.getAptsDetails();
      if (!aptsDetails) {
        this.logger.error(this.handleIntervalFlow.name, 'error - could not get daily summary or photo');
        return;
      }
      const isResSimilarToLatest = await this.isResSimilarToLatest(aptsDetails);
      if (!this.isFirstTime && !isResSimilarToLatest) {
        await this.alertSubscriptions(this.chatIds);
      }
      this.latestResult = aptsDetails;
      this.currentCount++;
      this.isFirstTime = false;
    } catch (err) {
      this.telegramGeneralService.sendMessage(this.bot, MY_USER_ID, `error - ${this.utilsService.getErrorMessage(err)}`);
      this.logger.error(this.handleIntervalFlow.name, `error - ${this.utilsService.getErrorMessage(err)}`);
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
    if (!this.latestResult?.length) {
      return false;
    }
    const existingKeys = this.latestResult.map((res) => res.ApartmentId).sort();
    const newKeys = newResult.map((res) => res.ApartmentId).sort();

    if (this.currentCount === COUNT_TO_NOTIFY) {
      const messageText = [
        `אביב! תהיה רגוע אני נותן עדכון כשיש דירה חדשה ברולינס פארק`,
        `מה מצאתי כל הזמן הזה: ${newKeys}`,
      ].join('\n');
      await Promise.all(this.chatIds.map((chatId) => this.telegramGeneralService.sendMessage(this.bot, chatId, messageText)));
      this.currentCount = 0;
    }

    return _isEqual(existingKeys, newKeys);
  }

  async alertSubscriptions(chatIds: number[]): Promise<any> {
    try {
      const messageText = [
        `אביב! נראה לי יש דירה חדשה ברולינס פארק לך לבדוק`,
        `https://www.rollinspark.net/floor-plans`,
      ].join('\n');
      await Promise.all(chatIds.map((chatId) => this.telegramGeneralService.sendMessage(this.bot, chatId, messageText)));
    } catch (err) {
      this.logger.error(this.alertSubscriptions.name, `error - ${this.utilsService.getErrorMessage(err)}`);
    }
  }
}
