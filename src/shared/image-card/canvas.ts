import { createCanvas } from 'canvas';
import type { Canvas, CanvasRenderingContext2D } from 'canvas';
import { COLORS } from './colors';
import { ensureFont } from './font';

export const IMAGE_SCALE = 2;

export type ScaledCanvas = {
  readonly canvas: Canvas;
  readonly ctx: CanvasRenderingContext2D;
};

// Width/height are in logical pixels; the backing canvas is IMAGE_SCALE times larger for crisp text on retina screens.
export function createScaledCanvas(width: number, height: number, background: string = COLORS.background): ScaledCanvas {
  ensureFont();
  const canvas = createCanvas(width * IMAGE_SCALE, height * IMAGE_SCALE);
  const ctx = canvas.getContext('2d');
  ctx.scale(IMAGE_SCALE, IMAGE_SCALE);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  return { canvas, ctx };
}
