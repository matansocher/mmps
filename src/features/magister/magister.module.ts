import { Module, OnModuleInit } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { createMongoConnection } from '@core/mongo';
import { TelegramBotsFactoryProvider } from '@services/telegram';
import { MagisterSchedulerService } from './magister-scheduler.service';
import { BOT_CONFIG } from './magister.config';
import { MagisterController } from './magister.controller';
import { MagisterService } from './magister.service';
import { DB_NAME } from './mongo';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [MagisterController, MagisterSchedulerService, MagisterService, TelegramBotsFactoryProvider(BOT_CONFIG)],
})
export class MagisterModule implements OnModuleInit {
  async onModuleInit() {
    await createMongoConnection(DB_NAME);
  }
}
