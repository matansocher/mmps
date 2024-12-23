import { promises as fs } from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import { exec } from 'child_process';
import { toZonedTime } from 'date-fns-tz';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { DEFAULT_TIMEZONE } from '@core/config';
import { LoggerService } from '@core/logger';

@Injectable()
export class UtilsService implements OnModuleInit {
  constructor(private readonly logger: LoggerService) {}

  onModuleInit() {
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

  async writeFile(filePath: string, fileContent: string): Promise<void> {
    try {
      await fs.writeFile(filePath, fileContent);
    } catch (err) {
      console.error(err);
      return null;
    }
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

  objectToQueryParams(obj: Record<string, any>) {
    return Object.keys(obj)
      .map((key: string) => encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]))
      .join('&');
  }

  queryParamsToObject(queryString: string): Record<string, any> {
    return queryString
      .split('&')
      .map((param: string) => param.split('='))
      .reduce((acc, [key, value]) => {
        acc[decodeURIComponent(key)] = decodeURIComponent(value);
        return acc;
      }, {});
  }

  getTimezoneOffset(): number {
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: DEFAULT_TIMEZONE, timeZoneName: 'short' });
    const parts = formatter.formatToParts(new Date());
    const timeZoneName = parts.find((part) => part.type === 'timeZoneName')?.value || '';
    const match = timeZoneName.match(/GMT([+-]\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  getTimeWithOffset(date: Date, time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const localDateTime = new Date(Number(date.getFullYear()), Number(date.getMonth()), Number(date.getDate()), hours, minutes);
    const offsetInMilliseconds = this.getTimezoneOffset() * 60 * 60 * 1000;
    const utcDateTime = new Date(localDateTime.getTime() - offsetInMilliseconds);
    return utcDateTime.toISOString();
  }

  getDateNumber(num: number): string {
    return num < 10 ? `0${num}` : `${num}`;
  }

  getDateString(date?: Date): string {
    const finalDate = date || toZonedTime(new Date(), DEFAULT_TIMEZONE);
    return `${finalDate.getFullYear()}-${this.getDateNumber(finalDate.getMonth() + 1)}-${this.getDateNumber(finalDate.getDate())}`;
  }

  isHebrew(text: string): boolean {
    return /[\u0590-\u05FF]/.test(text);
  }

  compressString(str: string): string {
    return str.replace(/\s+/g, ' ').trim();
  }
}
