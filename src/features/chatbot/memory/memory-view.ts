import { InlineKeyboard } from 'grammy';
import type { Memory } from '@shared/memories';

export const MEMORY_CALLBACK_PREFIX = 'mem:';
export const MEMORY_PAGE_SIZE = 10;
const MAX_FACT_DISPLAY_CHARS = 300;

export type MemoryCallback =
  | { readonly action: 'page'; readonly page: number }
  | { readonly action: 'delete'; readonly memoryId: string; readonly page: number }
  | { readonly action: 'edit'; readonly memoryId: string }
  | { readonly action: 'cancel_edit' }
  | { readonly action: 'clear' }
  | { readonly action: 'clear_confirm' };

// Format: "mem:p:<page>" | "mem:d:<id>:<page>" | "mem:e:<id>" | "mem:x" | "mem:c" | "mem:cy" (stays under Telegram's 64-byte limit)
export const memoryCallback = {
  page: (page: number) => `${MEMORY_CALLBACK_PREFIX}p:${page}`,
  delete: (memoryId: string, page: number) => `${MEMORY_CALLBACK_PREFIX}d:${memoryId}:${page}`,
  edit: (memoryId: string) => `${MEMORY_CALLBACK_PREFIX}e:${memoryId}`,
  cancelEdit: () => `${MEMORY_CALLBACK_PREFIX}x`,
  clear: () => `${MEMORY_CALLBACK_PREFIX}c`,
  clearConfirm: () => `${MEMORY_CALLBACK_PREFIX}cy`,
};

export function parseMemoryCallbackData(data: string): MemoryCallback | null {
  if (!data?.startsWith(MEMORY_CALLBACK_PREFIX)) return null;
  const [kind, id, page] = data.slice(MEMORY_CALLBACK_PREFIX.length).split(':');
  switch (kind) {
    case 'p':
      return { action: 'page', page: toPage(id) };
    case 'd':
      return id ? { action: 'delete', memoryId: id, page: toPage(page) } : null;
    case 'e':
      return id ? { action: 'edit', memoryId: id } : null;
    case 'x':
      return { action: 'cancel_edit' };
    case 'c':
      return { action: 'clear' };
    case 'cy':
      return { action: 'clear_confirm' };
    default:
      return null;
  }
}

function toPage(value: string | undefined): number {
  const page = Number.parseInt(value ?? '0', 10);
  return Number.isFinite(page) && page > 0 ? page : 0;
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export type MemoryView = {
  readonly text: string;
  readonly keyboard?: InlineKeyboard;
  readonly page: number;
};

// `memories` is the full list (newest first); the requested page is clamped to the valid range.
export function buildMemoryView(memories: readonly Memory[], requestedPage: number): MemoryView {
  if (!memories.length) {
    return { text: '🧠 I don\'t remember anything about you yet.\n\nTell me facts in chat (e.g. "my wife is vegetarian") and I\'ll keep them here.', page: 0 };
  }

  const totalPages = Math.ceil(memories.length / MEMORY_PAGE_SIZE);
  const page = Math.min(Math.max(requestedPage, 0), totalPages - 1);
  const start = page * MEMORY_PAGE_SIZE;
  const pageMemories = memories.slice(start, start + MEMORY_PAGE_SIZE);

  const header = `🧠 What I remember (${memories.length})${totalPages > 1 ? ` · page ${page + 1}/${totalPages}` : ''}`;
  const lines = pageMemories.map((memory, i) => `${start + i + 1}. ${truncate(memory.content, MAX_FACT_DISPLAY_CHARS)}`);

  const keyboard = new InlineKeyboard();
  pageMemories.forEach((memory, i) => {
    const id = memory._id.toHexString();
    keyboard
      .text(`✏️ ${start + i + 1}`, memoryCallback.edit(id))
      .text(`🗑 ${start + i + 1}`, memoryCallback.delete(id, page))
      .row();
  });
  if (totalPages > 1) {
    if (page > 0) keyboard.text('◀️ Prev', memoryCallback.page(page - 1));
    if (page < totalPages - 1) keyboard.text('Next ▶️', memoryCallback.page(page + 1));
    keyboard.row();
  }
  keyboard.text('🧹 Clear all', memoryCallback.clear());

  return { text: `${header}\n\n${lines.join('\n')}`, keyboard, page };
}

export function buildClearConfirmKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text('⚠️ Yes, forget everything', memoryCallback.clearConfirm()).text('Cancel', memoryCallback.page(0));
}

export function buildCancelEditKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text('Cancel', memoryCallback.cancelEdit());
}
