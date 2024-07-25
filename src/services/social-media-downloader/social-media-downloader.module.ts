import { Module } from '@nestjs/common';
import { SocialMediaDownloaderService } from './social-media-downloader.service';

@Module({
  providers: [SocialMediaDownloaderService]
})
export class SocialMediaDownloaderModule {}
