import { Player } from '@shared/striker';
import { PLAYERS_DATA } from '../data/players-data';

export function getRandomPlayer(minRating?: number): Player {
  let playerPool = PLAYERS_DATA;

  if (minRating) {
    playerPool = PLAYERS_DATA.filter((player) => player.overallRating >= minRating);
  }

  const randomIndex = Math.floor(Math.random() * playerPool.length);
  return playerPool[randomIndex];
}
