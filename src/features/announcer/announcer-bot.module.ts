import { Module } from '@nestjs/common';
import { CoachBotModule } from '@features/coach-bot';
import { EducatorBotModule } from '@features/educator-bot';
import { TeacherBotModule } from '@features/teacher-bot';
import { TrainerBotModule } from '@features/trainer-bot';
import { VoicePalBotModule } from '@features/voice-pal-bot';
import { WoltBotModule } from '@features/wolt-bot';
import { BOTS, TelegramBotsFactoryProvider } from '@services/telegram';
import { AnnouncerBotService } from './announcer-bot.service';

@Module({
  imports: [WoltBotModule, CoachBotModule, EducatorBotModule, TeacherBotModule, TrainerBotModule, VoicePalBotModule],
  providers: [AnnouncerBotService, TelegramBotsFactoryProvider(BOTS.ANNOUNCER)],
})
export class AnnouncerBotModule {}
