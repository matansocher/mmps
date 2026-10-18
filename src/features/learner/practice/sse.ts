import type { Response } from 'express';

export function openSseStream(res: Response): void {
  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Connection', 'keep-alive');
  // Disables proxy buffering (Heroku router / nginx) so deltas arrive as they're produced.
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
}

export function writeSseEvent(res: Response, event: string, data: unknown): void {
  if (res.writableEnded) return;
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}
