import { ObjectId } from 'mongodb';
import { notify } from '@services/notifier';
import { getVideosFromRSS } from '@services/youtube';
import { getActiveSubscriptions } from '@shared/social-follower';
import { claimYouTubeSubscription, completeYouTubeCollection, getQueuedYouTubeSubscription, getYouTubeRunCompletions, isYouTubeJobComplete, releaseYouTubeSubscription } from './collection.repository';
import { YouTubeCollectionService } from './youtube-collection.service';

vi.mock('node:timers/promises', () => ({ setTimeout: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)) }));
vi.mock('@services/notifier', () => ({ notify: vi.fn() }));
vi.mock('@core/config', () => ({ MY_USER_ID: 42, isProd: false }));
vi.mock('@services/youtube', () => ({ getVideosFromRSS: vi.fn() }));
vi.mock('@shared/social-follower', () => ({ getActiveSubscriptions: vi.fn() }));
vi.mock('./collection.repository', () => ({
  claimYouTubeSubscription: vi.fn(),
  completeYouTubeCollection: vi.fn(),
  getQueuedYouTubeSubscription: vi.fn(),
  getYouTubeRunCompletions: vi.fn(),
  isYouTubeJobComplete: vi.fn(),
  releaseYouTubeSubscription: vi.fn(),
}));

const id = new ObjectId();
const job = () => ({ version: 1, subscriptionId: id.toHexString(), scheduledAt: new Date().toISOString() });
const data = () => Buffer.from(JSON.stringify(job()));
const subscription = { _id: id, username: 'UCchannel', platform: 'youtube', chatId: 42, lastSeenAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01') };
const video = { id: 'new', title: 'Video', url: 'https://youtube.com/watch?v=new', publishedAt: '2026-02-01T00:00:00Z' };

describe('YouTubeCollectionService', () => {
  let queue: { publish: ReturnType<typeof vi.fn<() => Promise<void>>>; close: ReturnType<typeof vi.fn<() => Promise<void>>> };
  let service: YouTubeCollectionService;
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('NOTIFIER_TELEGRAM_BOT_TOKEN', '');
    queue = { publish: vi.fn().mockResolvedValue(undefined), close: vi.fn().mockResolvedValue(undefined) };
    service = new YouTubeCollectionService(queue);
    vi.mocked(isYouTubeJobComplete).mockResolvedValue(false);
    vi.mocked(claimYouTubeSubscription).mockResolvedValue('owner');
    vi.mocked(getQueuedYouTubeSubscription).mockResolvedValue(subscription as never);
    vi.mocked(getVideosFromRSS).mockResolvedValue([video] as never);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('publishes compact live subscription ids with one stable minute slot', async () => {
    vi.mocked(getActiveSubscriptions).mockResolvedValue([subscription] as never);
    await service.publish(new Date('2026-02-01T11:30:59Z'));
    expect(getActiveSubscriptions).toHaveBeenCalledWith('youtube', 5000);
    expect(queue.publish).toHaveBeenCalledWith({ version: 1, subscriptionId: id.toHexString(), scheduledAt: '2026-02-01T11:30:00.000Z' });
  });

  it('continues publishing after failures and reports failure to cron', async () => {
    vi.mocked(getActiveSubscriptions).mockResolvedValue([subscription, subscription] as never);
    queue.publish.mockRejectedValueOnce(new Error('unavailable'));
    await expect(service.publish()).rejects.toThrow('Failed to publish 1');
    expect(queue.publish).toHaveBeenCalledTimes(2);
  });

  it('uses live cursor and commits posts before resolving for ack', async () => {
    await service.handle(data());
    expect(completeYouTubeCollection).toHaveBeenCalledWith(expect.anything(), 'owner', subscription, [expect.objectContaining({ postId: 'new', chatId: 42 })], new Date(video.publishedAt));
    expect(releaseYouTubeSubscription).toHaveBeenCalledWith(id.toHexString(), 'owner');
  });

  it('establishes a first-run baseline without importing old videos', async () => {
    vi.mocked(getQueuedYouTubeSubscription).mockResolvedValue({ ...subscription, lastSeenAt: null } as never);
    await service.handle(data());
    expect(completeYouTubeCollection).toHaveBeenCalledWith(expect.anything(), 'owner', expect.anything(), [], new Date(video.publishedAt));
  });

  it('does not re-import videos behind the latest live cursor', async () => {
    vi.mocked(getQueuedYouTubeSubscription).mockResolvedValue({ ...subscription, lastSeenAt: new Date('2026-03-01') } as never);
    await service.handle(data());
    expect(completeYouTubeCollection).toHaveBeenCalledWith(expect.anything(), 'owner', expect.anything(), [], new Date(video.publishedAt));
  });

  it('skips completed duplicate jobs even after pending rows were deleted', async () => {
    vi.mocked(isYouTubeJobComplete).mockResolvedValue(true);
    await service.handle(data());
    expect(getVideosFromRSS).not.toHaveBeenCalled();
    expect(claimYouTubeSubscription).not.toHaveBeenCalled();
  });

  it('records deleted or inactive subscriptions as durable no-ops', async () => {
    vi.mocked(getQueuedYouTubeSubscription).mockResolvedValue(null);
    await service.handle(data());
    expect(getVideosFromRSS).not.toHaveBeenCalled();
    expect(completeYouTubeCollection).toHaveBeenCalledWith(expect.anything(), 'owner', null, [], null);
  });

  it.each(['RSS', 'transaction'])('propagates %s errors for retry, never false success', async (failure) => {
    if (failure === 'RSS') vi.mocked(getVideosFromRSS).mockRejectedValueOnce(new Error('retry'));
    else vi.mocked(completeYouTubeCollection).mockRejectedValueOnce(new Error('retry'));
    const message = data();
    await expect(service.handle(message)).rejects.toThrow('retry');
    await service.handle(message);
    expect(getVideosFromRSS).toHaveBeenCalledTimes(2);
    expect(releaseYouTubeSubscription).toHaveBeenCalledTimes(2);
  });

  it('rejects concurrent ownership without fetching', async () => {
    vi.mocked(claimYouTubeSubscription).mockRejectedValue(new Error('busy'));
    await expect(service.handle(data())).rejects.toThrow('busy');
    expect(getVideosFromRSS).not.toHaveBeenCalled();
  });

  it('rejects invalid video dates without advancing the cursor', async () => {
    vi.mocked(getVideosFromRSS).mockResolvedValue([{ ...video, publishedAt: 'bad' }] as never);
    await expect(service.handle(data())).rejects.toThrow('Malformed');
    expect(completeYouTubeCollection).not.toHaveBeenCalled();
  });

  it('aborts in-flight RSS, drains it, closes transport and rejects new work', async () => {
    let started: () => void;
    const ready = new Promise<void>((resolve) => {
      started = resolve;
    });
    vi.mocked(getVideosFromRSS).mockImplementation(async (_channel, signal) => {
      started();
      await new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }));
      return [];
    });
    const running = service.handle(data());
    const rejection = expect(running).rejects.toThrow('aborted');
    await ready;
    await service.close();
    await rejection;
    expect(queue.close).toHaveBeenCalledOnce();
    expect(completeYouTubeCollection).not.toHaveBeenCalled();
    await expect(service.handle(data())).rejects.toThrow('stopping');
    await expect(service.publish()).rejects.toThrow('stopping');
  });
});

describe('queued collection notifications', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.stubEnv('NOTIFIER_TELEGRAM_BOT_TOKEN', 'configured');
    vi.mocked(getActiveSubscriptions).mockResolvedValue([subscription] as never);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });
  const makeService = () => new YouTubeCollectionService({ publish: vi.fn().mockResolvedValue(undefined), close: vi.fn() });
  it('waits for durable processing rather than reporting enqueue success', async () => {
    vi.mocked(getYouTubeRunCompletions)
      .mockResolvedValueOnce([])
      .mockResolvedValue([{ newVideos: 2 }] as never);
    await makeService().publish();
    expect(notify).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(notify).toHaveBeenCalledOnce();
    expect(vi.mocked(notify).mock.calls[0][1].plainText).toContain('1/1 durably completed');
    expect(vi.mocked(notify).mock.calls[0][1].plainText).toContain('2 new videos');
  });
  it('reports unresolved retries honestly at the fifteen-minute bound', async () => {
    vi.mocked(getYouTubeRunCompletions).mockResolvedValue([]);
    await makeService().publish();
    await vi.advanceTimersByTimeAsync(15 * 60_000);
    expect(notify).toHaveBeenCalledOnce();
    expect(vi.mocked(notify).mock.calls[0][1].plainText).toContain('pending/incomplete (not confirmed DLQ exhaustion)');
  });
  it('distinguishes partial publish failures while waiting for successful publishes', async () => {
    vi.mocked(getActiveSubscriptions).mockResolvedValue([subscription, { ...subscription, _id: new ObjectId() }] as never);
    vi.mocked(getYouTubeRunCompletions).mockResolvedValue([{ newVideos: 0, skipped: true }] as never);
    const service = new YouTubeCollectionService({ publish: vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValue(undefined), close: vi.fn() });
    await expect(service.publish()).rejects.toThrow('Failed to publish 1');
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.mocked(notify).mock.calls[0][1].plainText).toContain('partial publish failure');
    expect(vi.mocked(notify).mock.calls[0][1].plainText).toContain('1 deleted/inactive skipped');
  });
  it('notifier exceptions never reject a successful publish or retry collection', async () => {
    vi.mocked(getActiveSubscriptions).mockResolvedValue([]);
    vi.mocked(notify).mockImplementation(() => {
      throw new Error('notification unavailable');
    });
    await expect(makeService().publish()).resolves.toBeUndefined();
    expect(notify).toHaveBeenCalledOnce();
  });
  it('reports monitoring failure as unknown, not success', async () => {
    vi.mocked(getYouTubeRunCompletions).mockRejectedValue(new Error('db unavailable'));
    await makeService().publish();
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.mocked(notify).mock.calls[0][1].plainText).toContain('completion unknown');
  });
  it('reports lookup failure without hiding the business error', async () => {
    vi.mocked(getActiveSubscriptions).mockRejectedValue(new Error('lookup failed'));
    await expect(makeService().publish()).rejects.toThrow('lookup failed');
    expect(vi.mocked(notify).mock.calls[0][1].plainText).toContain('subscription lookup failed');
  });
});
