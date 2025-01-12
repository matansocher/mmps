import { YoutubeTranscript } from 'youtube-transcript';
import { Injectable, Logger } from '@nestjs/common';
import { getQueryParams } from '@core/utils';

const supportedLanguages = ['en', 'iw'];

@Injectable()
export class YoutubeTranscriptService {
  private readonly logger = new Logger(YoutubeTranscriptService.name);

  async getYoutubeVideoTranscription(videoId: string): Promise<{ transcription: any; errorMessage: string }> {
    this.logger.log(this.getYoutubeVideoTranscription.name, `start`);
    const resultsArr = await Promise.allSettled(supportedLanguages.map((lang: string) => YoutubeTranscript.fetchTranscript(videoId, { lang })));
    const bestResult = resultsArr.find((result) => result.status === 'fulfilled');
    if (!bestResult) {
      return {
        transcription: null,
        errorMessage: `I am sorry but I did not find the transcription for this video. I support only english and hebrew videos for now.`,
      };
    }
    const transcription = this.parseTranscriptResult(bestResult['value']);
    this.logger.log(this.getYoutubeVideoTranscription.name, `end`);
    return { transcription, errorMessage: null };
  }

  getYoutubeVideoIdFromUrl(url: string): string {
    // shorts
    if (url.includes('shorts')) {
      const cleanedUrl = url.split('?')[0];
      const parts = cleanedUrl.split('/');
      return parts[parts.length - 1];
    }
    // shortener link
    if (url.includes('youtu.be')) {
      const regex = /^https:\/\/youtu\.be\/([^?]+)/;

      const match = url.match(regex);
      return match ? match[1] : null;
    }
    // web
    const queryParams = getQueryParams(url);
    return queryParams['v'];
  }

  parseTranscriptResult(result: any[]): { text: string; start: string; end: string }[] {
    return result.map((item) => {
      const { text, duration, offset } = item;
      const start = this.getTimestampInMinutesFromSeconds(offset);
      const end = this.getTimestampInMinutesFromSeconds(offset + duration);
      return { text, start, end };
    });
  }

  getTimestampInMinutesFromSeconds(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round((seconds % 60) * 100) / 100;
    return `${minutes}:${remainingSeconds}`;
  }
}
