import type { OnModuleInit } from '@nestjs/common';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WoltBotService implements OnModuleInit {
  onModuleInit() {
    this.bot = new TelegramBot(process.env.WOLT_TELEGRAM_BOT_TOKEN, { polling: true });
  }
}
