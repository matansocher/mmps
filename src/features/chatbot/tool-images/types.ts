import type { ToolResult } from '../types';

export type ToolImageBuilder = {
  readonly toolName: string;
  readonly fileName: string;
  // Receives only this tool's successful results from the turn; return null to skip the image.
  readonly build: (toolResults: readonly ToolResult[], replyText: string) => Buffer | null | Promise<Buffer | null>;
};

export type ToolImage = {
  readonly fileName: string;
  readonly image: Buffer;
};
