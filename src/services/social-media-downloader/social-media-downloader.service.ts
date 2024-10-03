import axios from 'axios';
import { YoutubeTranscript } from 'youtube-transcript';
import { Inject, Injectable } from '@nestjs/common';
import { LoggerService } from '@core/logger';
import { UtilsService } from '@core/utils';
import { ISocialMediaClient } from './interface';
import { SOCIAL_MEDIA_CLIENT_TOKEN } from './social-media-downloader.config';

const supportedLanguages = ['en', 'iw'];

@Injectable()
export class SocialMediaDownloaderService {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    @Inject(SOCIAL_MEDIA_CLIENT_TOKEN) private readonly socialMediaClient: ISocialMediaClient,
  ) {}

  async getSocialMediaVideoTranscription(videoUrl: string): Promise<any> {
    let result;
    if (videoUrl.includes('youtube')) {
      result = await this.getYoutubeVideoTranscription(videoUrl);
    } else if (videoUrl.includes('facebook') || videoUrl.includes('instagram')) {
      result = await this.getMetaVideoTranscription(videoUrl);
    } else if (videoUrl.includes('tiktok')) {
      result = await this.getTiktokAudioTranscription(videoUrl);
    }
    return result;
    // return { errorMessage: 'I am having trouble finding the video you shared', transcription: null };
  }

  async getMetaVideoTranscription(videoUrl: string): Promise<any> {
    try {
      this.logger.info(this.getMetaVideoTranscription.name, `start`);
      const { data } = await this.socialMediaClient.meta(videoUrl);
      const videoDownloadLink = data[0].url;
      const video = await axios.get(videoDownloadLink, { responseType: 'arraybuffer' });
      return video['data'];
    } catch (err) {
      this.logger.error(this.getMetaVideoTranscription.name, `err - ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  async getTiktokAudioTranscription(videoUrl: string): Promise<any> {
    try {
      this.logger.info(this.getTiktokAudioTranscription.name, `start`);
      const { data } = await this.socialMediaClient.tiktok(videoUrl);
      const videoDownloadLink = data.audio;
      const audio = await axios.get(videoDownloadLink, { responseType: 'arraybuffer' });
      return audio['data'];
    } catch (err) {
      this.logger.error(this.getTiktokAudioTranscription.name, `err - ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  // $$$$$$$$$$$$$$$$$$$$$$$$$$ youtube
  async getYoutubeVideoTranscription(videoUrl: string): Promise<{ transcription: any; errorMessage: string }> {
    this.logger.info(this.getYoutubeVideoTranscription.name, `start`);
    const videoId = this.getYoutubeVideoIdFromUrl(videoUrl);
    if (!videoId) {
      return null;
    }
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
