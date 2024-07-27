import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger/logger.module';
import { UtilsModule } from '@services/utils/utils.module';
import { SocialMediaDownloaderService } from './social-media-downloader.service';

@Module({
  imports: [LoggerModule, UtilsModule],
  providers: [SocialMediaDownloaderService],
  exports: [SocialMediaDownloaderService],
})
export class SocialMediaDownloaderModule {}
