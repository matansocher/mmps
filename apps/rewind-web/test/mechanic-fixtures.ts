import { LEVELS } from '../src/game/levels';
import type { Level } from '../src/game/types';

export const MECHANIC_FIXTURES: readonly Level[] = [
  { ...LEVELS[0], introduction: 4, name: 'Ice fixture', map: ['########', '#S.~~.E#', '########'], par: 3 },
  { ...LEVELS[0], introduction: 5, name: 'Crumble fixture', map: ['#######', '#S.,.E#', '#######'], par: 4 },
  { ...LEVELS[0], introduction: 6, name: 'Bridge fixture', map: ['#######', '#S.|.E#', '#######'], par: 5 },
  { ...LEVELS[0], introduction: 7, name: 'One-way fixture', map: ['#######', '#S.>.E#', '#######'], par: 4 },
  { ...LEVELS[0], introduction: 8, name: 'Lever fixture', map: ['#######', '#Sl.GE#', '#######'], par: 5 },
  { ...LEVELS[0], introduction: 9, name: 'Tunnel fixture', map: ['#########', '#S.0#0.E#', '#########'], par: 4 },
  { ...LEVELS[0], introduction: 10, name: 'Light fixture', map: ['#########', '###o#####', '#*.\\..###', '#S....LE#', '#########'], par: 7 },
  { ...LEVELS[0], introduction: undefined, name: 'Combined machinery fixture', map: ['##########', '#.ka.o####', '#*.C.\\####', '#S.C.AlGl#', '##...###H#', '######ELK#', '##########'], par: 20 },
];
