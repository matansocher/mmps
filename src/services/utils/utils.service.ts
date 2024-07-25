import { LoggerService } from '@core/logger/logger.service';
import { Injectable } from '@nestjs/common';
import ffmpeg from 'fluent-ffmpeg';
import { exec } from 'child_process';
import { promises as fs } from 'fs';

@Injectable()
export class UtilsService {
  constructor(private readonly logger: LoggerService) {
    exec('which ffmpeg', (error, stdout) => {
      if (error) {
        this.logger.error('which ffmpeg exec', `Error finding ffmpeg: ${this.getErrorMessage(error)}`);
        return;
      }
      this.logger.info('which ffmpeg exec', `FFmpeg path: ${stdout.trim()}`);
      ffmpeg.setFfmpegPath(stdout.trim());
    });
  }

  async deleteFile(audioFileLocalPath) {
    try {
      await fs.unlink(audioFileLocalPath);
      this.logger.info(this.deleteFile.name, `Deleted file at ${audioFileLocalPath}`);
    } catch (err) {
      this.logger.error(this.deleteFile.name, `Error deleting file at ${audioFileLocalPath}: ${this.getErrorMessage(err)}`);
    }
  }

  async extractAudioFromVideo(videoFilePath) {
    const audioFilePath = videoFilePath.replace(/\.[^/.]+$/, '') + '.mp3';

    return new Promise((resolve, reject) => {
      ffmpeg(videoFilePath)
        .output(audioFilePath)
        .on('end', () => resolve(audioFilePath))
        .on('error', reject)
        .run();
    });
  }

  async saveVideoBytesArray(videoBytesArray, videoFilePath) {
    try {
      const buffer = Buffer.from(videoBytesArray);
      await fs.writeFile(videoFilePath, buffer);
      return videoFilePath;
    } catch (err) {
      this.logger.error(this.saveVideoBytesArray.name, `Error saving file at ${videoFilePath}: ${this.getErrorMessage(err)}`);
    }
  }

  getErrorMessage(error) {
    return error instanceof Error ? error.message : JSON.stringify(error);
  }

  getQueryParams(urlString) {
    const parsedUrl = new URL(urlString);
    const queryParams = {};

    for (const [key, value] of parsedUrl.searchParams.entries()) {
      queryParams[key] = value;
    }

    return queryParams;
  }

  objectToQueryParams(obj) {
    return Object.keys(obj)
      .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]))
      .join('&');
  }

  queryParamsToObject(queryString) {
    return queryString
      .split('&')
      .map(param => param.split('='))
      .reduce((acc, [key, value]) => {
        acc[decodeURIComponent(key)] = decodeURIComponent(value);
        return acc;
      }, {});
  }
}
