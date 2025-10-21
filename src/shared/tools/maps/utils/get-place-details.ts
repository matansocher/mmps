import axios from 'axios';
import { env } from 'node:process';
import { findPlace } from './find-place';

export type PlaceDetails = {
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
  };
  business_status?: string;
  types?: string[];
  reviews?: Array<{
    author_name: string;
    rating: number;
    text: string;
    time: number;
  }>;
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
};

export type PlaceDetailsResult = {
  success: boolean;
  placeDetails?: PlaceDetails;
  error?: string;
};

export async function getPlaceDetails(placeName: string): Promise<PlaceDetailsResult> {
  try {
    const placeInfo = await findPlace(placeName);

    if (!placeInfo.place_id) {
      return {
        success: false,
        error: 'Could not find place ID for the specified location',
      };
    }

    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeInfo.place_id}&fields=name,formatted_address,formatted_phone_number,international_phone_number,website,rating,user_ratings_total,price_level,opening_hours,business_status,types,reviews,photos,geometry&key=${env.GOOGLE_PLACES_API_KEY}`;

    const response = await axios.get(detailsUrl);

    if (response.data.status === 'OK' && response.data.result) {
      return {
        success: true,
        placeDetails: response.data.result,
      };
    } else {
      return {
        success: false,
        error: `Google Places API returned status: ${response.data.status}`,
      };
    }
  } catch (err) {
    console.error(`Error getting place details: ${err}`);
    return {
      success: false,
      error: err.message || 'Unknown error occurred',
    };
  }
}
