import axios from 'axios';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { Logger } from '@core/utils';
import { DEFAULT_VIEW, IMS_RADAR_CONFIG } from './constants';
import { extractRadarForViewport, fetchMapTiles } from './map-utils';
import type { ImsRadarResponse, RainRadarOptions } from './types';

const logger = new Logger('RainRadarService');

/**
 * Generate a rain radar image with map overlay for Israel.
 * By default, shows Israel's Central District (Haifa to Beer Sheva).
 */
export async function generateRainRadarImage(options: RainRadarOptions = {}): Promise<string> {
  const {
    location = 'Israel Central District',
    centerLat = DEFAULT_VIEW.centerLat,
    centerLon = DEFAULT_VIEW.centerLon,
    zoom = DEFAULT_VIEW.zoom,
    width = DEFAULT_VIEW.width,
    height = DEFAULT_VIEW.height,
  } = options;

  logger.log(`Generating IMS Rain Radar Image for ${location}`);
  logger.log(`Center: ${centerLat}°N, ${centerLon}°E, Zoom: ${zoom}, Size: ${width}x${height}`);

  try {
    // 1. Fetch radar metadata
    logger.log('Fetching IMS radar data...');
    const radarMetadata = await axios.get<ImsRadarResponse>(`${IMS_RADAR_CONFIG.baseUrl}${IMS_RADAR_CONFIG.endpoint}`, {
      headers: {
        'User-Agent': IMS_RADAR_CONFIG.userAgent,
        Accept: 'application/json',
      },
    });

    // Try IMSRadar first (PNG, more frequent updates), fallback to radar composite
    const radarImages = radarMetadata.data?.data?.types?.IMSRadar || radarMetadata.data?.data?.types?.radar;

    if (!radarImages || radarImages.length === 0) {
      throw new Error('No radar images available from IMS');
    }

    // 2. Get latest radar image (sort by modified time)
    const sortedImages = [...radarImages].sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());

    const latestImage = sortedImages[0];
    const imageUrl = `${IMS_RADAR_CONFIG.baseUrl}${latestImage.file_name}`;

    logger.log(`Latest radar image: ${imageUrl}`);
    logger.log(`Forecast time: ${latestImage.forecast_time}, Modified: ${latestImage.modified}`);

    // 3. Download radar image
    const radarResponse = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': IMS_RADAR_CONFIG.userAgent,
      },
    });

    const radarBuffer = Buffer.from(radarResponse.data);

    // 4. Fetch map tiles and extract radar for viewport
    const [mapBuffer, radarOverlay] = await Promise.all([fetchMapTiles(centerLat, centerLon, zoom, width, height), extractRadarForViewport(radarBuffer, centerLat, centerLon, zoom, width, height)]);

    // 5. Composite radar on top of map
    logger.log('Compositing radar overlay on map...');
    const compositeImage = await sharp(mapBuffer)
      .composite([
        {
          input: radarOverlay,
          blend: 'over',
        },
      ])
      .png()
      .toBuffer();

    // 6. Save to assets/radar directory
    const assetsDir = path.resolve(process.cwd(), 'assets', 'radar');
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    const timestamp = Date.now();
    const filename = `ims_radar_${timestamp}.png`;
    const outputPath = path.join(assetsDir, filename);

    fs.writeFileSync(outputPath, compositeImage);

    logger.log(`IMS radar image with map saved to: ${outputPath}`);
    return outputPath;
  } catch (err) {
    logger.error(`Failed to generate IMS radar image: ${err}`);
    throw new Error('IMS radar service is currently unavailable. Please try again later.');
  }
}

/**
 * Generate a radar image for a specific location (convenience function)
 */
export async function generateRadarForLocation(lat: number, lon: number, options: { zoom?: number; width?: number; height?: number } = {}): Promise<string> {
  const { zoom = 10, width = 800, height = 800 } = options;

  return generateRainRadarImage({
    location: `${lat},${lon}`,
    centerLat: lat,
    centerLon: lon,
    zoom,
    width,
    height,
  });
}
