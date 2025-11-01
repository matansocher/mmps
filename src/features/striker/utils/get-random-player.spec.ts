import { PLAYERS_DATA } from '../data/players-data';
import { getRandomPlayer } from './get-random-player';

describe('getRandomPlayer', () => {
  it('should return a player object', () => {
    const player = getRandomPlayer();
    expect(player).toBeDefined();
    expect(player).toHaveProperty('id');
    expect(player).toHaveProperty('firstName');
    expect(player).toHaveProperty('lastName');
    expect(player).toHaveProperty('position');
    expect(player).toHaveProperty('nationality');
    expect(player).toHaveProperty('team');
  });

  it('should return a player from PLAYERS_DATA', () => {
    const player = getRandomPlayer();
    const playerExists = PLAYERS_DATA.some((p) => p.id === player.id);
    expect(playerExists).toBe(true);
  });

  it('should return different players when called multiple times (statistically)', () => {
    const players = new Set();
    for (let i = 0; i < 20; i++) {
      players.add(getRandomPlayer().id);
    }
    expect(players.size).toBeGreaterThan(1);
  });

  it('should return a valid Player structure', () => {
    const player = getRandomPlayer();
    expect(typeof player.id).toBe('number');
    expect(typeof player.firstName).toBe('string');
    expect(typeof player.lastName).toBe('string');
    expect(typeof player.commonName).toBe('string');
    expect(typeof player.position).toBe('string');
    expect(typeof player.nationality).toBe('string');
    expect(typeof player.team).toBe('string');
    expect(typeof player.photo).toBe('string');
    expect(typeof player.teamPhoto).toBe('string');
    expect(typeof player.nationalityPhoto).toBe('string');
    expect(typeof player.overallRating).toBe('number');
    expect(typeof player.preferredFoot).toBe('string');
  });

  it('should return players with valid data', () => {
    const player = getRandomPlayer();
    expect(player.firstName.length).toBeGreaterThan(0);
    expect(player.lastName.length).toBeGreaterThan(0);
    expect(player.overallRating).toBeGreaterThan(0);
    expect(player.overallRating).toBeLessThanOrEqual(99);
  });
});
