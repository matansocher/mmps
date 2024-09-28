import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger/logger.module';
import { VoicePalMongoModule } from '@core/mongo/voice-pal-mongo/voice-pal-mongo.module';
import { NotifierBotModule } from '@core/notifier-bot/notifier-bot.module';
import { UtilsModule } from '@core/utils/utils.module';
import { AiModule } from '@services/ai';
import { GoogleTranslateModule } from '@services/google-translate';
import { ImgurModule } from '@services/imgur';
import { SocialMediaDownloaderModule } from '@services/social-media-downloader/social-media-downloader.module';
import { UserSelectedActionsService } from '@services/voice-pal/user-selected-actions.service';
import { VoicePalUtilsService } from '@services/voice-pal/voice-pal-utils.service';
import { YoutubeTranscriptModule } from '@services/youtube-transcript/youtube-transcript.module';
import { VoicePalService } from './voice-pal.service';

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
    YoutubeTranscriptModule,
  ],
  providers: [VoicePalService, VoicePalUtilsService, UserSelectedActionsService],
  exports: [VoicePalService, UserSelectedActionsService],
})
export class VoicePalModule {}
