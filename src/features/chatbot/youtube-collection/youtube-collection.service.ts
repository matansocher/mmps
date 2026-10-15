import { env } from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { MY_USER_ID } from '@core/config';
import { getErrorMessage, Logger } from '@core/utils';
import { notify } from '@services/notifier';
import { getVideosFromRSS } from '@services/youtube';
import { getActiveSubscriptions } from '@shared/social-follower';
import type { CreatePendingPostData } from '@shared/social-follower';
import { BOT_CONFIG } from '../chatbot.config';
import { claimYouTubeSubscription, completeYouTubeCollection, getQueuedYouTubeSubscription, getYouTubeRunCompletions, isYouTubeJobComplete, releaseYouTubeSubscription } from './collection.repository';
import { parseYouTubeCollectionJob, youtubeJobId } from './jobs';
import type { YouTubeCollectionJob } from './jobs';

const logger = new Logger('chatbot:youtube-collection');

type Queue = {
  readonly publish: (job: YouTubeCollectionJob) => Promise<void>;
  readonly close: () => Promise<void>;
};

export class YouTubeCollectionService {
  private readonly abort = new AbortController();
  private readonly publishing = new Set<Promise<void>>();
  private readonly monitoring = new Set<Promise<void>>();
  private processing: Promise<void> | null = null;
  private stopped = false;

  constructor(private readonly queue: Queue) {}

  async publish(scheduledAt = new Date()): Promise<void> {
    if (this.stopped) throw new Error('YouTube collector is stopping');
    const operation = this.publishSubscriptions(scheduledAt);
    this.publishing.add(operation);
    try {
      await operation;
    } finally {
      this.publishing.delete(operation);
    }
  }

  private async publishSubscriptions(scheduledAt: Date): Promise<void> {
    let subscriptions;
    try {
      subscriptions = await getActiveSubscriptions('youtube', 5000);
    } catch (err) {
      if (env.NOTIFIER_TELEGRAM_BOT_TOKEN && Number.isFinite(MY_USER_ID) && MY_USER_ID !== 0) {
        try {
          notify(BOT_CONFIG, { action: 'youtube_collection', plainText: 'Queued collection failed before publishing: subscription lookup failed; completion unknown.' });
        } catch (notifyError) {
          logger.error(`Collection notification failed: ${getErrorMessage(notifyError)}`);
        }
      }
      throw err;
    }
    // All jobs in a run share a minute-normalized slot, including repeated cron callbacks.
    const slot = new Date(Math.floor(scheduledAt.getTime() / 60_000) * 60_000).toISOString();
    let failed = 0;
    const jobIds: string[] = [];
    for (const subscription of subscriptions) {
      if (this.stopped) break;
      try {
        if (!subscription._id) throw new Error('YouTube subscription has no MongoDB id');
        const job = { version: 1 as const, subscriptionId: subscription._id.toHexString(), scheduledAt: slot };
        await this.queue.publish(job);
        jobIds.push(youtubeJobId(job));
      } catch (err) {
        failed++;
        logger.error(`YouTube collection publish failed for ${subscription._id}: ${getErrorMessage(err)}`);
      }
    }
    if (env.NOTIFIER_TELEGRAM_BOT_TOKEN && Number.isFinite(MY_USER_ID) && MY_USER_ID !== 0) {
      const monitoring = this.monitorRun(slot, jobIds, failed, subscriptions.length).catch((err) => logger.error(`Collection notification monitoring failed: ${getErrorMessage(err)}`));
      this.monitoring.add(monitoring);
      void monitoring.finally(() => this.monitoring.delete(monitoring));
    }
    if (failed) throw new Error(`Failed to publish ${failed} YouTube collection jobs`);
  }

  private async monitorRun(slot: string, jobIds: string[], failed: number, expected: number): Promise<void> {
    const deadline = Date.now() + 15 * 60_000;
    let completed = 0;
    let newVideos = 0;
    let skipped = 0;
    let unknown = false;
    try {
      do {
        completed = 0;
        newVideos = 0;
        skipped = 0;
        for (let offset = 0; offset < jobIds.length; offset += 500) {
          if (this.stopped) throw new Error('Collection monitor stopped');
          if (offset > 0 && Date.now() >= deadline) throw new Error('Collection monitoring deadline exceeded');
          const records = await getYouTubeRunCompletions(jobIds.slice(offset, offset + 500));
          completed += records.length;
          newVideos += records.reduce((sum, record) => sum + (record.newVideos ?? 0), 0);
          skipped += records.filter((record) => record.skipped).length;
        }
        if (completed === jobIds.length || Date.now() >= deadline) break;
        await delay(Math.min(30_000, deadline - Date.now()), undefined, { signal: this.abort.signal });
      } while (!this.stopped);
    } catch (err) {
      unknown = true;
      logger.error(`Collection completion check failed: ${getErrorMessage(err)}`);
    }
    const pending = Math.max(0, expected - failed - completed);
    const status = unknown
      ? 'completion unknown'
      : !expected
        ? 'no subscriptions'
        : pending
          ? 'pending/incomplete (not confirmed DLQ exhaustion)'
          : failed
            ? completed
              ? 'partial publish failure'
              : 'publish failed'
            : 'completed';
    try {
      notify(BOT_CONFIG, {
        action: 'youtube_collection',
        plainText: `Queued collection ${slot}: ${status}. ${completed}/${expected} durably completed, ${failed} publish failures, ${pending} pending, ${skipped} deleted/inactive skipped, ${newVideos} new videos. Retries may complete after this summary.`,
      });
    } catch (err) {
      logger.error(`Collection notification failed: ${getErrorMessage(err)}`);
    }
  }

  async handle(data: Buffer): Promise<void> {
    if (this.stopped) throw new Error('YouTube collector is stopping');
    if (this.processing) throw new Error('YouTube collector is busy');
    const operation = this.collect(data);
    this.processing = operation;
    try {
      await operation;
    } finally {
      this.processing = null;
    }
  }

  private async collect(data: Buffer): Promise<void> {
    const job = parseYouTubeCollectionJob(data);
    if (await isYouTubeJobComplete(job)) return;
    const owner = await claimYouTubeSubscription(job.subscriptionId);
    try {
      if (await isYouTubeJobComplete(job)) return;
      const subscription = await getQueuedYouTubeSubscription(job);
      let posts: CreatePendingPostData[] = [];
      let newestAt: Date | null = null;
      if (subscription) {
        const signal = AbortSignal.any([this.abort.signal, AbortSignal.timeout(20_000)]);
        const videos = await getVideosFromRSS(subscription.username, signal);
        for (const video of videos) {
          const postedAt = new Date(video.publishedAt);
          if (!Number.isFinite(postedAt.getTime()) || !video.id) throw new Error('Malformed YouTube RSS video');
          if (!newestAt || postedAt > newestAt) newestAt = postedAt;
          if (subscription.lastSeenAt && postedAt > subscription.lastSeenAt) {
            posts.push({
              platform: 'youtube',
              username: subscription.username,
              chatId: subscription.chatId,
              displayName: subscription.displayName,
              postId: video.id,
              text: video.title,
              url: video.url,
              postedAt,
            });
          }
        }
      }
      this.abort.signal.throwIfAborted();
      await completeYouTubeCollection(job, owner, subscription, posts, newestAt);
    } finally {
      await releaseYouTubeSubscription(job.subscriptionId, owner);
    }
  }

  async close(): Promise<void> {
    this.stopped = true;
    this.abort.abort();
    // In-flight transactions either commit durably or remain unacked on forced shutdown.
    await Promise.allSettled([this.processing, ...this.publishing, ...this.monitoring]);
    await this.queue.close();
  }
}
