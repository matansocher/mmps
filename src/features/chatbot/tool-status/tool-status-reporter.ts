import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import type { Serialized } from '@langchain/core/load/serializable';
import type { Api } from 'grammy';
import { getErrorMessage, Logger } from '@core/utils';
import { getToolStatusLabel, WRITING_STATUS_LABEL } from './tool-status-labels';

// Telegram allows roughly one message edit per second per chat; stay comfortably below it.
export const TOOL_STATUS_MIN_UPDATE_INTERVAL_MS = 1500;

export type ToolStatusApi = Pick<Api, 'sendMessage' | 'editMessageText' | 'deleteMessage' | 'sendChatAction'>;

// One instance per agent turn: shows a single status message that tracks running tools and is removed on dispose().
export class ToolStatusReporter extends BaseCallbackHandler {
  name = 'ToolStatusReporter';
  private readonly logger = new Logger('chatbot:tool-status');
  private readonly activeTools = new Map<string, string>();
  private hasStarted = false;
  private disposed = false;
  private messageId?: number;
  private lastText?: string;
  private lastSentAt = 0;
  private flushTimer?: ReturnType<typeof setTimeout>;
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly api: ToolStatusApi,
    private readonly chatId: number,
  ) {
    super();
  }

  handleToolStart(tool: Serialized, _input: string, runId: string, _parentRunId?: string, _tags?: string[], _metadata?: Record<string, unknown>, runName?: string): void {
    const label = getToolStatusLabel(runName ?? this.getToolName(tool));
    if (!label || this.disposed) return;
    this.activeTools.set(runId, label);
    this.hasStarted = true;
    this.scheduleFlush();
  }

  handleToolEnd(_output: unknown, runId: string): void {
    this.finishTool(runId);
  }

  handleToolError(_error: unknown, runId: string): void {
    this.finishTool(runId);
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }
    await this.queue;
    if (this.messageId) {
      await this.api.deleteMessage(this.chatId, this.messageId).catch(() => {});
      this.messageId = undefined;
    }
  }

  render(): string | undefined {
    if (!this.hasStarted) return undefined;
    if (this.activeTools.size === 0) return `${WRITING_STATUS_LABEL}…`;
    return `${[...new Set(this.activeTools.values())].join(' · ')}…`;
  }

  private finishTool(runId: string): void {
    if (!this.activeTools.delete(runId) || this.disposed) return;
    this.scheduleFlush();
  }

  // Coalesces bursts of tool events into at most one Telegram call per interval.
  private scheduleFlush(): void {
    if (this.flushTimer || this.disposed) return;
    const delay = Math.max(0, this.lastSentAt + TOOL_STATUS_MIN_UPDATE_INTERVAL_MS - Date.now());
    this.flushTimer = setTimeout(() => {
      this.flushTimer = undefined;
      this.queue = this.queue.then(() => this.send());
    }, delay);
  }

  private async send(): Promise<void> {
    const text = this.render();
    if (this.disposed || !text || text === this.lastText) return;
    this.lastSentAt = Date.now();
    this.lastText = text;
    try {
      if (this.messageId) {
        await this.api.editMessageText(this.chatId, this.messageId, text);
        return;
      }
      const { message_id } = await this.api.sendMessage(this.chatId, text);
      this.messageId = message_id;
      // Sending a message clears the typing indicator, so restore it.
      await this.api.sendChatAction(this.chatId, 'typing').catch(() => {});
    } catch (err) {
      this.logger.warn(`Failed to update tool status for chat ${this.chatId}: ${getErrorMessage(err)}`);
    }
  }

  private getToolName(tool: Serialized): string {
    if ('name' in tool && typeof tool.name === 'string') return tool.name;
    if (Array.isArray(tool.id) && tool.id.length > 0) return tool.id[tool.id.length - 1];
    return 'unknown';
  }
}
