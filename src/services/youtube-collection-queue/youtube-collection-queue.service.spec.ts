import { PubSub } from '@google-cloud/pubsub';
import { EventEmitter } from 'node:events';
import { readYouTubeQueueConfig } from './config';
import type { YouTubeQueueConfig } from './types';
import { YouTubeCollectionQueue } from './youtube-collection-queue.service';

const mocks = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock('@core/utils', () => ({
  getErrorMessage: (error: unknown) => (error instanceof Error ? error.message : String(error)),
  Logger: class {
    error = mocks.error;
  },
}));
vi.mock('@google-cloud/pubsub', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@google-cloud/pubsub')>();
  return { ...actual, PubSub: vi.fn() };
});

function deferred() {
  let resolve: () => void;
  let reject: (error: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function validMetadata() {
  return {
    topic: 'projects/pilot-project/topics/social-media-collection-jobs',
    pushConfig: {},
    deadLetterPolicy: { deadLetterTopic: 'projects/pilot-project/topics/social-media-collection-jobs-dlq', maxDeliveryAttempts: 10 },
    retryPolicy: { minimumBackoff: { seconds: '10' }, maximumBackoff: { seconds: '300' } },
    filter: '',
    enableMessageOrdering: false,
    enableExactlyOnceDelivery: false,
    messageRetentionDuration: { seconds: '604800' },
    ackDeadlineSeconds: 60,
  };
}

function message(data = '{"channelId":"test"}') {
  return { id: 'test-message-id', deliveryAttempt: 3, data: Buffer.from(data), ack: vi.fn(), nack: vi.fn() };
}

describe('YouTubeCollectionQueue', () => {
  let config: YouTubeQueueConfig;
  let subscription: EventEmitter & { getMetadata: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> };
  let topic: { getMetadata: ReturnType<typeof vi.fn>; publishMessage: ReturnType<typeof vi.fn> };
  let client: { topic: ReturnType<typeof vi.fn>; subscription: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> };
  let queue: YouTubeCollectionQueue;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    config = readYouTubeQueueConfig({ SOCIAL_MEDIA_COLLECTION_MODE: 'pubsub', SOCIAL_MEDIA_PUBSUB_PROJECT_ID: 'pilot-project' });
    subscription = Object.assign(new EventEmitter(), { getMetadata: vi.fn().mockResolvedValue([validMetadata()]), close: vi.fn().mockResolvedValue(undefined) });
    topic = { getMetadata: vi.fn().mockResolvedValue([{}]), publishMessage: vi.fn().mockResolvedValue('message-id') };
    client = { topic: vi.fn().mockReturnValue(topic), subscription: vi.fn().mockReturnValue(subscription), close: vi.fn().mockResolvedValue(undefined) };
    vi.mocked(PubSub).mockImplementation(function () {
      return client as unknown as PubSub;
    });
    queue = new YouTubeCollectionQueue(config);
  });

  afterEach(async () => {
    await queue.close();
    vi.useRealTimers();
  });

  test('uses bounded SDK settings and only named topic/subscription metadata reads', async () => {
    await queue.init(vi.fn());
    expect(PubSub).toHaveBeenCalledWith({ projectId: 'pilot-project' });
    expect(client.topic).toHaveBeenCalledExactlyOnceWith('projects/pilot-project/topics/social-media-collection-jobs', {
      batching: { maxMessages: 1, maxMilliseconds: 1 },
      gaxOpts: { timeout: 5000, retry: { retryCodes: [] } },
    });
    const options = client.subscription.mock.calls[0][1];
    expect(client.subscription.mock.calls[0][0]).toEqual('social-media-collection-worker');
    expect(options.flowControl).toEqual({ maxMessages: 1, allowExcessMessages: false, maxBytes: 1024 * 1024 });
    expect(options.maxExtensionTime.totalOf('second')).toEqual(120);
    expect(options.closeOptions.timeout.totalOf('second')).toEqual(5);
    expect(options.streamingOptions).toEqual({ maxStreams: 1 });
    expect(topic.getMetadata).toHaveBeenCalledExactlyOnceWith({ timeout: 5000, retry: { retryCodes: [] } });
    expect(subscription.getMetadata).toHaveBeenCalledExactlyOnceWith({ timeout: 5000, retry: { retryCodes: [] } });
  });

  test('passes only explicit credentials to the client', async () => {
    await queue.close();
    const credentials = { client_email: 'test@example.invalid', private_key: 'not-a-real-key' };
    queue = new YouTubeCollectionQueue({ ...config, credentials });
    expect(PubSub).toHaveBeenLastCalledWith({ projectId: 'pilot-project', credentials });
  });

  test('supports fully qualified configured topic names', async () => {
    await queue.close();
    queue = new YouTubeCollectionQueue({ ...config, topicId: validMetadata().topic, deadLetterTopicId: validMetadata().deadLetterPolicy.deadLetterTopic });
    await queue.init(vi.fn());
    expect(client.topic).toHaveBeenLastCalledWith(validMetadata().topic, expect.any(Object));
  });

  test.each([
    { topic: 'projects/other/topics/social-media-collection-jobs' },
    { pushConfig: { pushEndpoint: 'https://example.invalid' } },
    { bigqueryConfig: { table: 'project.dataset.table' } },
    { cloudStorageConfig: { bucket: 'pilot-bucket' } },
    { messageTransforms: [{ javascriptUdf: { functionName: 'transform', code: 'function transform(m) { return m; }' } }] },
    { deadLetterPolicy: undefined },
    { deadLetterPolicy: { deadLetterTopic: 'projects/pilot-project/topics/wrong', maxDeliveryAttempts: 10 } },
    { deadLetterPolicy: { deadLetterTopic: validMetadata().deadLetterPolicy.deadLetterTopic, maxDeliveryAttempts: 5 } },
    { retryPolicy: undefined },
    { retryPolicy: { minimumBackoff: { seconds: '11' }, maximumBackoff: { seconds: '300' } } },
    { retryPolicy: { minimumBackoff: { seconds: '10' }, maximumBackoff: { seconds: '301' } } },
    { retryPolicy: { minimumBackoff: { seconds: '10', nanos: 1 }, maximumBackoff: { seconds: '300' } } },
    { filter: 'attributes.source="youtube"' },
    { enableMessageOrdering: true },
    { enableExactlyOnceDelivery: true },
    { messageRetentionDuration: { seconds: '86400' } },
    { messageRetentionDuration: { seconds: '604800', nanos: 1 } },
    { ackDeadlineSeconds: 30 },
  ])('rejects mismatched metadata and closes all resources: case %#', async (override) => {
    subscription.getMetadata.mockResolvedValue([{ ...validMetadata(), ...override }]);
    await expect(queue.init(vi.fn())).rejects.toThrow('metadata');
    expect(subscription.listenerCount('message')).toEqual(0);
    expect(subscription.close).toHaveBeenCalledOnce();
    expect(client.close).toHaveBeenCalledOnce();
  });

  test.each([
    { ingestionDataSourceSettings: { awsKinesis: { streamArn: 'test-stream' } } },
    { messageTransforms: [{ javascriptUdf: { functionName: 'transform', code: 'function transform(m) { return m; }' } }] },
  ])('rejects topic ingestion/transforms and closes resources: case %#', async (metadata) => {
    topic.getMetadata.mockResolvedValue([metadata]);
    await expect(queue.init(vi.fn())).rejects.toThrow('topic metadata');
    expect(subscription.listenerCount('message')).toEqual(0);
    expect(subscription.close).toHaveBeenCalledOnce();
    expect(client.close).toHaveBeenCalledOnce();
  });

  test('accepts empty transforms arrays and unset export configs', async () => {
    topic.getMetadata.mockResolvedValue([{ ingestionDataSourceSettings: null, messageTransforms: [] }]);
    subscription.getMetadata.mockResolvedValue([{ ...validMetadata(), messageTransforms: [], bigqueryConfig: null, cloudStorageConfig: null }]);
    await queue.init(vi.fn());
  });

  test.each(['topic', 'subscription'])('cleans up if %s metadata is inaccessible', async (resource) => {
    (resource === 'topic' ? topic : subscription).getMetadata.mockRejectedValue(new Error('permission denied'));
    await expect(queue.init(vi.fn())).rejects.toThrow('permission denied');
    expect(subscription.close).toHaveBeenCalledOnce();
    expect(client.close).toHaveBeenCalledOnce();
  });

  test('acks only a resolved handler and holds flow control through five seconds of pacing', async () => {
    const work = deferred();
    const handler = vi.fn().mockReturnValue(work.promise);
    await queue.init(handler);
    const first = message();
    subscription.emit('message', first);
    expect(handler).toHaveBeenCalledExactlyOnceWith(first.data);
    await vi.advanceTimersByTimeAsync(6000);
    expect(first.ack).not.toHaveBeenCalled();
    work.resolve();
    await vi.advanceTimersByTimeAsync(4999);
    expect(first.ack).not.toHaveBeenCalled();
    const unexpected = message();
    subscription.emit('message', unexpected);
    expect(handler).toHaveBeenCalledOnce();
    expect(unexpected.nack).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);
    expect(first.ack).toHaveBeenCalledOnce();
    expect(first.nack).not.toHaveBeenCalled();
    subscription.emit('message', message());
    expect(handler).toHaveBeenCalledTimes(2);
  });

  test.each(['async rejection', 'sync rejection', 'malformed JSON'])('nacks %s after pacing instead of acking poison', async (failure) => {
    const handler = vi.fn((data: Buffer) => {
      if (failure === 'malformed JSON') JSON.parse(data.toString());
      if (failure === 'sync rejection') throw new Error('failed');
      return Promise.reject(new Error('failed'));
    });
    await queue.init(handler);
    const poison = message('not-json');
    subscription.emit('message', poison);
    await vi.advanceTimersByTimeAsync(4999);
    expect(poison.nack).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(poison.nack).toHaveBeenCalledOnce();
    expect(poison.ack).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining('id=test-message-id, deliveryAttempt=3'));
    if (failure !== 'malformed JSON') expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining('message will be retried: failed'));
    subscription.emit('message', message());
    expect(handler).toHaveBeenCalledTimes(2);
  });

  test('publishes JSON data and propagates bounded SDK errors', async () => {
    await expect(queue.publish({ id: 1 })).rejects.toThrow('not ready');
    await queue.init(vi.fn());
    await queue.publish({ id: 1 });
    expect(topic.publishMessage).toHaveBeenCalledExactlyOnceWith({ data: Buffer.from('{"id":1}') });
    topic.publishMessage.mockRejectedValue(new Error('unavailable'));
    await expect(queue.publish({ id: 2 })).rejects.toThrow('unavailable');
  });

  test('logs subscription error code and message without an unhandled rejection', async () => {
    await queue.init(vi.fn());
    const error = Object.assign(new Error('subscription unavailable'), { code: 14, details: 'do not dump the whole error' });
    expect(() => subscription.emit('error', error)).not.toThrow();
    expect(mocks.error).toHaveBeenCalledExactlyOnceWith('YouTube collection subscription error (code=14): subscription unavailable');
  });

  test('logs subscription errors without a code', async () => {
    await queue.init(vi.fn());
    expect(() => subscription.emit('error', new Error('stream failed'))).not.toThrow();
    expect(mocks.error).toHaveBeenCalledExactlyOnceWith('YouTube collection subscription error (code=unknown): stream failed');
  });

  test('waits for in-flight work, stops accepting, skips pacing, and closes idempotently', async () => {
    const work = deferred();
    const handler = vi.fn().mockReturnValue(work.promise);
    await queue.init(handler);
    const first = message();
    subscription.emit('message', first);
    const closing = queue.close();
    const late = message();
    subscription.emit('message', late);
    expect(late.nack).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledOnce();
    expect(subscription.close).toHaveBeenCalledOnce();
    expect(client.close).not.toHaveBeenCalled();
    await expect(queue.publish({})).rejects.toThrow('not ready');
    work.resolve();
    await closing;
    await queue.close();
    expect(first.ack).toHaveBeenCalledOnce();
    expect(client.close).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toEqual(0);
  });

  test('cancels pacing immediately when closing', async () => {
    await queue.init(vi.fn().mockResolvedValue(undefined));
    const first = message();
    subscription.emit('message', first);
    await vi.advanceTimersByTimeAsync(100);
    await queue.close();
    expect(first.ack).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toEqual(0);
  });

  test('bounds shutdown with a stuck handler and does not ack after client close', async () => {
    const work = deferred();
    await queue.init(vi.fn().mockReturnValue(work.promise));
    const first = message();
    subscription.emit('message', first);
    let finished = false;
    const closing = (async () => {
      await queue.close();
      finished = true;
    })();
    await vi.advanceTimersByTimeAsync(4999);
    expect(finished).toEqual(false);
    await vi.advanceTimersByTimeAsync(1);
    await closing;
    expect(client.close).toHaveBeenCalledOnce();
    work.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(first.ack).not.toHaveBeenCalled();
    expect(first.nack).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toEqual(0);
  });

  test('bounds shutdown if subscription.close stalls', async () => {
    subscription.close.mockReturnValue(new Promise(() => {}));
    const closing = queue.close();
    await vi.advanceTimersByTimeAsync(5000);
    await closing;
    expect(client.close).toHaveBeenCalledOnce();
  });

  test('still closes the client after subscription.close rejects', async () => {
    subscription.close.mockRejectedValue(new Error('close failed'));
    client.close.mockRejectedValue(new Error('client close failed'));
    await queue.close();
    expect(client.close).toHaveBeenCalledOnce();
    expect(mocks.error).toHaveBeenCalledTimes(2);
  });

  test('rejects repeated init and init after close', async () => {
    await queue.init(vi.fn());
    await expect(queue.init(vi.fn())).rejects.toThrow('initialized again');
    await queue.close();
    await expect(queue.init(vi.fn())).rejects.toThrow('initialized again');
  });

  test('does not start streaming if closed during metadata validation', async () => {
    const metadataReady = deferred();
    topic.getMetadata.mockImplementation(async () => {
      await metadataReady.promise;
      return [{}];
    });
    const initialized = queue.init(vi.fn());
    const expectation = expect(initialized).rejects.toThrow('closing');
    await queue.close();
    metadataReady.resolve();
    await expectation;
    expect(subscription.listenerCount('message')).toEqual(0);
  });
});
