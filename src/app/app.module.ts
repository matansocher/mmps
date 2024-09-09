import { Module } from '@nestjs/common';
// import { DeadTerroristsModule } from '@features/dead-terrorists/dead-terrorists.module';
// import { StockBuddyBotModule } from '@features/stock-buddy-bot/stock-buddy-bot.module';
import { TabitBotModule } from '@features/tabit-bot/tabit-bot.module';
import { VoicePalBotModule } from '@features/voice-pal-bot/voice-pal-bot.module';
import { WoltBotModule } from '@features/wolt-bot/wolt-bot.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // WoltBotModule,
    // VoicePalBotModule,
    // StockBuddyBotModule,
    TabitBotModule,
    // DeadTerroristsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
