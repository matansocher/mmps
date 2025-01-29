import { exec } from 'child_process';
import ffmpeg from 'fluent-ffmpeg';
import { Logger } from '@nestjs/common';
import { getErrorMessage } from './get-error-message';

export function setFfmpegPath() {
  const logger = new Logger(setFfmpegPath.name);
  exec('which ffmpeg', (error, stdout: string) => {
    if (error) {
      logger.error(`which ffmpeg exec - Error finding ffmpeg: ${getErrorMessage(error)}`);
      return;
    }
    logger.log(`which ffmpeg exec - ffmpeg path: ${stdout.trim()}`);
    ffmpeg.setFfmpegPath(stdout.trim());
  });
}
