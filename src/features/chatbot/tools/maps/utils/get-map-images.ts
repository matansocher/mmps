import * as fs from 'fs';
import { env } from 'node:process';
import * as path from 'path';
import { LOCAL_FILES_PATH } from '@core/config';
import { deleteFile } from '@core/utils';
import { imgurUploadImage } from '@services/imgur';
import { downloadImage } from './download-image';
import { findPlace, PlaceInfo } from './find-place';
import { getStaticMapUrl } from './get-static-map-url';
import { getStreetViewMetadata } from './get-street-view-metadata';
import { getStreetViewUrl } from './get-street-view-url';

export interface MapImagesResult {
  success: boolean;
  placeName: string;
  placeInfo?: PlaceInfo;
  mapImageUrl?: string;
  streetViewImageUrl?: string;
  error?: string;
}

export async function getMapImages(placeName: string): Promise<MapImagesResult> {
  const apiKey = env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      placeName,
      error: 'Google Maps API key not configured',
    };
  }

  try {
    // Find the place
    const placeInfo = await findPlace(placeName);

    if (placeInfo.useCoordinates) {
    } else {
    }

    // Create timestamp for unique filenames
    const timestamp = new Date().getTime();
    const sanitizedPlaceName = placeName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

    let mapImageUrl: string | undefined;
    let streetViewImageUrl: string | undefined;

    // Ensure the LOCAL_FILES_PATH directory exists
    if (!fs.existsSync(LOCAL_FILES_PATH)) {
      fs.mkdirSync(LOCAL_FILES_PATH, { recursive: true });
    }

    // Try to get street view
    let streetViewUrl: string | undefined;

    if (placeInfo.useCoordinates && placeInfo.lat !== null && placeInfo.lng !== null) {
      // If we have coordinates, check metadata first
      try {
        const metadata = await getStreetViewMetadata(placeInfo.lat, placeInfo.lng, apiKey);

        if (metadata.status === 'OK') {
          streetViewUrl = getStreetViewUrl({ lat: placeInfo.lat, lng: placeInfo.lng }, apiKey, { size: '1280x720', fov: 90, heading: 0, pitch: 0, scale: 1 });
        } else {
        }
      } catch (error) {}
    } else {
      // Try to get street view using place name directly
      streetViewUrl = getStreetViewUrl(placeInfo.name, apiKey, { size: '1280x720', fov: 90, heading: 0, pitch: 0, scale: 1 });
    }

    // Download and upload street view if URL was generated
    if (streetViewUrl) {
      try {
        const streetViewImagePath = path.join(LOCAL_FILES_PATH, `streetview_${sanitizedPlaceName}_${timestamp}.jpg`);
        await downloadImage(streetViewUrl, streetViewImagePath);

        // Upload to Imgur
        streetViewImageUrl = await imgurUploadImage(env.IMGUR_CLIENT_ID, streetViewImagePath);

        // Delete local file after upload
        deleteFile(streetViewImagePath);
      } catch (error) {
        streetViewImageUrl = undefined;
      }
    }

    // Get static map
    const mapLocation = placeInfo.useCoordinates && placeInfo.lat !== null && placeInfo.lng !== null ? { lat: placeInfo.lat, lng: placeInfo.lng } : placeInfo.name;

    const mapUrl = getStaticMapUrl(mapLocation, apiKey, { size: '1280x720', zoom: 16, scale: 1, label: 'A' });

    try {
      const mapImagePath = path.join(LOCAL_FILES_PATH, `map_${sanitizedPlaceName}_${timestamp}.png`);
      await downloadImage(mapUrl, mapImagePath);

      // Upload to Imgur
      mapImageUrl = await imgurUploadImage(env.IMGUR_CLIENT_ID, mapImagePath);

      // Delete local file after upload
      deleteFile(mapImagePath);
    } catch (error) {
      mapImageUrl = undefined;
    }

    if (!mapImageUrl && !streetViewImageUrl) {
      return {
        success: false,
        placeName,
        placeInfo,
        error: 'Failed to generate any map images',
      };
    }

    return {
      success: true,
      placeName,
      placeInfo,
      mapImageUrl,
      streetViewImageUrl,
    };
  } catch (error) {
    console.error('Error getting map images:', error);
    return {
      success: false,
      placeName,
      error: error.message || 'Unknown error occurred',
    };
  }
}
