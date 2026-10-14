import { afterEach, describe, expect, it, vi } from 'vitest';
import { getGame, searchGames } from './api';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('metacritic api', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('searchGames()', () => {
    it('should map search items and drop non-game results', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          data: {
            items: [
              {
                type: 'game-title',
                title: 'Hollow Knight',
                slug: 'hollow-knight',
                releaseDate: '2018-06-12',
                criticScoreSummary: { score: 90 },
                platforms: [{ name: 'PC' }],
                genres: [{ name: 'Metroidvania' }],
              },
              { type: 'movie', title: 'Hollow Man', slug: 'hollow-man' },
            ],
          },
        }),
      );
      vi.stubGlobal('fetch', fetchMock);

      const results = await searchGames('hollow knigt');

      expect(String(fetchMock.mock.calls[0][0])).toContain('/finder/metacritic/search/hollow%20knigt/web');
      expect(results).toEqual([
        {
          slug: 'hollow-knight',
          title: 'Hollow Knight',
          criticScore: 90,
          releaseDate: '2018-06-12',
          platforms: ['PC'],
          genres: ['Metroidvania'],
          url: 'https://www.metacritic.com/game/hollow-knight/',
        },
      ]);
    });

    it('should throw on server errors', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, 503)));
      await expect(searchGames('zelda')).rejects.toThrow('HTTP 503');
    });
  });

  describe('getGame()', () => {
    it('should combine the game page with the user score', async () => {
      const fetchMock = vi.fn().mockImplementation(async (url: URL) => {
        if (String(url).includes('/reviews/')) {
          return jsonResponse({ data: { item: { score: 8.9, max: 10, reviewCount: 27363, sentiment: 'Generally favorable' } } });
        }
        return jsonResponse({
          data: {
            item: {
              title: 'The Legend of Zelda: Breath of the Wild',
              slug: 'the-legend-of-zelda-breath-of-the-wild',
              description: 'Step into a world of discovery.',
              releaseDate: '2017-03-03',
              rating: 'E10+',
              mustPlay: true,
              genres: [{ name: 'Open-World Action' }],
              production: {
                companies: [
                  { name: 'Nintendo', typeName: 'Developer' },
                  { name: 'Nintendo', typeName: 'Publisher' },
                ],
              },
              criticScoreSummary: { score: 97, max: 100, reviewCount: 117, sentiment: 'Universal acclaim' },
              platforms: [{ name: 'Wii U', criticScoreSummary: { score: 96, reviewCount: 13 } }],
            },
          },
        });
      });
      vi.stubGlobal('fetch', fetchMock);

      const game = await getGame('the-legend-of-zelda-breath-of-the-wild');

      expect(game).toEqual({
        slug: 'the-legend-of-zelda-breath-of-the-wild',
        title: 'The Legend of Zelda: Breath of the Wild',
        description: 'Step into a world of discovery.',
        releaseDate: '2017-03-03',
        rating: 'E10+',
        genres: ['Open-World Action'],
        developers: ['Nintendo'],
        publishers: ['Nintendo'],
        mustPlay: true,
        criticScore: { score: 97, max: 100, reviewCount: 117, sentiment: 'Universal acclaim' },
        userScore: { score: 8.9, max: 10, reviewCount: 27363, sentiment: 'Generally favorable' },
        platforms: [{ platform: 'Wii U', criticScore: 96, reviewCount: 13 }],
        url: 'https://www.metacritic.com/game/the-legend-of-zelda-breath-of-the-wild/',
      });
    });

    it('should return null when the game does not exist', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ errors: [] }, 404)));
      expect(await getGame('nonexistent-game')).toEqual(null);
    });
  });
});
