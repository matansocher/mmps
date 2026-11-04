import { z } from 'zod';

const jobSchema = z
  .object({
    version: z.literal(1),
    subscriptionId: z.string().regex(/^[a-f0-9]{24}$/),
    scheduledAt: z.string().datetime(),
  })
  .strict();

export type YouTubeCollectionJob = {
  readonly version: 1;
  readonly subscriptionId: string;
  readonly scheduledAt: string;
};

export function parseYouTubeCollectionJob(data: Buffer, now = new Date()): YouTubeCollectionJob {
  if (data.length > 1024) throw new Error('YouTube collection job exceeds 1 KiB');
  const job = jobSchema.parse(JSON.parse(data.toString('utf8')));
  const age = now.getTime() - Date.parse(job.scheduledAt);
  // Reject ancient manual replays after the durable ledger's retention window.
  if (age > 7 * 24 * 60 * 60 * 1000 || age < -5 * 60 * 1000) throw new Error('YouTube collection job is outside the seven-day processing window');
  return job as YouTubeCollectionJob;
}

export function youtubeJobId(job: YouTubeCollectionJob): string {
  return `${job.subscriptionId}:${job.scheduledAt}`;
}
