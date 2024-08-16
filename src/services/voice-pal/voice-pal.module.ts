import { LoggerModule } from '@core/logger/logger.module';
import { VoicePalMongoModule } from '@core/mongo/voice-pal-mongo/voice-pal-mongo.module';
import { Module } from '@nestjs/common';
import { GoogleTranslateModule } from '@services/google-translate';
import { ImgurModule } from '@services/imgur';
import { SocialMediaDownloaderModule } from '@services/social-media-downloader';
import { UtilsModule } from '@services/utils';
import { UserSelectedActionsService } from '@services/voice-pal';
import { VoicePalUtilsService } from '@services/voice-pal';
import { YoutubeTranscriptModule } from '@services/youtube-transcript';
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
  providers: [
    VoicePalService,
    VoicePalUtilsService,
    UserSelectedActionsService,
  ],
  exports: [VoicePalService, UserSelectedActionsService],
})
export class VoicePalModule {}
