import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { isProd } from '@core/config';
import { CoachBotModule } from '@features/coach-bot';
import { DefineModule } from '@features/define';
import { EducatorBotModule } from '@features/educator-bot';
import { TeacherBotModule } from '@features/teacher-bot';
import { TrainerBotModule } from '@features/trainer-bot';
import { VoicePalBotModule } from '@features/voice-pal-bot';
import { WoltBotModule } from '@features/wolt-bot';
import { AppController } from './app.controller';
import { AppService } from './app.service';

function getImports() {
  const commonModules = [ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' })];

  if (isProd) {
    return [...commonModules, VoicePalBotModule, WoltBotModule, DefineModule, CoachBotModule, TeacherBotModule, TrainerBotModule];
  }

  return [...commonModules, EducatorBotModule];
}

@Module({
  imports: getImports(),
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
