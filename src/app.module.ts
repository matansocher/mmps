import { env } from 'node:process';
import { Module } from '@nestjs/common';
import { ConditionalModule, ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { isProd } from '@core/config';
import { BOT_CONFIG as chatbotBotConfig, ChatbotModule } from '@features/chatbot';
import { BOT_CONFIG as coachBotConfig, CoachModule } from '@features/coach';
import { DefineModule } from '@features/define';
import { BOT_CONFIG as educatorBotConfig, EducatorModule } from '@features/educator';
import { BOT_CONFIG as langlyBotConfig, LanglyModule } from '@features/langly';
import { BOT_CONFIG as magisterBotConfig, MagisterModule } from '@features/magister';
import { BOT_CONFIG as twitterBotConfig, TwitterModule } from '@features/twitter';
import { BOT_CONFIG as woltBotConfig, WoltModule } from '@features/wolt';
import { BOT_CONFIG as worldlyBotConfig, WorldlyModule } from '@features/worldly';

const registerBotModule = (module: any, config: { id: string }) => {
  return ConditionalModule.registerWhen(module, () => isProd || env.LOCAL_ACTIVE_BOT_ID === config.id);
};

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ScheduleModule.forRoot(),
    DefineModule,
    registerBotModule(ChatbotModule, chatbotBotConfig),
    registerBotModule(CoachModule, coachBotConfig),
    registerBotModule(EducatorModule, educatorBotConfig),
    registerBotModule(LanglyModule, langlyBotConfig),
    registerBotModule(MagisterModule, magisterBotConfig),
    registerBotModule(TwitterModule, twitterBotConfig),
    registerBotModule(WoltModule, woltBotConfig),
    registerBotModule(WorldlyModule, worldlyBotConfig),
  ],
})
export class AppModule {}
