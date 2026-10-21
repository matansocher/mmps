import { ObjectId } from 'mongodb';
import { createHash, randomUUID } from 'node:crypto';
import { getMongoClient, getMongoCollection } from '@core/mongo';
import type { CreatePendingPostData, PendingPost, SocialSubscription } from '@shared/social-follower';
import { DB_NAME } from '@shared/social-follower';
import { youtubeJobId } from './jobs';
import type { YouTubeCollectionJob } from './jobs';

type Lease = { readonly _id: string; readonly owner: string; readonly expiresAt: Date };
type CompletedJob = { readonly _id: string; readonly completedAt: Date; readonly newVideos?: number; readonly skipped?: boolean };
const leases = () => getMongoCollection<Lease>(DB_NAME, 'YouTubeCollectionLease');
const jobs = () => getMongoCollection<CompletedJob>(DB_NAME, 'YouTubeCollectionJob');
const subscriptions = () => getMongoCollection<SocialSubscription>(DB_NAME, 'SocialSubscription');
const OPERATION_TIMEOUT_MS = 5000;

export async function ensureYouTubeCollectionIndexes(): Promise<void> {
  await jobs().createIndex({ completedAt: 1 }, { expireAfterSeconds: 14 * 24 * 60 * 60, timeoutMS: OPERATION_TIMEOUT_MS });
  await leases().createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, timeoutMS: OPERATION_TIMEOUT_MS });
  // Fail activation on standalone MongoDB rather than retrying every message forever.
  const client = await getMongoClient();
  const hello = await client.db(DB_NAME).command({ hello: 1 }, { timeoutMS: OPERATION_TIMEOUT_MS });
  if (!hello.setName && hello.msg !== 'isdbgrid') throw new Error('YouTube Pub/Sub collection requires MongoDB replica-set or sharded transactions');
  const session = client.startSession();
  try {
    await session.withTransaction(
      async () => {
        await jobs().findOne({ _id: 'startup-probe' }, { session });
      },
      { timeoutMS: OPERATION_TIMEOUT_MS, readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } },
    );
  } finally {
    await session.endSession();
  }
}

export async function claimYouTubeSubscription(subscriptionId: string): Promise<string> {
  const owner = randomUUID();
  const now = new Date();
  try {
    const lease = await leases().findOneAndUpdate(
      { _id: subscriptionId, expiresAt: { $lte: now } },
      { $set: { owner, expiresAt: new Date(now.getTime() + 120_000) } },
      { upsert: true, returnDocument: 'after', timeoutMS: OPERATION_TIMEOUT_MS },
    );
    if (lease?.owner === owner) return owner;
  } catch (err) {
    if ((err as { code?: number }).code !== 11000) throw err;
  }
  throw new Error('YouTube subscription is already being collected');
}

export async function releaseYouTubeSubscription(subscriptionId: string, owner: string): Promise<void> {
  await leases().deleteOne({ _id: subscriptionId, owner }, { timeoutMS: OPERATION_TIMEOUT_MS });
}

export async function getQueuedYouTubeSubscription(job: YouTubeCollectionJob): Promise<SocialSubscription | null> {
  return subscriptions().findOne({ _id: new ObjectId(job.subscriptionId), platform: 'youtube', isActive: true }, { timeoutMS: OPERATION_TIMEOUT_MS });
}

export async function isYouTubeJobComplete(job: YouTubeCollectionJob): Promise<boolean> {
  return !!(await jobs().findOne({ _id: youtubeJobId(job) }, { timeoutMS: OPERATION_TIMEOUT_MS }));
}

export async function completeYouTubeCollection(
  job: YouTubeCollectionJob,
  owner: string,
  subscription: SocialSubscription | null,
  posts: CreatePendingPostData[],
  newestAt: Date | null,
): Promise<void> {
  const client = await getMongoClient();
  const session = client.startSession();
  try {
    await session.withTransaction(
      async () => {
        const options = { session };
        // Writing the lease inside the transaction fences an expired worker against takeover.
        const fence = await leases().updateOne({ _id: job.subscriptionId, owner, expiresAt: { $gt: new Date() } }, { $set: { expiresAt: new Date(Date.now() + 120_000) } }, options);
        if (!fence.matchedCount) throw new Error('YouTube collection lease lost');
        if (await jobs().findOne({ _id: youtubeJobId(job) }, options)) return;
        const live = await subscriptions().findOne({ _id: new ObjectId(job.subscriptionId), platform: 'youtube', isActive: true }, options);
        if (live && subscription) {
          // A subscription edited while RSS was in flight must be retried against its live cursor.
          if (live.updatedAt.getTime() !== subscription.updatedAt.getTime()) throw new Error('YouTube subscription changed during collection');
          const pending = getMongoCollection<PendingPost>(DB_NAME, 'PendingPost');
          for (const post of posts) {
            const _id = new ObjectId(createHash('sha256').update(`${job.subscriptionId}:${post.postId}`).digest('hex').slice(0, 24));
            // Match legacy direct-collector rows too; deterministic _id protects concurrent inserts.
            const { platform, username, chatId, postId } = post;
            await pending.updateOne({ platform, username, chatId, postId }, { $setOnInsert: { _id, ...post, collectedAt: new Date() } }, { ...options, upsert: true });
          }
          if (newestAt) await subscriptions().updateOne({ _id: live._id, isActive: true }, { $max: { lastSeenAt: newestAt }, $set: { updatedAt: new Date() } }, options);
        }
        await jobs().insertOne({ _id: youtubeJobId(job), completedAt: new Date(), newVideos: live && subscription ? posts.length : 0, skipped: !live || !subscription }, options);
      },
      { maxCommitTimeMS: OPERATION_TIMEOUT_MS, timeoutMS: 20_000, writeConcern: { w: 'majority' }, readConcern: { level: 'snapshot' } },
    );
  } finally {
    await session.endSession();
  }
}

export async function getYouTubeRunCompletions(jobIds: string[]): Promise<CompletedJob[]> {
  return jobs()
    .find({ _id: { $in: jobIds } }, { timeoutMS: OPERATION_TIMEOUT_MS })
    .toArray();
}
