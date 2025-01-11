import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger';
import { SocialMediaDownloaderService } from './social-media-downloader.service';

@Module({
  imports: [LoggerModule.forChild(SocialMediaDownloaderModule.name)],
  providers: [SocialMediaDownloaderService],
  exports: [SocialMediaDownloaderService],
})
export class SocialMediaDownloaderModule {}
