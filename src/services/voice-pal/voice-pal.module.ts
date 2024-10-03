import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger';
import { VoicePalMongoModule } from '@core/mongo/voice-pal-mongo';
import { NotifierBotModule } from '@core/notifier-bot/notifier-bot.module';
import { UtilsModule } from '@core/utils';
import { AiModule } from '@services/ai';
import { GoogleTranslateModule } from '@services/google-translate';
import { ImgurModule } from '@services/imgur';
import { SocialMediaDownloaderModule } from '@services/social-media-downloader';
import { UserSelectedActionsService } from './user-selected-actions.service';
import { VoicePalService } from './voice-pal.service';
import { VoicePalUtilsService } from './voice-pal-utils.service';

@Module({
  imports: [
    AiModule,
    GoogleTranslateModule,
    ImgurModule,
    LoggerModule.forChild(VoicePalModule.name),
    NotifierBotModule,
    SocialMediaDownloaderModule,
    UtilsModule,
    VoicePalMongoModule,
  ],
  providers: [VoicePalService, VoicePalUtilsService, UserSelectedActionsService],
  exports: [VoicePalService, UserSelectedActionsService],
})
export class VoicePalModule {}
