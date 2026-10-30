import { getSavedSummaryLocation } from './mongo';
import { getSummaryLocation } from './summary-location';

vi.mock('./mongo', () => ({ getSavedSummaryLocation: vi.fn() }));

describe('getSummaryLocation()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return the location saved via chat', async () => {
    vi.mocked(getSavedSummaryLocation).mockResolvedValue('Kyoto');
    expect(await getSummaryLocation()).toEqual('Kyoto');
  });

  it('should fall back to the default when nothing is saved', async () => {
    vi.mocked(getSavedSummaryLocation).mockResolvedValue(null);
    expect(await getSummaryLocation()).toEqual('Kfar Saba');
  });

  it('should fall back to the default when reading the saved location fails', async () => {
    vi.mocked(getSavedSummaryLocation).mockRejectedValue(new Error('mongo down'));
    expect(await getSummaryLocation()).toEqual('Kfar Saba');
  });
});
