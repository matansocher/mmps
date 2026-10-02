import type { Express, Request, Response } from 'express';
import { env } from 'node:process';
import { EARTH_API_PREFIX } from '../constants';
import type { EarthApiError, EarthConfigResponse } from '../types';

// Prefer a dedicated referrer-restricted browser key; fall back to the shared maps key.
export function getEarthConfig(source: Readonly<Record<string, string | undefined>> = env): EarthConfigResponse | null {
  const googleMapsKey = source.EARTH_GOOGLE_MAPS_BROWSER_KEY || source.GOOGLE_MAPS_API_KEY;
  if (!googleMapsKey) return null;
  return { googleMapsKey, features: { photorealistic: true, places: true } };
}

export function registerEarthApiRoutes(app: Express): void {
  app.get(`${EARTH_API_PREFIX}/config`, (_req: Request, res: Response<EarthConfigResponse | EarthApiError>) => {
    res.setHeader('Cache-Control', 'no-store');
    const config = getEarthConfig();
    if (!config) {
      res.status(503).json({ error: 'earth_not_configured' });
      return;
    }
    res.json(config);
  });
}
