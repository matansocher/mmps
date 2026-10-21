import { ObjectId } from 'mongodb';
import { describe, expect, it } from 'vitest';
import type { Memory } from './types';
import { formatMemoriesForPrompt, MEMORY_PROMPT_HEADER } from './utils';

const makeMemory = (content: string): Memory => ({ _id: new ObjectId(), chatId: 1, content, createdAt: new Date(), updatedAt: new Date() });

describe('formatMemoriesForPrompt()', () => {
  it('should return an empty string when there are no memories', () => {
    expect(formatMemoriesForPrompt([], 1000)).toEqual('');
  });

  it('should list memories under the header with their ids', () => {
    const memories = [makeMemory('Wife is vegetarian'), makeMemory('Lives in Tel Aviv')];
    expect(formatMemoriesForPrompt(memories, 1000)).toEqual(`${MEMORY_PROMPT_HEADER}\n- [${memories[0]._id.toHexString()}] Wife is vegetarian\n- [${memories[1]._id.toHexString()}] Lives in Tel Aviv`);
  });

  it('should drop the oldest memories once maxChars is reached', () => {
    const memories = [makeMemory('newest'), makeMemory('oldest')];
    const firstLine = `- [${memories[0]._id.toHexString()}] newest`;
    const result = formatMemoriesForPrompt(memories, MEMORY_PROMPT_HEADER.length + firstLine.length + 1);
    expect(result).toEqual(`${MEMORY_PROMPT_HEADER}\n${firstLine}`);
  });

  it('should return an empty string when not even one memory fits', () => {
    expect(formatMemoriesForPrompt([makeMemory('fact')], 10)).toEqual('');
  });
});
