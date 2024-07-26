import { promises as fs } from 'fs';
import { Injectable } from '@nestjs/common';
import ffmpeg from 'fluent-ffmpeg';
import { exec } from 'child_process';
import { LoggerService } from '@core/logger/logger.service';

@Injectable()
export class UtilsService {
  constructor(private readonly logger: LoggerService) {
    this.setFfmpegPath();
  }

  setFfmpegPath() {
    exec('which ffmpeg', (error, stdout: string) => {
      if (error) {
        this.logger.error('which ffmpeg exec', `Error finding ffmpeg: ${this.getErrorMessage(error)}`);
        return;
      }
      this.logger.info('which ffmpeg exec', `FFmpeg path: ${stdout.trim()}`);
      ffmpeg.setFfmpegPath(stdout.trim());
    });
  }

  async deleteFile(audioFileLocalPath: string): Promise<void> {
    try {
      await fs.unlink(audioFileLocalPath);
      this.logger.info(this.deleteFile.name, `Deleted file at ${audioFileLocalPath}`);
    } catch (err) {
      this.logger.error(this.deleteFile.name, `Error deleting file at ${audioFileLocalPath}: ${this.getErrorMessage(err)}`);
    }
  }

  async extractAudioFromVideo(videoFilePath: string): Promise<string> {
    const audioFilePath = videoFilePath.replace(/\.[^/.]+$/, '') + '.mp3';

    return new Promise((resolve, reject) => {
      ffmpeg(videoFilePath)
        .output(audioFilePath)
        .on('end', () => resolve(audioFilePath))
        .on('error', reject)
        .run();
    });
  }

  async saveVideoBytesArray(videoBytesArray, videoFilePath: string): Promise<string> {
    try {
      const buffer = Buffer.from(videoBytesArray);
      await fs.writeFile(videoFilePath, buffer);
      return videoFilePath;
    } catch (err) {
      this.logger.error(this.saveVideoBytesArray.name, `Error saving file at ${videoFilePath}: ${this.getErrorMessage(err)}`);
    }
  }

  getErrorMessage(error: Error): string {
    return error instanceof Error ? error.message : JSON.stringify(error);
  }

  getQueryParams(urlString: string) {
    const parsedUrl = new URL(urlString);
    const queryParams = {};

    for (const [key, value] of parsedUrl.searchParams.entries()) {
      queryParams[key] = value;
    }

    return queryParams;
  }

  objectToQueryParams(obj) {
    return Object.keys(obj)
      .map((key: string) => encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]))
      .join('&');
  }

  queryParamsToObject(queryString: string) {
    return queryString
      .split('&')
      .map((param: string) => param.split('='))
      .reduce((acc, [key, value]) => {
        acc[decodeURIComponent(key)] = decodeURIComponent(value);
        return acc;
      }, {});
  }
}
