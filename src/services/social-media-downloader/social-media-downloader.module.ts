import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger/logger.module';
import { UtilsModule } from '@services/utils';
import { SocialMediaDownloaderService } from './social-media-downloader.service';

@Module({
  imports: [
    LoggerModule.forRoot(SocialMediaDownloaderModule.name),
    UtilsModule,
  ],
  providers: [SocialMediaDownloaderService],
  exports: [SocialMediaDownloaderService],
})
export class SocialMediaDownloaderModule {}
