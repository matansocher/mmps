import type { Bot } from 'grammy';
import { getHotelPrice } from '@services/booking';
import { getActiveWatches, updateLowestPrice } from '@shared/hotel-watcher';
import type { HotelWatch } from '@shared/hotel-watcher';
import { hotelPriceCheck } from './hotel-price-check';

vi.mock('@services/booking', () => ({
  getHotelPrice: vi.fn(),
}));

vi.mock('@shared/hotel-watcher', () => ({
  getActiveWatches: vi.fn(),
  updateLowestPrice: vi.fn(),
}));

describe('hotelPriceCheck()', () => {
  const watch: HotelWatch = {
    chatId: 123,
    hotelId: 'hotel-1',
    hotelName: 'Test Hotel',
    url: 'https://www.booking.com/hotel/test',
    checkinDate: '2026-09-01',
    checkoutDate: '2026-09-03',
    adults: 2,
    roomQty: 1,
    currency: 'ILS',
    lastPrice: 1000,
    isActive: true,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-01T00:00:00.000Z'),
  };
  const sendMessage = vi.fn();
  const bot = { api: { sendMessage } } as unknown as Bot;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should alert and lower the threshold only for new lowest prices', async () => {
    let lowestPrice = watch.lastPrice;
    vi.mocked(getActiveWatches).mockImplementation(async () => [{ ...watch, lastPrice: lowestPrice }]);
    vi.mocked(updateLowestPrice).mockImplementation(async (_chatId, _hotelId, _checkinDate, _checkoutDate, price) => {
      lowestPrice = price;
      return { acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0, upsertedId: null };
    });

    for (const price of [950, 930, 980, 960, 920]) {
      vi.mocked(getHotelPrice).mockResolvedValueOnce({
        hotelId: watch.hotelId,
        price,
        currency: watch.currency,
        checkinDate: watch.checkinDate,
        checkoutDate: watch.checkoutDate,
      });
      await hotelPriceCheck(bot);
    }

    expect(sendMessage).toHaveBeenCalledTimes(3);
    expect(updateLowestPrice).toHaveBeenCalledTimes(3);
    expect(vi.mocked(updateLowestPrice).mock.calls.map((call) => call[4])).toEqual([950, 930, 920]);
    expect(lowestPrice).toEqual(920);
  });

  it('should not alert or update when the price equals the lowest price', async () => {
    vi.mocked(getActiveWatches).mockResolvedValue([watch]);
    vi.mocked(getHotelPrice).mockResolvedValue({
      hotelId: watch.hotelId,
      price: watch.lastPrice,
      currency: watch.currency,
      checkinDate: watch.checkinDate,
      checkoutDate: watch.checkoutDate,
    });

    await hotelPriceCheck(bot);

    expect(sendMessage).not.toHaveBeenCalled();
    expect(updateLowestPrice).not.toHaveBeenCalled();
  });
});
