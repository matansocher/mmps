import { readYouTubeQueueConfig, YouTubeCollectionQueue } from '@services/youtube-collection-queue';
import { ensureYouTubeCollectionIndexes } from './collection.repository';
import { YouTubeCollectionService } from './youtube-collection.service';

let collector: YouTubeCollectionService | null = null;

export async function initYouTubeCollection(): Promise<YouTubeCollectionService | null> {
  const config = readYouTubeQueueConfig();
  if (!config) return null;
  await ensureYouTubeCollectionIndexes();
  const queue = new YouTubeCollectionQueue(config);
  const service = new YouTubeCollectionService(queue);
  try {
    await queue.init((data) => service.handle(data));
    collector = service;
    return service;
  } catch (err) {
    await service.close();
    throw err;
  }
}

export async function closeYouTubeCollection(): Promise<void> {
  await collector?.close();
  collector = null;
}
