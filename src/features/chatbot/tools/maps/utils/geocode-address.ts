import axios from 'axios';

type GeocodeResult = {
  lat: number;
  lng: number;
  formatted_address: string;
};

export async function geocodeAddress(address: string, apiKey: string): Promise<GeocodeResult> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;

  try {
    const response = await axios.get(url);

    if (response.data.status !== 'OK' || !response.data.results || response.data.results.length === 0) {
      throw new Error(`Geocoding failed: ${response.data.status} - ${response.data.error_message || 'no results'}`);
    }

    const location = response.data.results[0].geometry.location;

    return {
      lat: location.lat,
      lng: location.lng,
      formatted_address: response.data.results[0].formatted_address,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Geocoding API request failed: ${error.message}`);
    }
    throw error;
  }
}
