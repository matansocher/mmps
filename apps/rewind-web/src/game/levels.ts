import { CAMPAIGN, CHAPTER_IDS } from '../../../../src/shared/rewind';
import { STAR_TARGETS } from './level-targets';
import { RELEASE_ROOMS } from './release-rooms';
import type { Chapter, Level } from './types';

const REGIONS: readonly Chapter[] = [
  {
    id: 1,
    name: 'The Courtyard',
    concept: 'barrel',
    title: 'Make a little room',
    explanation: 'Walk into a barrel to push it. Park it out of the passage, then find the archway. You can always undo.',
    color: '#52734e',
    terrain: 'courtyard',
  },
  {
    id: 2,
    name: 'The Gatehouse',
    concept: 'switch',
    title: 'A little weight opens doors',
    explanation: 'The brass switch lifts the gate with the same mark. Leave a barrel on it to keep the way open.',
    color: '#8a713d',
    terrain: 'gatehouse',
  },
  {
    id: 3,
    name: 'The Old Vault',
    concept: 'key',
    title: 'Some doors stay open',
    explanation: 'Collect a key and walk into its matching lock. The key is used, but the door stays open for the rest of the room.',
    color: '#877049',
    terrain: 'vault',
  },
  {
    id: 4,
    name: 'The Winter Garden',
    concept: 'ice',
    title: 'Think about the landing',
    explanation: 'You and your barrels slide across ice until dry ground or an obstacle. A whole slide is one move.',
    color: '#4d8189',
    terrain: 'winter',
  },
  {
    id: 5,
    name: 'The Forgotten Ruins',
    concept: 'crumble',
    title: 'Not every path lasts',
    explanation: 'Cracked paving falls away after you or a barrel leave it empty. Plan your return route. Undo puts it back.',
    color: '#98684c',
    terrain: 'ruins',
  },
  {
    id: 6,
    name: 'The Canal Walk',
    concept: 'bridge',
    title: 'Turn the way forward',
    explanation: 'Stand beside a bridge and use Turn bridge. It only carries you along the direction of its planks. Empty it before turning.',
    color: '#518075',
    terrain: 'canal',
  },
  {
    id: 7,
    name: 'The Wind Pass',
    concept: 'one-way',
    title: 'Follow the arrow',
    explanation: 'Arrow gates allow travel only in their marked direction. You may need a different route back.',
    color: '#8a7950',
    terrain: 'wind',
  },
  {
    id: 8,
    name: 'The Clockwork Hall',
    concept: 'lever',
    title: 'Change the room',
    explanation: 'Stand beside a lever and pull it. Sun gates and moon gates swap: one set opens while the other closes.',
    color: '#8c6546',
    terrain: 'clockwork',
  },
  {
    id: 9,
    name: 'The Hidden Passages',
    concept: 'tunnel',
    title: 'A shortcut through stone',
    explanation: 'Matching numbered tunnels connect. Walk or push a barrel into one to emerge at the other when there is space.',
    color: '#796c8d',
    terrain: 'tunnels',
  },
  {
    id: 10,
    name: 'The Observatory',
    concept: 'light',
    title: 'Bring the light home',
    explanation: 'Stand beside a mirror and turn it. Guide light into every round receiver to lift the star gate. Barrels block light; you do not.',
    color: '#8b7851',
    terrain: 'observatory',
  },
];

export const CHAPTERS = REGIONS.filter((chapter) => CHAPTER_IDS.includes(chapter.id));
type Room = Pick<Level, 'name' | 'map' | 'goal' | 'hint' | 'difficulty'>;
const ROOMS: Readonly<Record<number, Room>> = {
  ...RELEASE_ROOMS,
  1: {
    name: 'Something in the way',
    map: ['#######', '###.###', '#..C.E#', '#S..###', '#######'],
    goal: 'Park the barrel. Reach the archway.',
    hint: 'Walk below the barrel, then push it up into the little alcove.',
    difficulty: 1,
  },
  11: {
    name: 'A little weight',
    map: ['########', '###a####', '#..C.AE#', '#S..####', '########'],
    goal: 'Hold the brass switch down.',
    hint: 'Get below the barrel and push it up onto A.',
    difficulty: 1,
  },
  101: {
    name: 'Borrowed weight',
    map: ['#########', '#E#######', '#B..bA..#', '#S.Ca##.#', '####....#', '#########'],
    goal: 'One barrel. Two switches. Find the way out.',
    hint: 'A switch can do its job without staying pressed until the end.',
    difficulty: 6,
  },
  102: {
    name: 'After you',
    map: ['###########', '#...#######', '#AC.#######', '###.a.bABE#', '##..C...###', '##..S######', '###########'],
    goal: 'Hold both gates. Leave enough room for yourself.',
    hint: 'The first barrel cannot stay on A. Find a temporary home for the second before changing their jobs.',
    difficulty: 9,
  },
  21: {
    name: 'Your first key',
    map: ['#######', '#S.kKE#', '#######'],
    goal: 'Pick up the key and open its lock.',
    hint: 'Walk along the corridor. The round key opens the round lock.',
    difficulty: 1,
  },
  103: {
    name: 'A key well spent',
    map: ['########', '#S.k...#', '#..#..##', '#..KCKk#', '####E###', '########'],
    goal: 'Two locks. One key to start with. Find the archway.',
    hint: 'A barrel cannot unlock a door, even when you have the key. Look beyond both locks before spending your first key.',
    difficulty: 8,
  },
};

export const LEVELS: readonly Level[] = CAMPAIGN.map((entry, index) => ({ ...entry, ...ROOMS[entry.id], par: STAR_TARGETS[index] }));

export function levelById(id: number): Level {
  const level = LEVELS.find((room) => room.id === id);
  if (!level) throw new Error(`Unknown room: ${id}`);
  return level;
}

export function chapterById(id: number): Chapter {
  const chapter = CHAPTERS.find((item) => item.id === id);
  if (!chapter) throw new Error(`Unknown chapter: ${id}`);
  return chapter;
}

export function introductionById(id: number): Chapter {
  const introduction = REGIONS.find((item) => item.id === id);
  if (!introduction) throw new Error(`Unknown introduction: ${id}`);
  return introduction;
}

export function twoStarTarget(level: Level): number {
  return level.par + Math.max(3, Math.ceil(level.par * 0.5));
}
