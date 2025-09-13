import { env } from 'node:process';
import { Module } from '@nestjs/common';
import { ConditionalModule, ConfigModule } from '@nestjs/config';
import { isProd } from '@core/config';
import { BOT_CONFIG as chatbotBotConfig, ChatbotModule } from '@features/chatbot';
import { BOT_CONFIG as coachBotConfig, CoachModule } from '@features/coach';
import { DefineModule } from '@features/define';
import { BOT_CONFIG as educatorBotConfig, EducatorModule } from '@features/educator';
import { BOT_CONFIG as teacherBotConfig, TeacherModule } from '@features/teacher';
import { BOT_CONFIG as trackerBotConfig, TrackerModule } from '@features/tracker';
import { BOT_CONFIG as trainerBotConfig, TrainerModule } from '@features/trainer';
import { BOT_CONFIG as woltBotConfig, WoltModule } from '@features/wolt';
import { BOT_CONFIG as worldlyBotConfig, WorldlyModule } from '@features/worldly';
import { AppController } from './app.controller';
import { AppService } from './app.service';

const registerBotModule = (module: any, config: { id: string }) => {
  return ConditionalModule.registerWhen(module, () => isProd || env.LOCAL_ACTIVE_BOT_ID === config.id);
};

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    DefineModule,
    // registerBotModule(ChatbotModule, chatbotBotConfig),
    // registerBotModule(CoachModule, coachBotConfig),
    // registerBotModule(EducatorModule, educatorBotConfig),
    // registerBotModule(TeacherModule, teacherBotConfig),
    // registerBotModule(TrackerModule, trackerBotConfig),
    // registerBotModule(TrainerModule, trainerBotConfig),
    registerBotModule(WoltModule, woltBotConfig),
    // registerBotModule(WorldlyModule, worldlyBotConfig),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export default class AppModule {}
