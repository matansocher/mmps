import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ndown, tikdown } from 'nayan-media-downloader';
import { LoggerService } from '@core/logger/logger.service';
import { UtilsService } from '@services/utils/utils.service';

@Injectable()
export class SocialMediaDownloaderService {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
  ) {}

  async getInstagramVideo(videoUrl) {
    try {
      this.logger.info(this.getInstagramVideo.name, `start`);
      const { data } = await ndown(videoUrl);
      const videoDownloadLink = data[0].url;
      const video = await axios.get(videoDownloadLink, { responseType: 'arraybuffer' });
      return video.data;
    } catch (err) {
      this.logger.error(this.getInstagramVideo.name, `err - ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  async getTiktokAudio(videoUrl) {
    try {
      this.logger.info(this.getTiktokAudio.name, `start`);
      const { data } = await tikdown(videoUrl);
      const videoDownloadLink = data.audio;
      const audio = await axios.get(videoDownloadLink, { responseType: 'arraybuffer' });
      return audio.data;
    } catch (err) {
      this.logger.error(this.getTiktokAudio.name, `err - ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }
}
