import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger';
import { YoutubeTranscriptService } from './youtube-transcript.service';

@Module({
  imports: [LoggerModule.forChild(YoutubeTranscriptModule.name)],
  providers: [YoutubeTranscriptService],
  exports: [YoutubeTranscriptService],
})
export class YoutubeTranscriptModule {}
