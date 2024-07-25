import { BOTS } from '@core/config/telegram.config';
import { LoggerService } from '@core/logger/logger.service';
import type { OnModuleInit } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { TelegramBotsFactoryService } from '@services/telegram/telegram-bots-factory.service';

@Injectable()
export class WoltBotService implements OnModuleInit {
  private bot: any;

  constructor(
    private readonly telegramBotsFactoryService: TelegramBotsFactoryService,
    private readonly logger: LoggerService,
  ) {}

  onModuleInit() {
    this.telegramBotsFactoryService.createBot(BOTS.WOLT.name);
    this.bot = this.telegramBotsFactoryService.getBot(BOTS.WOLT.name);
    this.logger.info('onModuleInit', 'WoltBotService has been initialized.');
  }
}
