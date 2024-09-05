import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from '@core/logger/logger.module';
import { TabitMongoModule } from '@core/mongo/tabit-mongo/tabit-mongo.module';
import { NotifierBotModule } from '@core/notifier-bot/notifier-bot.module';
import { UtilsModule } from '@core/utils/utils.module';
import { TabitFlowModule } from '@services/tabit/tabit-flow/tabit-flow.module';
import { BOTS } from '@services/telegram/telegram.config';
import { TelegramModule } from '@services/telegram/telegram.module';
import { TelegramBotsFactoryModule } from '@services/telegram/telegram-bots-factory/telegram-bots-factory.module';
import { TabitBotService } from './tabit-bot.service';

@Module({
  imports: [
    LoggerModule.forChild(TabitBotModule.name),
    NotifierBotModule,
    ScheduleModule.forRoot(),
    TabitFlowModule,
    TelegramBotsFactoryModule.forChild(BOTS.TABIT),
    TelegramModule,
    UtilsModule,
    TabitMongoModule,
  ],
  providers: [TabitBotService],
})
export class TabitBotModule {}
