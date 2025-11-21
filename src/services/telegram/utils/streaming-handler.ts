import { throttle } from '@core/utils';
import { TELEGRAM_MAX_MESSAGE_LENGTH } from '../constants';

type StreamCallback = (content: string) => Promise<void> | void;

const updateIntervalMs = 2000;

export class StreamingHandler {
  private content = '';
  private lastSentContent = '';
  private readonly onUpdate: StreamCallback;
  private readonly throttledUpdate: ReturnType<typeof throttle>;

  constructor(onUpdate: StreamCallback) {
    this.onUpdate = onUpdate;

    this.throttledUpdate = throttle(
      () => {
        if (this.content !== this.lastSentContent) {
          this.lastSentContent = this.content;
          const truncatedContent = this.content.slice(0, TELEGRAM_MAX_MESSAGE_LENGTH);
          this.onUpdate(truncatedContent);
        }
      },
      updateIntervalMs,
      { leading: true, trailing: true },
    );
  }

  addContent(newContent: string) {
    this.content = newContent;
    this.throttledUpdate();
  }

  async flushFinalContent() {
    this.throttledUpdate.cancel(); // Cancel any pending throttle
    if (this.content !== this.lastSentContent) {
      this.lastSentContent = this.content;
      const truncatedContent = this.content.slice(0, TELEGRAM_MAX_MESSAGE_LENGTH);
      await this.onUpdate(truncatedContent);
    }
  }
}
