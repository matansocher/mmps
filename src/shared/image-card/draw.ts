import type { CanvasRenderingContext2D } from 'canvas';
import { COLORS } from './colors';
import { font } from './font';

export type TextAlign = 'left' | 'right';

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

// Draws a pill badge starting at `edgeX` and growing in the reading direction; returns the far edge.
export function drawBadge(ctx: CanvasRenderingContext2D, text: string, edgeX: number, centerY: number, bg: string, color: string, rtl: boolean): number {
  ctx.font = font(13);
  const width = ctx.measureText(text).width + 16;
  const height = 22;
  const x = rtl ? edgeX - width : edgeX;
  ctx.fillStyle = bg;
  roundRect(ctx, x, centerY - height / 2, width, height, height / 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + width / 2, centerY + 1);
  return rtl ? x : x + width;
}

// Draws vertically-centered text and returns the far edge (left edge for right-aligned text).
export function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string, align: TextAlign): number {
  ctx.font = font(size);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
  const width = ctx.measureText(text).width;
  return align === 'right' ? x - width : x + width;
}

export function drawDot(ctx: CanvasRenderingContext2D, x: number, y: number, fill: string, stroke: string, radius = 8): void {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

// Horizontal arrow pointing from `fromX` to `toX`.
export function drawArrow(ctx: CanvasRenderingContext2D, fromX: number, toX: number, y: number, color: string = COLORS.muted): void {
  const head = fromX < toX ? -7 : 7;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(fromX, y);
  ctx.lineTo(toX, y);
  ctx.moveTo(toX + head, y - 6);
  ctx.lineTo(toX, y);
  ctx.lineTo(toX + head, y + 6);
  ctx.stroke();
}
