import { searchPs5Games } from './api';
import { PLAYSTATION_STORE_CATEGORY_ID } from './constants';

vi.mock('./auth', () => ({ getAccessToken: vi.fn().mockResolvedValue('token'), getIgdbHeaders: vi.fn().mockReturnValue({}) }));

const STORE_URL = 'https://store.playstation.com/en-us/concept/12345';

function givenIgdbExternalGame(externalGame: Record<string, unknown>): void {
  const games = [{ id: 1, name: 'Game', external_games: [{ category: PLAYSTATION_STORE_CATEGORY_ID, ...externalGame }] }];
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify(games) }));
}

describe('searchPs5Games()', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should keep the store url when the playstation entry has no uid', async () => {
    givenIgdbExternalGame({ url: STORE_URL });

    const [game] = await searchPs5Games('game');

    expect(game.psStoreProductId).toBeNull();
    expect(game.psStoreUrl).toEqual(STORE_URL);
  });

  it('should resolve the product id when the playstation entry has a uid', async () => {
    givenIgdbExternalGame({ uid: 'EP9000-PPSA00000_00', url: STORE_URL });

    const [game] = await searchPs5Games('game');

    expect(game.psStoreProductId).toEqual('EP9000-PPSA00000_00');
    expect(game.psStoreUrl).toEqual(STORE_URL);
  });
});
