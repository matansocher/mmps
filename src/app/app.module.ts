import { Module } from '@nestjs/common';
import { ConditionalModule, ConfigModule } from '@nestjs/config';
import { isProd } from '@core/config';
import { AnnouncerModule } from '@features/announcer';
import { CoachModule } from '@features/coach';
import { CookerModule } from '@features/cooker';
import { DefineModule } from '@features/define';
import { EducatorModule } from '@features/educator';
import { PlaygroundsModule } from '@features/playgrounds';
import { QuizzyModule } from '@features/quizzy';
import { TeacherModule } from '@features/teacher';
import { TrainerModule } from '@features/trainer';
import { WoltModule } from '@features/wolt';
import { WorldlyModule } from '@features/worldly';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    AnnouncerModule,
    CoachModule,
    CookerModule,
    DefineModule,
    EducatorModule,
    QuizzyModule,
    TeacherModule,
    TrainerModule,
    WoltModule,
    WorldlyModule,
    // ConditionalModule.registerWhen(PlaygroundsModule, () => !isProd),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
