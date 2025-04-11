import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { isProd } from '@core/config';
import { AnnouncerModule } from '@features/announcer';
import { CoachModule } from '@features/coach';
import { DefineModule } from '@features/define';
import { EducatorModule } from '@features/educator';
import { PlaygroundsModule } from '@features/playgrounds';
import { TeacherModule } from '@features/teacher';
import { TrainerModule } from '@features/trainer';
import { VoicePalModule } from '@features/voice-pal';
import { WoltModule } from '@features/wolt';
import { WorldlyModule } from '@features/worldly';
import { AppController } from './app.controller';
import { AppService } from './app.service';

function getImports() {
  const commonModules = [ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' })];
  const features = [AnnouncerModule, CoachModule, DefineModule, EducatorModule, TeacherModule, TrainerModule, VoicePalModule, WoltModule, WorldlyModule];

  if (isProd) {
    return [...commonModules, ...features];
  }

  return [...commonModules, ...features, PlaygroundsModule];
}

@Module({
  imports: getImports(),
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
