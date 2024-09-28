import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger';
import { UtilsModule } from '@core/utils';
import { SocialMediaDownloaderService } from './social-media-downloader.service';

@Module({
  imports: [LoggerModule.forChild(SocialMediaDownloaderModule.name), UtilsModule],
  providers: [SocialMediaDownloaderService],
  exports: [SocialMediaDownloaderService],
})
export class SocialMediaDownloaderModule {}
