import { ObjectId } from 'mongodb';
import { describe, expect, it, test } from 'vitest';
import type { Memory } from '@shared/memories';
import { buildMemoryView, MEMORY_PAGE_SIZE, memoryCallback, parseMemoryCallbackData } from './memory-view';

const makeMemories = (count: number): Memory[] => Array.from({ length: count }, (_, i) => ({ _id: new ObjectId(), chatId: 1, content: `fact ${i + 1}`, createdAt: new Date(), updatedAt: new Date() }));

const callbackData = (view: ReturnType<typeof buildMemoryView>): string[] => view.keyboard.inline_keyboard.flat().map((button) => (button as { callback_data: string }).callback_data);

describe('parseMemoryCallbackData()', () => {
  const id = new ObjectId().toHexString();

  test.each([
    { data: memoryCallback.page(2), expected: { action: 'page', page: 2 } },
    { data: memoryCallback.delete(id, 1), expected: { action: 'delete', memoryId: id, page: 1 } },
    { data: memoryCallback.edit(id), expected: { action: 'edit', memoryId: id } },
    { data: memoryCallback.cancelEdit(), expected: { action: 'cancel_edit' } },
    { data: memoryCallback.clear(), expected: { action: 'clear' } },
    { data: memoryCallback.clearConfirm(), expected: { action: 'clear_confirm' } },
    { data: 'mem:p:-3', expected: { action: 'page', page: 0 } },
    { data: 'mem:e:', expected: null },
    { data: 'mem:zz', expected: null },
    { data: 'action:x', expected: null },
  ])('should parse $data', ({ data, expected }) => {
    expect(parseMemoryCallbackData(data)).toEqual(expected);
  });

  it('should keep callback data within the 64-byte Telegram limit', () => {
    expect(Buffer.byteLength(memoryCallback.delete(id, 999))).toBeLessThanOrEqual(64);
  });
});

describe('buildMemoryView()', () => {
  it('should show an empty state without a keyboard', () => {
    const view = buildMemoryView([], 0);
    expect(view.keyboard).toBeUndefined();
    expect(view.text).toContain("don't remember anything");
  });

  it('should list facts with edit/delete buttons and clear all on a single page', () => {
    const memories = makeMemories(2);
    const view = buildMemoryView(memories, 0);
    expect(view.text).toEqual('🧠 What I remember (2)\n\n1. fact 1\n2. fact 2');
    expect(callbackData(view)).toEqual([
      memoryCallback.edit(memories[0]._id.toHexString()),
      memoryCallback.delete(memories[0]._id.toHexString(), 0),
      memoryCallback.edit(memories[1]._id.toHexString()),
      memoryCallback.delete(memories[1]._id.toHexString(), 0),
      memoryCallback.clear(),
    ]);
  });

  it('should paginate and clamp out-of-range pages', () => {
    const memories = makeMemories(MEMORY_PAGE_SIZE + 3);
    const view = buildMemoryView(memories, 5);
    expect(view.page).toEqual(1);
    expect(view.text).toContain('page 2/2');
    expect(view.text).toContain(`${MEMORY_PAGE_SIZE + 1}. fact ${MEMORY_PAGE_SIZE + 1}`);
    expect(callbackData(view)).toContain(memoryCallback.page(0));
    expect(callbackData(view)).not.toContain(memoryCallback.page(2));
  });
});
