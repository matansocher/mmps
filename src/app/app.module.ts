import { Module } from '@nestjs/common';
import { PinBuddyBotModule } from '@features/pin-buddy-bot/pin-buddy-bot.module';
import { VoicePalBotModule } from '@features/voice-pal-bot/voice-pal-bot.module';
import { WoltBotModule } from '@features/wolt-bot/wolt-bot.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [WoltBotModule, VoicePalBotModule, PinBuddyBotModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
