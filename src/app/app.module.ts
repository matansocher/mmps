import { LoggerModule } from '@core/logger/logger.module';
import { Module } from '@nestjs/common';
import { WoltBotModule } from '@features/wolt-bot/wolt-bot.module';
import { UtilsModule } from '@services/utils/utils.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [WoltBotModule, UtilsModule, LoggerModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
