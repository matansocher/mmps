import type TelegramBot from 'node-telegram-bot-api';
import { extractAudioFromVideo } from '@core/utils';

interface ReturnType {
  readonly audioFileLocalPath: string;
  readonly videoFileLocalPath: string;
}

export async function downloadAudioFromVideoOrAudio(bot: TelegramBot, { video, audio }, localFilePath: string): Promise<ReturnType> {
  let audioFileLocalPath: string;
  let videoFileLocalPath: string;
  if (video?.file_id) {
    videoFileLocalPath = await bot.downloadFile(video.file_id, localFilePath);
    audioFileLocalPath = await extractAudioFromVideo(videoFileLocalPath);
  } else if (audio?.file_id) {
    audioFileLocalPath = await bot.downloadFile(audio.file_id, localFilePath);
  }
  return { audioFileLocalPath, videoFileLocalPath };
}

export async function downloadAudio(bot: TelegramBot, audio, localFilePath: string): Promise<string> {
  return bot.downloadFile(audio.file_id, localFilePath);
}
