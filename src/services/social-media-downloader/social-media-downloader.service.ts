// import axios from 'axios';
import { Injectable } from '@nestjs/common';
// import { ndown, tikdown } from 'nayan-media-downloader';
import { LoggerService } from '@core/logger';
import { UtilsService } from '@core/utils';

@Injectable()
export class SocialMediaDownloaderService {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
  ) {}

  // async getMetaVideo(videoUrl: string): Promise<string> {
  //   try {
  //     this.logger.info(this.getMetaVideo.name, `start`);
  //     const { data } = await ndown(videoUrl);
  //     const videoDownloadLink = data[0].url;
  //     const video = await axios.get(videoDownloadLink, { responseType: 'arraybuffer' });
  //     return video['data'];
  //   } catch (err) {
  //     this.logger.error(this.getMetaVideo.name, `err - ${this.utilsService.getErrorMessage(err)}`);
  //     throw err;
  //   }
  // }

  // async getTiktokAudio(videoUrl: string): Promise<string> {
  //   try {
  //     this.logger.info(this.getTiktokAudio.name, `start`);
  //     const { data } = await tikdown(videoUrl);
  //     const videoDownloadLink = data.audio;
  //     const audio = await axios.get(videoDownloadLink, { responseType: 'arraybuffer' });
  //     return audio['data'];
  //   } catch (err) {
  //     this.logger.error(this.getTiktokAudio.name, `err - ${this.utilsService.getErrorMessage(err)}`);
  //     throw err;
  //   }
  // }
}
