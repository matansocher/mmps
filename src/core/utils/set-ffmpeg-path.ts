import { exec } from 'child_process';
import ffmpeg from 'fluent-ffmpeg';
import { Logger } from '@core/utils';

export function setFfmpegPath() {
  const logger = new Logger(setFfmpegPath.name);
  exec('which ffmpeg', (err, stdout: string) => {
    if (err) {
      logger.error(`which ffmpeg exec - Error finding ffmpeg: ${err}`);
      return;
    }
    logger.log(`which ffmpeg exec - ffmpeg path: ${stdout.trim()}`);
    ffmpeg.setFfmpegPath(stdout.trim());
  });
}
