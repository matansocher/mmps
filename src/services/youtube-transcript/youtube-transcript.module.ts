import { Module } from '@nestjs/common';
import { YoutubeTranscriptService } from './youtube-transcript.service';

@Module({
  providers: [YoutubeTranscriptService],
  exports: [YoutubeTranscriptService],
})
export class YoutubeTranscriptModule {}
