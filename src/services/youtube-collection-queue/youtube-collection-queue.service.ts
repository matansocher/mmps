import { Duration, PubSub } from '@google-cloud/pubsub';
import type { Message, Subscription, Topic } from '@google-cloud/pubsub';
import { getErrorMessage, Logger } from '@core/utils';
import type { YouTubeQueueConfig } from './types';

const RPC_OPTIONS = { timeout: 5000, retry: { retryCodes: [] } };
const PACING_MS = 5000;
const SHUTDOWN_MS = 5000;

export class YouTubeCollectionQueue {
  private readonly logger = new Logger(YouTubeCollectionQueue.name);
  private readonly client: PubSub;
  private readonly topic: Topic;
  private readonly subscription: Subscription;
  private initialized = false;
  private starting = false;
  private closing = false;
  private closed = false;
  private inFlight?: Promise<void>;
  private closingPromise?: Promise<void>;
  private pacingTimer?: ReturnType<typeof setTimeout>;
  private finishPacing?: () => void;

  constructor(private readonly config: YouTubeQueueConfig) {
    this.client = new PubSub({ projectId: config.projectId, ...(config.credentials ? { credentials: config.credentials } : {}) });
    this.topic = this.client.topic(this.topicName(config.topicId), {
      batching: { maxMessages: 1, maxMilliseconds: 1 },
      gaxOpts: RPC_OPTIONS,
    });
    this.subscription = this.client.subscription(config.subscriptionId, {
      flowControl: { maxMessages: 1, allowExcessMessages: false, maxBytes: 1024 * 1024 },
      maxExtensionTime: Duration.from({ minutes: 2 }),
      closeOptions: { behavior: 'WAIT', timeout: Duration.from({ milliseconds: SHUTDOWN_MS }) },
      streamingOptions: { maxStreams: 1 },
    });
    this.subscription.on('error', (error: unknown) => {
      const code = error && typeof error === 'object' && 'code' in error && (typeof error.code === 'string' || typeof error.code === 'number') ? error.code : 'unknown';
      this.logger.error(`YouTube collection subscription error (code=${code}): ${getErrorMessage(error)}`);
    });
  }

  async init(handler: (data: Buffer) => Promise<void>): Promise<void> {
    if (this.closing || this.starting || this.initialized) throw new Error('YouTube collection queue cannot be initialized again');
    this.starting = true;
    try {
      const [topicMetadata] = await this.topic.getMetadata(RPC_OPTIONS);
      if (topicMetadata.ingestionDataSourceSettings || topicMetadata.messageTransforms?.length) {
        throw new Error('YouTube collection topic metadata must not configure ingestion or message transforms');
      }
      const [metadata] = await this.subscription.getMetadata(RPC_OPTIONS);
      if (
        metadata.topic !== this.topicName(this.config.topicId) ||
        metadata.pushConfig?.pushEndpoint ||
        metadata.bigqueryConfig ||
        metadata.cloudStorageConfig ||
        metadata.messageTransforms?.length ||
        metadata.deadLetterPolicy?.deadLetterTopic !== this.topicName(this.config.deadLetterTopicId) ||
        metadata.deadLetterPolicy?.maxDeliveryAttempts !== 10 ||
        Number(metadata.retryPolicy?.minimumBackoff?.seconds) !== 10 ||
        Number(metadata.retryPolicy?.minimumBackoff?.nanos ?? 0) !== 0 ||
        Number(metadata.retryPolicy?.maximumBackoff?.seconds) !== 300 ||
        Number(metadata.retryPolicy?.maximumBackoff?.nanos ?? 0) !== 0 ||
        metadata.filter ||
        metadata.enableMessageOrdering ||
        metadata.enableExactlyOnceDelivery ||
        Number(metadata.messageRetentionDuration?.seconds) !== 604800 ||
        Number(metadata.messageRetentionDuration?.nanos ?? 0) !== 0 ||
        metadata.ackDeadlineSeconds !== 60
      ) {
        throw new Error('YouTube collection subscription metadata does not match the required queue policy');
      }
      if (this.closing) throw new Error('YouTube collection queue is closing');
      this.initialized = true;
      this.subscription.on('message', (message: Message) => {
        if (this.closing || this.inFlight) {
          message.nack();
          return;
        }
        this.inFlight = this.processMessage(message, handler);
      });
    } catch (error) {
      await this.close();
      throw error;
    }
  }

  async publish(data: object): Promise<void> {
    if (!this.initialized || this.closing) throw new Error('YouTube collection queue is not ready');
    await this.topic.publishMessage({ data: Buffer.from(JSON.stringify(data)) });
  }

  async close(): Promise<void> {
    if (!this.closingPromise) {
      this.closing = true;
      this.finishPacing?.();
      this.closingPromise = this.closeResources();
    }
    await this.closingPromise;
  }

  private topicName(id: string): string {
    return id.startsWith('projects/') ? id : `projects/${this.config.projectId}/topics/${id}`;
  }

  private async processMessage(message: Message, handler: (data: Buffer) => Promise<void>): Promise<void> {
    let succeeded = false;
    try {
      await handler(message.data);
      succeeded = true;
    } catch (error) {
      this.logger.error(`YouTube collection message handler failed (id=${message.id}, deliveryAttempt=${message.deliveryAttempt}); message will be retried: ${getErrorMessage(error)}`);
    }
    try {
      // Keep the message leased during pacing so SDK flow control includes the delay.
      if (!this.closing) {
        await new Promise<void>((resolve) => {
          this.finishPacing = resolve;
          this.pacingTimer = setTimeout(resolve, PACING_MS);
        });
      }
      if (!this.closed) {
        if (succeeded) message.ack();
        else message.nack();
      }
    } catch (error) {
      this.logger.error(`YouTube collection message acknowledgement failed (id=${message.id}, deliveryAttempt=${message.deliveryAttempt}): ${getErrorMessage(error)}`);
    } finally {
      clearTimeout(this.pacingTimer);
      this.pacingTimer = undefined;
      this.finishPacing = undefined;
      this.inFlight = undefined;
    }
  }

  private async closeResources(): Promise<void> {
    let timer: ReturnType<typeof setTimeout>;
    try {
      const stopSubscription = this.subscription.close().catch(() => this.logger.error('Failed to close YouTube collection subscription'));
      await Promise.race([
        Promise.all([stopSubscription, this.inFlight]),
        new Promise<void>((resolve) => {
          timer = setTimeout(resolve, SHUTDOWN_MS);
        }),
      ]);
    } finally {
      clearTimeout(timer);
      this.closed = true;
      await this.client.close().catch(() => this.logger.error('Failed to close YouTube collection Pub/Sub client'));
    }
  }
}
