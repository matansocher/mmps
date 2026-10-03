import { WoltRestaurant } from '@shared/wolt';
import { getSimilarRestaurants } from './get-similar-restaurants';

const mockRestaurants = [
  { id: '1', name: 'Casata', area: 'tel-aviv' },
  { id: '2', name: 'Papi Pizza', area: 'tel-aviv' },
  { id: '3', name: 'Burger Bar', area: 'haifa' },
  { id: '4', name: 'Sushi Place', area: 'jerusalem' },
  { id: '5', name: 'Pizza Palace', area: 'haifa' },
] as WoltRestaurant[];

describe('getSimilarRestaurants()', () => {
  test.each([
    { search: 'cassatta', expected: ['Casata'] },
    { search: 'suhsi', expected: [] },
    { search: 'sushy', expected: ['Sushi Place'] },
    { search: 'burgr', expected: ['Burger Bar'] },
  ])('should return $expected when searching $search', ({ search, expected }) => {
    expect(getSimilarRestaurants(mockRestaurants, search).map((r) => r.name)).toEqual(expected);
  });

  it('should rank restaurants matching more words first', () => {
    const result = getSimilarRestaurants(mockRestaurants, 'papi piza');
    expect(result.map((r) => r.name)).toEqual(['Papi Pizza', 'Pizza Palace']);
  });

  it('should rank closer matches first', () => {
    const result = getSimilarRestaurants(mockRestaurants, 'pizzza');
    expect(result.map((r) => r.name)).toEqual(['Papi Pizza', 'Pizza Palace']);
  });

  it('should ignore short words to avoid noisy suggestions', () => {
    expect(getSimilarRestaurants(mockRestaurants, 'bar')).toEqual([]);
    expect(getSimilarRestaurants(mockRestaurants, '')).toEqual([]);
  });

  it('should return no suggestions when nothing is close', () => {
    expect(getSimilarRestaurants(mockRestaurants, 'hamburgerim')).toEqual([]);
  });
});
