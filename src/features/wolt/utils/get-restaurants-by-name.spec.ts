import { WoltRestaurant } from '@shared/wolt';
import { getRestaurantsByName } from './get-restaurants-by-name';

const mockRestaurants = [
  { name: 'Burger Bar', area: 'tel-aviv', slug: 'burger-bar' },
  { name: 'Pizza Palace', area: 'haifa', slug: 'pizza-palace' },
  { name: 'Sushi Place', area: 'jerusalem', slug: 'sushi-place' },
  { name: 'burger king', area: 'petah-tikva', slug: 'burger-king-pt' },
  { name: 'Burger Joint', area: 'hasharon', slug: 'burger-joint' },
] as WoltRestaurant[];

describe('getRestaurantsByName()', () => {
  it('should return no values when search input is empty', () => {
    expect(getRestaurantsByName(mockRestaurants, '')).toEqual([]);
    expect(getRestaurantsByName(mockRestaurants, '   ')).toEqual([]);
  });

  it('returns restaurants matching a single search word (case-insensitive)', () => {
    const result = getRestaurantsByName(mockRestaurants, 'burger');
    const names = result.map((r) => r.name);
    expect(names).toEqual(expect.arrayContaining(['Burger Bar', 'burger king', 'Burger Joint']));
    expect(result.length).toBe(3);
  });

  it('returns restaurants matching any word in a multi-word search input', () => {
    const result = getRestaurantsByName(mockRestaurants, 'sushi burger');
    const names = result.map((r) => r.name);
    expect(names).toEqual(expect.arrayContaining(['Sushi Place', 'Burger Bar', 'burger king', 'Burger Joint']));
    expect(result.length).toBe(4);
  });

  it('normalizes input and still finds matches', () => {
    const result = getRestaurantsByName(mockRestaurants, '  "Burger" ');
    const names = result.map((r) => r.name);
    expect(names).toEqual(expect.arrayContaining(['Burger Bar', 'burger king', 'Burger Joint']));
  });

  it('sorts results by area based on CITIES_SLUGS_SUPPORTED order', () => {
    const result = getRestaurantsByName(mockRestaurants, 'burger');
    const areas = result.map((r) => r.area);
    const expectedOrder = ['tel-aviv', 'hasharon', 'petah-tikva'];
    expect(areas).toEqual(expectedOrder);
  });

  it('returns an empty array when no matches are found', () => {
    const result = getRestaurantsByName(mockRestaurants, 'pasta');
    expect(result).toEqual([]);
  });

  it('ignores multiple spaces between words', () => {
    const result = getRestaurantsByName(mockRestaurants, '   burger   sushi  ');
    const names = result.map((r) => r.name);
    expect(names).toEqual(expect.arrayContaining(['Sushi Place', 'Burger Bar', 'burger king', 'Burger Joint']));
  });

  it('ignores dashes and quotes in input', () => {
    const result = getRestaurantsByName(mockRestaurants, 'burger king');
    const names = result.map((r) => r.name);
    expect(names).toContain('burger king');
  });

  it('ignores short words when the search has longer ones', () => {
    const result = getRestaurantsByName(mockRestaurants, 'a link to sushi in wolt?');
    expect(result.map((r) => r.name)).toEqual(['Sushi Place']);
  });

  it('keeps short words when the whole search is short', () => {
    const result = getRestaurantsByName(mockRestaurants, 'ki');
    expect(result.map((r) => r.name)).toEqual(['burger king']);
  });

  it('ranks restaurants matching more search words first', () => {
    const result = getRestaurantsByName(mockRestaurants, 'burger king');
    expect(result[0].name).toEqual('burger king');
  });

  it('finds a restaurant by its wolt link', () => {
    const result = getRestaurantsByName(mockRestaurants, 'https://wolt.com/he/isr/petah-tikva/restaurant/burger-king-pt?utm=1');
    expect(result.map((r) => r.name)).toEqual(['burger king']);
  });
});
