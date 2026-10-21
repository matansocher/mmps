import { registerFont } from 'canvas';
import path from 'node:path';

const FONT_FAMILY = 'MMPS Hebrew';
const FONT_PATH = path.resolve(process.cwd(), 'assets/fonts/NotoSansHebrew-Bold.ttf');

let fontRegistered = false;

// Must run before any canvas is created, otherwise the font is ignored for that canvas.
export function ensureFont(): void {
  if (fontRegistered) return;
  registerFont(FONT_PATH, { family: FONT_FAMILY, weight: 'bold' });
  fontRegistered = true;
}

export function font(size: number): string {
  return `bold ${size}px "${FONT_FAMILY}", sans-serif`;
}
