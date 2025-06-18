import * as process from 'node:process';
import { Module } from '@nestjs/common';
import { ConditionalModule, ConfigModule } from '@nestjs/config';
import { isProd } from '@core/config';
import { BOT_CONFIG as coachBotConfig, CoachModule } from '@features/coach';
import { BOT_CONFIG as cookerBotConfig, CookerModule } from '@features/cooker';
import { DefineModule } from '@features/define';
import { BOT_CONFIG as educatorBotConfig, EducatorModule } from '@features/educator';
import { BOT_CONFIG as teacherBotConfig, TeacherModule } from '@features/teacher';
import { BOT_CONFIG as trainerBotConfig, TrainerModule } from '@features/trainer';
import { BOT_CONFIG as woltBotConfig, WoltModule } from '@features/wolt';
import { BOT_CONFIG as worldlyBotConfig, WorldlyModule } from '@features/worldly';
import { TelegramBotConfig } from '@services/telegram';
import { AppController } from './app.controller';
import { AppService } from './app.service';

const shouldRegisterBot = (botConfig: TelegramBotConfig): boolean => {
  if (isProd) {
    return true;
  }
  const localActiveBotId = process.env['LOCAL_ACTIVE_BOT_ID'];
  return localActiveBotId === botConfig.id;
};

@Module({
  imports: [
    // br
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    DefineModule,
    ConditionalModule.registerWhen(CoachModule, () => shouldRegisterBot(coachBotConfig)),
    ConditionalModule.registerWhen(CookerModule, () => shouldRegisterBot(cookerBotConfig)),
    ConditionalModule.registerWhen(EducatorModule, () => shouldRegisterBot(educatorBotConfig)),
    ConditionalModule.registerWhen(TeacherModule, () => shouldRegisterBot(teacherBotConfig)),
    ConditionalModule.registerWhen(TrainerModule, () => shouldRegisterBot(trainerBotConfig)),
    ConditionalModule.registerWhen(WoltModule, () => shouldRegisterBot(woltBotConfig)),
    ConditionalModule.registerWhen(WorldlyModule, () => shouldRegisterBot(worldlyBotConfig)),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
