// import axios from 'axios';
import { Injectable, Logger } from '@nestjs/common';
// import { ndown, tikdown } from 'nayan-media-downloader';

@Injectable()
export class SocialMediaDownloaderService {
  // private readonly logger = new Logger(SocialMediaDownloaderService.name);

  // async getMetaVideo(videoUrl: string): Promise<string> {
  //   try {
  //     this.logger.log(this.getMetaVideo.name, `start`);
  //     const { data } = await ndown(videoUrl);
  //     const videoDownloadLink = data[0].url;
  //     const video = await axios.get(videoDownloadLink, { responseType: 'arraybuffer' });
  //     return video['data'];
  //   } catch (err) {
  //     this.logger.error(this.getMetaVideo.name, `err - ${getErrorMessage(err)}`);
  //     throw err;
  //   }
  // }

  // async getTiktokAudio(videoUrl: string): Promise<string> {
  //   try {
  //     this.logger.log(this.getTiktokAudio.name, `start`);
  //     const { data } = await tikdown(videoUrl);
  //     const videoDownloadLink = data.audio;
  //     const audio = await axios.get(videoDownloadLink, { responseType: 'arraybuffer' });
  //     return audio['data'];
  //   } catch (err) {
  //     this.logger.error(this.getTiktokAudio.name, `err - ${getErrorMessage(err)}`);
  //     throw err;
  //   }
  // }
}
