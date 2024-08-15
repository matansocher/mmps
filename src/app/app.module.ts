import { Module } from '@nestjs/common';
import { VoicePalBotModule } from '@features/voice-pal-bot/voice-pal-bot.module';
import { WoltBotModule } from '@features/wolt-bot/wolt-bot.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [WoltBotModule, VoicePalBotModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
