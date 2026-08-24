import { exec } from 'child_process';
import ffmpeg from 'fluent-ffmpeg';
import { getErrorMessage, Logger } from '@core/utils';

export function setFfmpegPath() {
  const logger = new Logger('core:ffmpeg');
  exec('which ffmpeg', (err, stdout: string) => {
    if (err) {
      logger.error(`which ffmpeg exec - Error finding ffmpeg: ${getErrorMessage(err)}`);
      return;
    }
    logger.log(`which ffmpeg exec - ffmpeg path: ${stdout.trim()}`);
    ffmpeg.setFfmpegPath(stdout.trim());
  });
}
