import axios from 'axios';
import { getAircraftInRadius } from './api';

vi.mock('axios', () => ({ default: { get: vi.fn() } }));

describe('getAircraftInRadius()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return adsb.lol aircraft and cap the radius at 250nm', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({ data: { ac: [{ hex: 'abc' }] } });

    const result = await getAircraftInRadius({ lat: 31.4, lon: 35, radiusNm: 400 });

    expect(result).toEqual([{ hex: 'abc' }]);
    expect(axios.get).toHaveBeenCalledWith('https://api.adsb.lol/v2/point/31.4/35/250', expect.anything());
  });

  it('should fall back to adsb.fi when adsb.lol fails', async () => {
    vi.mocked(axios.get)
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValueOnce({ data: { aircraft: [{ hex: 'def' }] } });

    const result = await getAircraftInRadius({ lat: 31.4, lon: 35, radiusNm: 250 });

    expect(result).toEqual([{ hex: 'def' }]);
    expect(axios.get).toHaveBeenLastCalledWith('https://opendata.adsb.fi/api/v2/lat/31.4/lon/35/dist/250', expect.anything());
  });

  it('should fall back when adsb.lol returns an unexpected shape, and throw when both fail', async () => {
    vi.mocked(axios.get)
      .mockResolvedValueOnce({ data: { msg: 'rate limited' } })
      .mockResolvedValueOnce({ data: {} });

    await expect(getAircraftInRadius({ lat: 1, lon: 2, radiusNm: 100 })).rejects.toThrow('adsb.fi returned an unexpected response');
  });
});
