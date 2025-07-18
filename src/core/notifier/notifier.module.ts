import { Module } from '@nestjs/common';
import { QuizzyMongoModule } from '@core/mongo/quizzy-mongo';
import { WoltMongoModule } from '@core/mongo/wolt-mongo';
import { WorldlyMongoModule } from '@core/mongo/worldly-mongo';
import { TelegramBotsFactoryProvider } from '@services/telegram';
import { BOT_CONFIG } from './notifier.config';
import { NotifierController } from './notifier.controller';
import { NotifierService } from './notifier.service';

@Module({
  imports: [QuizzyMongoModule, WoltMongoModule, WorldlyMongoModule],
  providers: [NotifierController, NotifierService, TelegramBotsFactoryProvider(BOT_CONFIG)],
  exports: [NotifierService],
})
export class NotifierModule {}
