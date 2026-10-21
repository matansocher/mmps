import type { Memory } from './types';

export const MEMORY_PROMPT_HEADER =
  'Long-term memory — durable facts the user shared in earlier conversations (newest first). Use them to personalize answers; they may be outdated, so trust newer information from the user:';

// Builds the system prompt block from memories (expected newest first), dropping the oldest once maxChars is reached.
export function formatMemoriesForPrompt(memories: readonly Memory[], maxChars: number): string {
  if (!memories.length) return '';
  const lines: string[] = [];
  let length = MEMORY_PROMPT_HEADER.length;
  for (const memory of memories) {
    const line = `- [${memory._id.toHexString()}] ${memory.content}`;
    if (length + line.length + 1 > maxChars) break;
    lines.push(line);
    length += line.length + 1;
  }
  return lines.length ? `${MEMORY_PROMPT_HEADER}\n${lines.join('\n')}` : '';
}
