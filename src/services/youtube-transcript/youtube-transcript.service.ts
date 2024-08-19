import { Injectable } from '@nestjs/common';
import { YoutubeTranscript } from 'youtube-transcript';
import { LoggerService } from '@core/logger/logger.service';
import { UtilsService } from '@core/utils/utils.service';

const supportedLanguages = ['en', 'iw'];

@Injectable()
export class YoutubeTranscriptService {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
  ) {}

  async getYoutubeVideoTranscription(videoId: string): Promise<{ transcription: any; errorMessage: string }> {
    this.logger.info(this.getYoutubeVideoTranscription.name, `start`);
    const resultsArr = await Promise.allSettled(supportedLanguages.map((lang: string) => YoutubeTranscript.fetchTranscript(videoId, { lang })));
    const bestResult = resultsArr.find((result) => result.status === 'fulfilled');
    if (!bestResult) {
      return {
        transcription: null,
        errorMessage: `I am sorry but I did not find the transcription for this video. I support only english and hebrew videos for now.`,
      };
    }
    const transcription = this.parseTranscriptResult(bestResult['value']);
    this.logger.info(this.getYoutubeVideoTranscription.name, `end`);
    return { transcription, errorMessage: null };
  }

  getYoutubeVideoIdFromUrl(url: string): string {
    // shorts
    if (url.includes('shorts')) {
      const cleanedUrl = url.split('?')[0];
      const parts = cleanedUrl.split('/');
      return parts[parts.length - 1];
    }
    // web
    const queryParams = this.utilsService.getQueryParams(url);
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
