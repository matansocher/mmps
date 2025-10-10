import { fetchUserVideos } from '@services/tiktok';
import { getVideos } from '@shared/tiktok';
import { ProcessChannelOptions, ProcessedVideo, processSingleVideo } from '.';

export async function processChannelVideos(options: ProcessChannelOptions): Promise<ProcessedVideo[]> {
  const { bot, chatId, channel, maxVideos = 5 } = options;

  const { videos } = await fetchUserVideos(channel.username, maxVideos).catch(() => ({ videos: [] }));
  if (!videos.length) {
    return [];
  }

  const viewedVideos = await getVideos();
  const newVideos = videos.filter((video) => !viewedVideos.find((v) => v.videoId === video.id));

  if (!newVideos.length) {
    return [];
  }

  const processedVideos: ProcessedVideo[] = [];
  for (const video of newVideos) {
    try {
      const processed = await processSingleVideo({ bot, chatId, username: channel.username, videoId: video.id, videoUrl: video.url });
      processedVideos.push(processed);
    } catch (error) {
      console.error(`Error processing video ${video.id}:`, error);
    }
  }

  return processedVideos;
}
