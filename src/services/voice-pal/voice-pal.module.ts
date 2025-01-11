import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger';
import { VoicePalMongoModule } from '@core/mongo/voice-pal-mongo';
import { NotifierBotModule } from '@core/notifier-bot';
import { AiModule } from '@services/ai';
import { GoogleTranslateModule } from '@services/google-translate';
import { ImgurModule } from '@services/imgur';
import { SocialMediaDownloaderModule } from '@services/social-media-downloader';
import { YoutubeTranscriptModule } from '@services/youtube-transcript';
import { UserSelectedActionsService } from './user-selected-actions.service';
import { VoicePalService } from './voice-pal.service';

@Module({
  imports: [
    AiModule,
    GoogleTranslateModule,
    ImgurModule,
    LoggerModule.forChild(VoicePalModule.name),
    NotifierBotModule,
    SocialMediaDownloaderModule,
    VoicePalMongoModule,
    YoutubeTranscriptModule,
  ],
  providers: [VoicePalService, UserSelectedActionsService],
  exports: [VoicePalService, UserSelectedActionsService],
})
export class VoicePalModule {}
