import { createCanvas, type Image, loadImage, registerFont } from 'canvas';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Logger } from '@core/utils';
import { BASE_IMAGE_PATH, BUNDLED_HEBREW_FONT_PATH, FINAL, FLAG_SRC_SIZE, OUTPUT_DIR, QF, R16, R32_LEFT_FLAG_CX, R32_RIGHT_FLAG_CX, SF, SYSTEM_HEBREW_FONT_PATH } from './constants';
import type { WcPlacement, WcRound } from './types';

const logger = new Logger('WcTreeRenderer');

const FONT_FAMILY = 'WcHebrew';
let fontRegistered = false;

function ensureFont(): void {
  if (fontRegistered) {
    return;
  }
  const fontPath = existsSync(BUNDLED_HEBREW_FONT_PATH) ? BUNDLED_HEBREW_FONT_PATH : existsSync(SYSTEM_HEBREW_FONT_PATH) ? SYSTEM_HEBREW_FONT_PATH : undefined;
  if (fontPath) {
    registerFont(fontPath, { family: FONT_FAMILY });
  } else {
    logger.warn('No Hebrew font found — names may render incorrectly');
  }
  fontRegistered = true;
}

// ---------------------------------------------------------------------------
// Round-of-32 flag source rect — copy a team's clean circular flag from its
// pre-printed cell on the base image.
// ---------------------------------------------------------------------------
function r32FlagCenter(group: number, pos: number): { cx: number; cy: number } {
  const left = group <= 8;
  if (left) {
    const top = 205 + (group - 1) * 97.7;
    return { cx: R32_LEFT_FLAG_CX, cy: pos === 0 ? top : top + 41 };
  }
  const top = 208 + (group - 9) * 97.4;
  return { cx: R32_RIGHT_FLAG_CX, cy: pos === 0 ? top : top + 47 };
}

function flagSourceRect(group: number, pos: number): { x: number; y: number; w: number; h: number } {
  const { cx, cy } = r32FlagCenter(group, pos);
  const half = FLAG_SRC_SIZE / 2;
  return { x: Math.round(cx - half), y: Math.round(cy - half), w: FLAG_SRC_SIZE, h: FLAG_SRC_SIZE };
}

// ---------------------------------------------------------------------------
// Target slot geometry per round. Slots are addressed by 365scores image-group
// number (`gnum`) + participant index (`slot`, 0 = top, 1 = bottom):
//   R16   gnum 1-4 = left boxes 1-4, gnum 5-8 = right boxes 1-4
//   QF    gnum 1-2 = left boxes 1-2, gnum 3-4 = right boxes 1-2
//   SF    gnum 1   = left box,       gnum 2   = right box
//   FINAL gnum 1   = the final (slot 0 left finalist / slot 1 right finalist)
// ---------------------------------------------------------------------------
type Slot = { flagCx: number; cy: number; size: number; side: 'L' | 'R' };

function r16Slot(gnum: number, slot: number): Slot {
  const left = gnum <= 4;
  const box = left ? gnum : gnum - 4;
  const vsX = left ? R16.vsX.L : R16.vsX.R;
  const cy = R16.ys[box - 1] + (slot ? R16.offBot : -R16.offTop);
  return { flagCx: left ? vsX - R16.flagDx : vsX + R16.flagDx, cy, size: 20, side: left ? 'L' : 'R' };
}

function qfSlot(gnum: number, slot: number): Slot {
  const left = gnum <= 2;
  const box = left ? gnum : gnum - 2;
  const x = left ? QF.x.L : QF.x.R;
  const cy = QF.boxCy[box - 1] + (slot ? QF.off : -QF.off);
  return { flagCx: left ? x - QF.flagDx : x + QF.flagDx, cy, size: 16, side: left ? 'L' : 'R' };
}

function sfSlot(gnum: number, slot: number): Slot {
  const left = gnum <= 1;
  const x = left ? SF.x.L : SF.x.R;
  const cy = SF.boxCy + (slot ? SF.off : -SF.off);
  return { flagCx: left ? x - SF.flagDx : x + SF.flagDx, cy, size: 15, side: left ? 'L' : 'R' };
}

function finalSlot(_gnum: number, slot: number): Slot {
  const cy = FINAL.ys[slot]; // slot 0 = top box (left finalist), 1 = bottom box (right finalist)
  return { flagCx: FINAL.x - FINAL.flagDx, cy, size: 18, side: 'L' };
}

const ROUND_SLOT: Record<WcRound, (gnum: number, slot: number) => Slot> = { R16: r16Slot, QF: qfSlot, SF: sfSlot, FINAL: finalSlot };

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------
function drawFlag(ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>, base: Image, src: { x: number; y: number; w: number; h: number }, cx: number, cy: number, d: number): void {
  const r = d / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(base, src.x, src.y, src.w, src.h, cx - r, cy - r, d, d);
  ctx.restore();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(220,180,90,0.85)';
  ctx.stroke();
}

function drawName(ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>, text: string, x: number, y: number, size: number, align: 'left' | 'right'): void {
  ctx.font = `bold ${size}px ${FONT_FAMILY}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = align;
  ctx.direction = 'rtl';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, x, y);
}

export async function renderWcTree(placements: WcPlacement[]): Promise<string> {
  ensureFont();

  const base = await loadImage(BASE_IMAGE_PATH);
  const canvas = createCanvas(base.width, base.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(base, 0, 0);

  for (const p of placements) {
    const slotFn = ROUND_SLOT[p.round];
    if (!slotFn) {
      continue;
    }
    const slot = slotFn(p.gnum, p.slot);
    const src = flagSourceRect(p.group, p.pos);
    const diameter = slot.size + 20;
    drawFlag(ctx, base, src, slot.flagCx, slot.cy, diameter);
    // Anchor the name to the inner edge of the (correctly placed) flag so it always
    // sits next to the flag inside the box, mirrored on the right side of the bracket.
    const gap = diameter / 2 + 9;
    const nameX = slot.side === 'L' ? slot.flagCx + gap : slot.flagCx - gap;
    drawName(ctx, p.name, nameX, slot.cy, slot.size, slot.side === 'L' ? 'left' : 'right');
  }

  await mkdir(OUTPUT_DIR, { recursive: true });
  const outPath = path.join(OUTPUT_DIR, `wc-tree-${Date.now()}.png`);
  await writeFile(outPath, canvas.toBuffer('image/png'));
  return outPath;
}
