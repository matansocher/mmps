import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger/logger.module';
import { UtilsModule } from '@services/utils';
import { YoutubeTranscriptService } from './youtube-transcript.service';

@Module({
  imports: [LoggerModule.forRoot(YoutubeTranscriptModule.name), UtilsModule],
  providers: [YoutubeTranscriptService],
  exports: [YoutubeTranscriptService],
})
export class YoutubeTranscriptModule {}
