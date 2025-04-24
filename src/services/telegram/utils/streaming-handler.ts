export class StreamingHandler {
  private readonly updateIntervalMs: number = 2000;

  private timer?: NodeJS.Timeout;
  private isFirstUpdate: boolean = true;
  private accumulatedContent: string = '';
  private lastSentContent: string = '';
  private pendingUpdate: Promise<void> | null = null;

  private onUpdate?: (content: string, isFirstUpdate: boolean) => Promise<void>;

  constructor() {
    this.start = this.start.bind(this);
    this.stop = this.stop.bind(this);
  }

  start(onUpdate: (content: string, isFirstUpdate: boolean) => Promise<void>): (message: string) => void {
    this.onUpdate = onUpdate;
    this.timer = setInterval(async () => {
      if (!this.accumulatedContent || this.accumulatedContent === this.lastSentContent) {
        return;
      }
      try {
        this.pendingUpdate = onUpdate(this.accumulatedContent, this.isFirstUpdate);
        await this.pendingUpdate;
        this.lastSentContent = this.accumulatedContent;
        this.isFirstUpdate = false;
      } catch (error) {
      } finally {
        this.pendingUpdate = null;
      }
    }, this.updateIntervalMs);

    return (message: string) => {
      this.accumulatedContent = message;
    };
  }

  async stop(): Promise<void> {
    if (this.pendingUpdate) {
      await this.pendingUpdate;
    }

    if (this.accumulatedContent && this.accumulatedContent !== this.lastSentContent && this.onUpdate) {
      try {
        await this.onUpdate(this.accumulatedContent, this.isFirstUpdate);
        this.lastSentContent = this.accumulatedContent;
      } catch (error) {}
    }

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }
}
