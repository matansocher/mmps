import { lazy } from 'react';
import type { ComponentType } from 'react';
import type { GameMeta, GameProps } from './types';

export interface GameEntry extends GameMeta {
  component: ComponentType<GameProps>;
}

export const GAMES: GameEntry[] = [
  {
    id: 'grid-recall',
    title: 'Grid Recall',
    tagline: 'Memorize the flashing pattern',
    category: 'memory',
    icon: '🧩',
    howTo: [
      'A pattern of tiles will light up on the grid.',
      'Watch closely, then tap the tiles that were lit.',
      'Larger patterns appear for less time as you progress.',
      'One mistake ends the run.',
    ],
    component: lazy(() => import('../games/GridRecall')),
  },
  {
    id: 'pair-match',
    title: 'Pair Match',
    tagline: 'Flip and match the pairs',
    category: 'memory',
    icon: '🃏',
    howTo: [
      'Flip two cards at a time to find matching pairs.',
      'Remember where each symbol is hiding.',
      'Clear boards of 4, then 6, then 8 pairs within 60 seconds.',
      'Earn board bonuses with fewer flips. The clock never refills.',
    ],
    component: lazy(() => import('../games/PairMatch')),
  },
  {
    id: 'sequence-echo',
    title: 'Sequence Echo',
    tagline: 'Repeat the growing light show',
    category: 'memory',
    icon: '🔮',
    howTo: [
      'Watch the pads light up in order.',
      'Repeat the sequence by tapping the pads.',
      'Each round adds one more step.',
      'Miss a step and the run ends.',
    ],
    component: lazy(() => import('../games/SequenceEcho')),
  },
  {
    id: 'sequence-track',
    title: 'Sequence Track',
    tagline: 'Keep your eyes on the movers',
    category: 'attention',
    icon: '👀',
    howTo: [
      'A few dots glow to mark the targets.',
      'All dots turn identical and shuffle around.',
      'When they stop, tap the ones you tracked.',
      'Later rounds add targets, faster movement, and longer tracking.',
    ],
    component: lazy(() => import('../games/SequenceTrack')),
  },
  {
    id: 'odd-one-out',
    title: 'Odd One Out',
    tagline: 'Spot the one that differs',
    category: 'attention',
    icon: '🔍',
    howTo: [
      'Every tile looks the same but one.',
      'Tap the tile with the slightly different color.',
      'The grid grows and colors get closer.',
      'Beat the clock — wrong taps cost time.',
    ],
    component: lazy(() => import('../games/OddOneOut')),
  },
  {
    id: 'flash-match',
    title: 'Flash Match',
    tagline: 'Does it match the last one?',
    category: 'speed',
    icon: '⚡',
    howTo: [
      'A symbol flashes in the center.',
      'Answer YES if it matches the PREVIOUS symbol, NO if not.',
      'Compare shape and color — both must match.',
      'Later levels use lookalike symbols. Correct streaks score more.',
    ],
    component: lazy(() => import('../games/FlashMatch')),
  },
  {
    id: 'quick-math',
    title: 'Quick Math',
    tagline: 'Solve as many as you can',
    category: 'problem-solving',
    icon: '➗',
    howTo: [
      'Solve each arithmetic problem quickly.',
      'Pick the correct answer from the options.',
      'Correct streaks unlock harder, multi-step problems worth more points.',
      'Answer as many as possible before time runs out.',
    ],
    component: lazy(() => import('../games/QuickMath')),
  },
  {
    id: 'raindrops',
    title: 'Raindrops',
    tagline: 'Solve the drops before they land',
    category: 'problem-solving',
    icon: '💧',
    howTo: [
      'Arithmetic problems fall from the sky as raindrops.',
      'Type each answer on the keypad and hit Solve.',
      'Clear the lowest matching drop before it hits the water.',
      'Correct answers bring faster, tougher drops worth more points.',
      'Let three drops fall and the run ends.',
    ],
    component: lazy(() => import('../games/Raindrops')),
  },
  {
    id: 'color-clash',
    title: 'Color Clash',
    tagline: 'Ink color beats the word',
    category: 'flexibility',
    icon: '🌈',
    howTo: [
      'A color word appears in a colored ink.',
      'Answer the INK color, not the word.',
      'More colors and misleading words appear as you level up.',
      'Keep the combo going before time runs out.',
    ],
    component: lazy(() => import('../games/ColorClash')),
  },
  {
    id: 'rail-router',
    title: 'Rail Router',
    tagline: 'Route trains to their stations',
    category: 'flexibility',
    icon: '🚆',
    howTo: [
      'Find the numbered trains and their matching station flags.',
      'Tap any track tile to rotate it 90°.',
      'Rotate tiles to build a connected path for each color.',
      'Clear each level for tougher puzzles, bonus points, and eight seconds.',
    ],
    component: lazy(() => import('../games/RailRouter')),
  },
  {
    id: 'ebb-flow',
    title: 'Ebb & Flow',
    tagline: 'The color changes the rule',
    category: 'flexibility',
    icon: '🍃',
    howTo: [
      'A leaf slides in, pointing one way and moving another.',
      'ORANGE leaf: respond to the way it MOVES.',
      'GREEN leaf: respond to the way it POINTS.',
      'Later levels switch rules more and use conflicting directions.',
    ],
    component: lazy(() => import('../games/EbbFlow')),
  },
];

export function getGame(id: string | undefined): GameEntry | undefined {
  return GAMES.find((g) => g.id === id);
}
