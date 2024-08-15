import { LoggerModule } from '@core/logger/logger.module';
import { VoicePalMongoModule } from '@core/mongo/voice-pal-mongo/voice-pal-mongo.module';
import { Module } from '@nestjs/common';
import { GoogleTranslateModule } from '@services/google-translate/google-translate.module';
import { ImgurModule } from '@services/imgur/imgur.module';
import { SocialMediaDownloaderModule } from '@services/social-media-downloader/social-media-downloader.module';
import { UtilsModule } from '@services/utils/utils.module';
import { UserSelectedActionsService } from '@services/voice-pal/user-selected-actions.service';
import { VoicePalUtilsService } from '@services/voice-pal/voice-pal-utils.service';
import { YoutubeTranscriptModule } from '@services/youtube-transcript/youtube-transcript.module';
import { AiModule } from '@services/ai/ai.module';
import { VoicePalService } from './voice-pal.service';

@Module({
  imports: [
    AiModule,
    GoogleTranslateModule,
    ImgurModule,
    LoggerModule.forRoot(VoicePalModule.name),
    SocialMediaDownloaderModule,
    UtilsModule,
    VoicePalMongoModule,
    YoutubeTranscriptModule,
  ],
  providers: [VoicePalService, VoicePalUtilsService, UserSelectedActionsService],
  exports: [VoicePalService, UserSelectedActionsService],
})
export class VoicePalModule {}
