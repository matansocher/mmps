import { ISocialMediaClient } from '@services/social-media-downloader/interface';
import { ndown, tikdown, alldown, ytdown } from 'nayan-media-downloader';
import { FactoryProvider, Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger';
import { UtilsModule } from '@core/utils';
import { SOCIAL_MEDIA_CLIENT_TOKEN } from './social-media-downloader.config';
import { SocialMediaDownloaderService } from './social-media-downloader.service';

export const SocialMediaClientProvider: FactoryProvider = {
  provide: SOCIAL_MEDIA_CLIENT_TOKEN,
  useFactory: () =>
    ({
      youtube: ytdown, // $$$$$$$$$$$$$$
      meta: ndown,
      tiktok: tikdown,
      generalSocialMedia: alldown,
    }) as ISocialMediaClient,
};

@Module({
  imports: [LoggerModule.forChild(SocialMediaDownloaderModule.name), UtilsModule],
  providers: [SocialMediaDownloaderService, SocialMediaClientProvider],
  exports: [SocialMediaDownloaderService],
})
export class SocialMediaDownloaderModule {}
