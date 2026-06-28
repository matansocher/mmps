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
type Slot = { flagCx: number; nameX: number; cy: number; size: number };

function r16Slot(gnum: number, slot: number): Slot {
  const left = gnum <= 4;
  const box = left ? gnum : gnum - 4;
  const vsX = left ? R16.vsX.L : R16.vsX.R;
  const cy = R16.ys[box - 1] + (slot ? R16.off : -R16.off);
  return { flagCx: left ? vsX - R16.flagDx : vsX + R16.flagDx, nameX: left ? vsX + R16.nameDx : vsX - R16.nameDx, cy, size: 20 };
}

function qfSlot(gnum: number, slot: number): Slot {
  const left = gnum <= 2;
  const box = left ? gnum : gnum - 2;
  const x = left ? QF.x.L : QF.x.R;
  const cy = QF.boxCy[box - 1] + (slot ? QF.off : -QF.off);
  return { flagCx: left ? x - QF.flagDx : x + QF.flagDx, nameX: left ? x + QF.nameDx : x - QF.nameDx, cy, size: 16 };
}

function sfSlot(gnum: number, slot: number): Slot {
  const left = gnum <= 1;
  const x = left ? SF.x.L : SF.x.R;
  const cy = SF.boxCy + (slot ? SF.off : -SF.off);
  return { flagCx: left ? x - SF.flagDx : x + SF.flagDx, nameX: left ? x + SF.nameDx : x - SF.nameDx, cy, size: 15 };
}

function finalSlot(_gnum: number, slot: number): Slot {
  const cy = FINAL.ys[slot]; // slot 0 = top box (left finalist), 1 = bottom box (right finalist)
  return { flagCx: FINAL.x - FINAL.flagDx, nameX: FINAL.x + FINAL.nameDx, cy, size: 18 };
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

function drawName(ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>, text: string, x: number, y: number, size: number): void {
  ctx.font = `bold ${size}px ${FONT_FAMILY}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'right';
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
    drawFlag(ctx, base, src, slot.flagCx, slot.cy, slot.size + 20);
    drawName(ctx, p.name, slot.nameX, slot.cy, slot.size);
  }

  await mkdir(OUTPUT_DIR, { recursive: true });
  const outPath = path.join(OUTPUT_DIR, `wc-tree-${Date.now()}.png`);
  await writeFile(outPath, canvas.toBuffer('image/png'));
  return outPath;
}
