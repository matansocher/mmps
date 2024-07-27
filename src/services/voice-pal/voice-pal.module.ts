import { LoggerModule } from '@core/logger/logger.module';
import { VoicePalMongoModule } from '@core/mongo/voice-pal-mongo/voice-pal-mongo.module';
import { Module } from '@nestjs/common';
import { GoogleTranslateModule } from '@services/google-translate/google-translate.module';
import { ImgurModule } from '@services/imgur/imgur.module';
import { OpenaiModule } from '@services/openai/openai.module';
import { SocialMediaDownloaderModule } from '@services/social-media-downloader/social-media-downloader.module';
import { UtilsModule } from '@services/utils/utils.module';
import { UserSelectedActionsService } from '@services/voice-pal/user-selected-actions.service';
import { YoutubeTranscriptModule } from '@services/youtube-transcript/youtube-transcript.module';
import { VoicePalService } from './voice-pal.service';

@Module({
  imports: [
    LoggerModule,
    UtilsModule,
    GoogleTranslateModule,
    ImgurModule,
    OpenaiModule,
    SocialMediaDownloaderModule,
    VoicePalMongoModule,
    YoutubeTranscriptModule,
  ],
  providers: [VoicePalService, UserSelectedActionsService],
  exports: [VoicePalService, UserSelectedActionsService],
})
export class VoicePalModule {}
