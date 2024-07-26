import { UtilsService } from '@services/utils/utils.service';
import axios from 'axios';
import { LoggerService } from '@core/logger/logger.service';
import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';

const IMGUR_CLIENT_ID = process.env.IMGUR_CLIENT_ID;

@Injectable()
export class ImgurService {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
  ) {}

  async uploadImage(imageLocalPath) {
    try {
      this.logger.info(this.uploadImage.name, `start`);
      const imageBuffer = await fs.readFile(imageLocalPath, { encoding: 'base64' });
      const data = {
        image: imageBuffer,
        type: 'base64',
        title: 'Simple upload',
        description: 'This is a simple image upload in Imgur',
      };

      const config = {
        method: 'post',
        url: 'https://api.imgur.com/3/image',
        headers: {
          Authorization: `Client-ID ${IMGUR_CLIENT_ID}`,
          'Content-Type': 'application/json',
        },
        data: data,
      };

      const result = await axios(config);
      this.logger.info(this.uploadImage.name, `end`);
      return result.data.data.link;
    } catch (err) {
      this.logger.error(this.uploadImage.name, `err - ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }
}
