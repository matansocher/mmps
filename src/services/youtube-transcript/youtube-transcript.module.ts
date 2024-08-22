import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger/logger.module';
import { UtilsModule } from '@core/utils/utils.module';
import { YoutubeTranscriptService } from './youtube-transcript.service';

@Module({
  imports: [LoggerModule.forChild(YoutubeTranscriptModule.name), UtilsModule],
  providers: [YoutubeTranscriptService],
  exports: [YoutubeTranscriptService],
})
export class YoutubeTranscriptModule {}
