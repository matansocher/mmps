import { gamePriceWatcherTool } from './game-price-watcher.tool';

const { searchPs5Games, getGamePrice, getGamePriceFromProduct, getWatch, createWatch } = vi.hoisted(() => ({
  searchPs5Games: vi.fn(),
  getGamePrice: vi.fn(),
  getGamePriceFromProduct: vi.fn(),
  getWatch: vi.fn(),
  createWatch: vi.fn(),
}));

vi.mock('@core/config', async (importOriginal) => ({ ...(await importOriginal<typeof import('@core/config')>()), MY_USER_ID: 1 }));
vi.mock('@services/igdb', () => ({ searchPs5Games }));
vi.mock('@services/playstation-store', async (importOriginal) => ({ ...(await importOriginal<typeof import('@services/playstation-store')>()), getGamePrice, getGamePriceFromProduct }));
vi.mock('@shared/game-price-watcher', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@shared/game-price-watcher')>()),
  getWatch,
  createWatch,
  getActiveWatchesByChatId: vi.fn(),
  removeWatch: vi.fn(),
}));

const PS_STORE_GAME = {
  conceptId: '12345',
  productId: 'EP9000-PPSA00000_00',
  name: 'Game',
  url: 'https://store.playstation.com/en-il/concept/12345',
  coverUrl: null,
  price: { basePriceValue: 25000, discountedValue: 25000, currencyCode: 'USD' },
};

async function addByName(): Promise<{ success: boolean }> {
  return JSON.parse(await gamePriceWatcherTool.invoke({ action: 'add', gameName: 'Game' }));
}

describe('gamePriceWatcherTool add by name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getWatch.mockResolvedValue(null);
  });

  it('should fall back to the igdb concept store url when there is no product id', async () => {
    searchPs5Games.mockResolvedValue([{ name: 'Game', psStoreProductId: null, psStoreUrl: 'https://store.playstation.com/en-us/concept/12345' }]);
    getGamePrice.mockResolvedValue(PS_STORE_GAME);

    const result = await addByName();

    expect(getGamePrice).toHaveBeenCalledWith('12345');
    expect(result.success).toEqual(true);
    expect(createWatch).toHaveBeenCalledTimes(1);
  });

  it('should fall back to the igdb product store url when there is no product id', async () => {
    searchPs5Games.mockResolvedValue([{ name: 'Game', psStoreProductId: null, psStoreUrl: 'https://store.playstation.com/en-us/product/EP9000-PPSA00000_00' }]);
    getGamePriceFromProduct.mockResolvedValue(PS_STORE_GAME);

    const result = await addByName();

    expect(getGamePriceFromProduct).toHaveBeenCalledWith('EP9000-PPSA00000_00');
    expect(result.success).toEqual(true);
  });

  it('should return an error when neither a product id nor a store url is available', async () => {
    searchPs5Games.mockResolvedValue([{ name: 'Game', psStoreProductId: null, psStoreUrl: null }]);

    const result = await addByName();

    expect(result.success).toEqual(false);
    expect(createWatch).not.toHaveBeenCalled();
  });
});
