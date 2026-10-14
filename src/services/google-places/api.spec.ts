import axios from 'axios';
import { env } from 'node:process';
import { getPlaceDetails, searchPlaces } from './api';

vi.mock('axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

const originalKey = env.GOOGLE_PLACES_API_KEY;

describe('google-places api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    env.GOOGLE_PLACES_API_KEY = 'test-key';
  });

  afterAll(() => {
    env.GOOGLE_PLACES_API_KEY = originalKey;
  });

  describe('searchPlaces()', () => {
    it('should map places from the text search response', async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          places: [
            {
              id: 'abc',
              displayName: { text: 'Gaston' },
              formattedAddress: 'Some St 1, Petah Tikva, Israel',
              location: { latitude: 32.09, longitude: 34.88 },
              rating: 4.5,
              userRatingCount: 120,
              googleMapsUri: 'https://maps.google.com/?cid=1',
            },
          ],
        },
      });

      const result = await searchPlaces('Gaston Petah Tikva');

      expect(result).toEqual([
        {
          placeId: 'abc',
          name: 'Gaston',
          address: 'Some St 1, Petah Tikva, Israel',
          lat: 32.09,
          lng: 34.88,
          type: undefined,
          rating: 4.5,
          ratingCount: 120,
          businessStatus: undefined,
          mapsUrl: 'https://maps.google.com/?cid=1',
        },
      ]);
      expect(axios.post).toHaveBeenCalledWith(
        'https://places.googleapis.com/v1/places:searchText',
        { textQuery: 'Gaston Petah Tikva', pageSize: 5, regionCode: 'IL' },
        expect.objectContaining({ headers: expect.objectContaining({ 'X-Goog-Api-Key': 'test-key' }) }),
      );
    });

    it('should cap max results and return an empty list when nothing matches', async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({ data: {} });

      const result = await searchPlaces('nothing', { maxResults: 50, languageCode: 'he' });

      expect(result).toEqual([]);
      expect(axios.post).toHaveBeenCalledWith(expect.any(String), { textQuery: 'nothing', pageSize: 20, regionCode: 'IL', languageCode: 'he' }, expect.anything());
    });

    it('should throw when the api key is missing', async () => {
      delete env.GOOGLE_PLACES_API_KEY;

      await expect(searchPlaces('x')).rejects.toThrow('GOOGLE_PLACES_API_KEY is not configured');
      expect(axios.post).not.toHaveBeenCalled();
    });
  });

  describe('getPlaceDetails()', () => {
    it('should map details and fall back to a built maps url', async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: {
          id: 'abc',
          displayName: { text: 'Gaston' },
          nationalPhoneNumber: '03-1234567',
          websiteUri: 'https://gaston.example',
          regularOpeningHours: { openNow: true, weekdayDescriptions: ['Monday: 9:00 AM – 5:00 PM'] },
        },
      });

      const result = await getPlaceDetails('abc');

      expect(result).toEqual(
        expect.objectContaining({
          placeId: 'abc',
          name: 'Gaston',
          phone: '03-1234567',
          website: 'https://gaston.example',
          openNow: true,
          openingHours: ['Monday: 9:00 AM – 5:00 PM'],
          mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Gaston&query_place_id=abc',
        }),
      );
      expect(axios.get).toHaveBeenCalledWith('https://places.googleapis.com/v1/places/abc', expect.anything());
    });
  });
});
