import axios from 'axios';

type StreetViewMetadata = {
  status: string;
  pano_id?: string;
  date?: string;
  location?: {
    lat: number;
    lng: number;
  };
};

export async function getStreetViewMetadata(lat: number, lng: number, apiKey: string): Promise<StreetViewMetadata> {
  const url = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&key=${apiKey}`;

  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Street View metadata request failed: ${error.message}`);
    }
    throw error;
  }
}
