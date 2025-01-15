import axios from 'axios';
import { promises as fs } from 'fs';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getErrorMessage } from '@core/utils';

@Injectable()
export class ImgurService {
  private readonly logger = new Logger(ImgurService.name);

  constructor(private readonly configService: ConfigService) {}

  async uploadImage(imageLocalPath: string): Promise<string> {
    try {
      this.logger.log(this.uploadImage.name, `start`);
      const imageBuffer = await fs.readFile(imageLocalPath, { encoding: 'base64' });
      const data = {
        image: imageBuffer,
        type: 'base64',
        title: 'Simple upload',
        description: 'This is a simple image upload in Imgur',
      };

      const config = {
        url: 'https://api.imgur.com/3/image',
        method: 'post',
        headers: {
          Authorization: `Client-ID ${this.configService.get('IMGUR_CLIENT_ID')}`,
          'Content-Type': 'application/json',
        },
        data: data,
      };

      const result = await axios(config);
      this.logger.log(this.uploadImage.name, `end`);
      return result['data']?.data?.link;
    } catch (err) {
      this.logger.error(this.uploadImage.name, `err - ${getErrorMessage(err)}`);
      throw err;
    }
  }
}
