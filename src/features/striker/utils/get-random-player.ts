import { Player } from '@shared/striker';
import { PLAYERS_DATA } from '../data/players-data';

export function getRandomPlayer(): Player {
  const randomIndex = Math.floor(Math.random() * PLAYERS_DATA.length);
  return PLAYERS_DATA[randomIndex];
}
