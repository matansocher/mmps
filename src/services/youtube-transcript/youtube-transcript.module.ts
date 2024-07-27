import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger/logger.module';
import { UtilsModule } from '@services/utils/utils.module';
import { YoutubeTranscriptService } from './youtube-transcript.service';

@Module({
  imports: [LoggerModule, UtilsModule],
  providers: [YoutubeTranscriptService],
  exports: [YoutubeTranscriptService],
})
export class YoutubeTranscriptModule {}
