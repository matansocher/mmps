import TelegramBot from 'node-telegram-bot-api';
import { Injectable } from '@nestjs/common';
import { BOTS } from '@core/config/telegram.config';

@Injectable()
export class TelegramBotsFactoryService {
  telegramBots: any = {};

  async getBot(name: string) {
    const existingBot = this.getExistingBot(name);
    if (!existingBot) {
      const newBot = await this.createBotAndSave(name);
      return newBot;
    }
    return existingBot;
  }

  getExistingBot(name: string) {
    return this.telegramBots[name];
  }

  getBotToken(name: string) {
    const botKey = Object.keys(BOTS).find((botKey: string) => BOTS[botKey].name === name);
    if (!botKey) {
      throw new Error(`Bot with name ${name} not found`);
    }
    return BOTS[botKey].token;
  }

  createBotAndSave(name: string) {
    const token = this.getBotToken(name);
    const newBot = new TelegramBot(token, { polling: true });
    this.telegramBots[name] = newBot;
    return newBot;
  }
}
