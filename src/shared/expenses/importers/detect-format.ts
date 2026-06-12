import { detectDiscountMeta } from './discount-parser';
import { detectIsracardMeta } from './isracard-parser';
import type { FileMeta } from './types';

// Returns null when neither format matches — caller should report the file as not recognized.
export function detectFormat(buffer: Buffer, fileName: string): FileMeta | null {
  // Try Isracard first — its header marker is very specific and unlikely to false-positive.
  try {
    const isracard = detectIsracardMeta(buffer, fileName);
    if (isracard) return isracard;
  } catch {
    /* fall through */
  }
  try {
    const discount = detectDiscountMeta(buffer, fileName);
    if (discount) return discount;
  } catch {
    /* fall through */
  }
  return null;
}
