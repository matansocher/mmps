import express, { type Express, type Request, type Response } from 'express';
import path from 'node:path';
import { Logger } from '@core/utils';
import { notify } from '@services/notifier';
import { BOT_CONFIG } from './clutch.config';
import { CLUTCH_EVENTS, type ClutchEvent } from './types';

const logger = new Logger('clutch.init');

// Serves the Clutch SPA and exposes a lightweight analytics endpoint that
// forwards front-end events to the Telegram notifier.
export function initClutch(app: Express): void {
  const clutchDist = path.resolve('apps/clutch-web/dist');

  app.post('/clutch/api/events', (req: Request, res: Response) => {
    // Respond immediately — analytics must never block or slow the client.
    res.status(204).end();
    handleEvent(req.body as ClutchEvent);
  });

  app.use('/clutch', express.static(clutchDist));
  app.get('/clutch/*splat', (_req: Request, res: Response) => {
    res.sendFile(path.join(clutchDist, 'index.html'));
  });

  logger.log(`Clutch SPA served from ${clutchDist} at /clutch/* (events at POST /clutch/api/events)`);
}

function handleEvent(body: ClutchEvent | undefined): void {
  const event = body?.event;
  if (!event || !CLUTCH_EVENTS.has(event)) return;
  try {
    const data = body?.data && typeof body.data === 'object' ? body.data : {};
    notify(BOT_CONFIG, { action: `clutch ${event}`, uid: body?.uid ?? 'anon', ...data });
  } catch (err) {
    logger.error(`Failed to forward clutch event: ${err}`);
  }
}
