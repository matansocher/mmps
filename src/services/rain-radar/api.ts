import axios from 'axios';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { Logger } from '@core/utils';
import { DEFAULT_VIEW, IMS_RADAR_CONFIG } from './constants';
import { createRadarOverlay, fetchMapTiles } from './map-utils';
import type { ImsRadarResponse, RainRadarOptions } from './types';

const logger = new Logger('RainRadarService');

export async function generateRainRadarImage(options: RainRadarOptions = {}): Promise<string> {
  const { zoom = DEFAULT_VIEW.zoom, width = DEFAULT_VIEW.width, height = DEFAULT_VIEW.height } = options;

  logger.log(`Generating IMS Rain Radar Image (zoom ${zoom}, ${width}x${height})`);

  try {
    // 1. Fetch radar metadata
    const radarMetadata = await axios.get<ImsRadarResponse>(`${IMS_RADAR_CONFIG.baseUrl}${IMS_RADAR_CONFIG.endpoint}`, {
      headers: {
        'User-Agent': IMS_RADAR_CONFIG.userAgent,
        Accept: 'application/json',
      },
    });

    const types = radarMetadata.data?.data?.types;
    const radarImages = types?.IMSRadar4GIS || types?.IMSRadar || types?.radarComposite || types?.radar;

    if (!radarImages || radarImages.length === 0) {
      throw new Error('No radar images available from IMS');
    }

    // 2. Get latest radar image (try until we find a non-empty one)
    const sorted = [...radarImages].sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
    let radarBuffer: Buffer | null = null;
    let latestImage = sorted[0];

    for (const img of sorted) {
      const imageUrl = `${IMS_RADAR_CONFIG.baseUrl}${img.file_name}`;
      try {
        const res = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
          headers: { 'User-Agent': IMS_RADAR_CONFIG.userAgent },
        });
        const buf = Buffer.from(res.data);
        if (buf.length > 0) {
          radarBuffer = buf;
          latestImage = img;
          logger.log(`Latest radar image: ${imageUrl}`);
          logger.log(`Forecast time: ${latestImage.forecast_time}, Modified: ${latestImage.modified}`);
          break;
        }
      } catch {
        continue;
      }
    }

    if (!radarBuffer) {
      throw new Error('Could not download any radar image');
    }

    // 3. Fetch map tiles and create radar overlay
    const { buffer: mapBuffer, viewLeft, viewTop } = await fetchMapTiles(zoom, width, height);
    const overlay = await createRadarOverlay(radarBuffer, zoom, viewLeft, viewTop, width, height);

    // 4. Composite radar on map
    logger.log('Compositing radar overlay on map...');
    const compositeImage = await sharp(mapBuffer).composite([overlay]).png().toBuffer();

    // 5. Save
    const assetsDir = path.resolve(process.cwd(), 'assets', 'radar');
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    const timestamp = Date.now();
    const outputPath = path.join(assetsDir, `ims_radar_${timestamp}.png`);

    fs.writeFileSync(outputPath, compositeImage);
    logger.log(`IMS radar image saved to: ${outputPath}`);
    return outputPath;
  } catch (err) {
    logger.error(`Failed to generate IMS radar image: ${err}`);
    throw new Error('IMS radar service is currently unavailable. Please try again later.');
  }
}
