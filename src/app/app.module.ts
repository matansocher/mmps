import { Module } from '@nestjs/common';
import { DeadTerroristsModule } from '@features/dead-terrorists/dead-terrorists.module';
import { NotifierBotModule } from '@core/notifier-bot/notifier-bot.module';
import { VoicePalBotModule } from '@features/voice-pal-bot/voice-pal-bot.module';
import { WoltBotModule } from '@features/wolt-bot/wolt-bot.module';
import { StockBuddyBotModule } from '@features/stock-buddy-bot/stock-buddy-bot.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [WoltBotModule, VoicePalBotModule, StockBuddyBotModule, NotifierBotModule, DeadTerroristsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
