import { env } from 'node:process';
import * as path from 'path';
import { LOCAL_FILES_PATH } from '@core/config';
import { deleteFile, Logger } from '@core/utils';
import { imgurUploadImage } from '@services/imgur';
import { downloadImage } from './download-image';
import { findPlace, PlaceInfo } from './find-place';
import { getStaticMapUrl } from './get-static-map-url';

const logger = new Logger('get-map-images');

export type MapImagesResult = {
  success: boolean;
  placeName: string;
  placeInfo?: PlaceInfo;
  mapImageUrl?: string;
  error?: string;
};

export async function getMapImages(placeName: string): Promise<MapImagesResult> {
  try {
    const placeInfo = await findPlace(placeName);
    const sanitizedPlaceName = placeName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

    const mapLocation = placeInfo.useCoordinates && placeInfo.lat !== null && placeInfo.lng !== null ? { lat: placeInfo.lat, lng: placeInfo.lng } : placeInfo.name;
    const mapUrl = getStaticMapUrl(mapLocation, env.GOOGLE_MAPS_API_KEY, { size: '1280x720', zoom: 16, scale: 1, label: 'A' });

    let mapImageUrl: string | undefined;
    try {
      const mapImagePath = path.join(LOCAL_FILES_PATH, `map_${sanitizedPlaceName}_${new Date().getTime()}.png`);
      await downloadImage(mapUrl, mapImagePath);
      mapImageUrl = await imgurUploadImage(env.IMGUR_CLIENT_ID, mapImagePath);
      deleteFile(mapImagePath);
    } catch (err) {
      mapImageUrl = undefined;
    }

    if (!mapImageUrl) {
      return { success: false, placeName, placeInfo, error: 'Failed to generate map image' };
    }

    return { success: true, placeName, placeInfo, mapImageUrl };
  } catch (err) {
    logger.error(`Error getting map images: ${err}`);
    return { success: false, placeName, error: err.message || 'Unknown error occurred' };
  }
}
