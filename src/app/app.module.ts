import * as process from 'node:process';
import { Module } from '@nestjs/common';
import { ConditionalModule, ConfigModule } from '@nestjs/config';
import { isProd } from '@core/config';
import { BOT_CONFIG as coachBotConfig, CoachModule } from '@features/coach';
import { BOT_CONFIG as cookerBotConfig, CookerModule } from '@features/cooker';
import { DefineModule } from '@features/define';
import { BOT_CONFIG as educatorBotConfig, EducatorModule } from '@features/educator';
import { BOT_CONFIG as quizzyBotConfig, QuizzyModule } from '@features/quizzy';
import { BOT_CONFIG as teacherBotConfig, TeacherModule } from '@features/teacher';
import { BOT_CONFIG as trainerBotConfig, TrainerModule } from '@features/trainer';
import { BOT_CONFIG as woltBotConfig, WoltModule } from '@features/wolt';
import { BOT_CONFIG as worldlyBotConfig, WorldlyModule } from '@features/worldly';
import { AppController } from './app.controller';
import { AppService } from './app.service';

const registerBotModule = (module: any, config: { id: string }) => {
  return ConditionalModule.registerWhen(module, () => isProd || process.env['LOCAL_ACTIVE_BOT_ID'] === config.id);
};

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    DefineModule,
    registerBotModule(CoachModule, coachBotConfig),
    registerBotModule(CookerModule, cookerBotConfig),
    registerBotModule(EducatorModule, educatorBotConfig),
    registerBotModule(QuizzyModule, quizzyBotConfig),
    registerBotModule(TeacherModule, teacherBotConfig),
    registerBotModule(TrainerModule, trainerBotConfig),
    registerBotModule(WoltModule, woltBotConfig),
    registerBotModule(WorldlyModule, worldlyBotConfig),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
