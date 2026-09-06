import { lazy } from 'react';
import type { ComponentType } from 'react';
import type { GameMeta, GameProps } from './types';

export interface GameEntry extends GameMeta {
  component: ComponentType<GameProps>;
}

export const GAMES: GameEntry[] = [
  {
    id: 'block-escape',
    title: 'Block Escape',
    tagline: 'Make room for a clever escape',
    category: 'problem-solving',
    icon: '🧱',
    howTo: [
      'Free the little escape block by sliding it to the exit.',
      'Drag with a finger or mouse, or select a block and use the direction buttons or arrow keys.',
      'Blocks only move along their length. Make room by planning ahead.',
      'Solve as many increasingly tricky boards as you can in 60 seconds. New boards arrive automatically.',
      'Each square moved counts toward your score. Undo restores the board, not spent moves.',
    ],
    brainPractice: 'Practice planning ahead: picture how one move changes your next options.',
    component: lazy(async () => ({ default: (await import('../games/BlockEscape')).BlockEscape })),
  },
  {
    id: 'order-up',
    title: 'Order Up',
    tagline: 'A little cafe. A lot to remember.',
    category: 'memory',
    icon: '🥪',
    howTo: [
      'Memorize each customer’s ingredients in order before the order hides.',
      'Choose a customer and tap their ingredients in the same sequence, then serve.',
      'Later, juggle more customers and watch for changes to an order.',
      'A missed order breaks your streak, not your run. Finish the shift to see your results.',
    ],
    brainPractice: 'Practice working memory: keep orders in mind and update them when something changes.',
    component: lazy(async () => ({ default: (await import('../games/OrderUp')).OrderUp })),
  },
  {
    id: 'shape-shift',
    title: 'Shape Shift',
    tagline: 'Same shape. A whole new angle.',
    category: 'speed',
    icon: '🔄',
    howTo: [
      'Find the target shape among the rotated outlines.',
      'Tap an option or press its number. You have 60 seconds.',
      'Build a correct streak for bonus points. Wrong answers cost 20 points.',
      'Shapes grow more intricate and mirror-image decoys join in as you improve.',
    ],
    brainPractice: 'Practice mental rotation: turn a shape in your mind to recognize it from another angle.',
    component: lazy(async () => ({ default: (await import('../games/ShapeShift')).ShapeShift })),
  },
  {
    id: 'grid-recall',
    title: 'Grid Recall',
    tagline: 'Memorize the flashing pattern',
    category: 'memory',
    icon: '🧩',
    howTo: [
      'A pattern of tiles will light up on the grid.',
      'Watch closely, then tap the tiles that were lit.',
      'Clear a round and the grid grows bigger.',
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
      'Match every pair before the timer runs out.',
      'Fewer flips and faster times score higher.',
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
      'Each round adds more targets to follow.',
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
      'Chain correct answers to grow your combo multiplier.',
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
      'Correct streaks make problems harder — and worth more.',
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
      'Your brain wants to read — resist it!',
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
      'Trains (🚂) start on the left; stations (🏁) wait on the right.',
      'Tap any track tile to rotate it 90°.',
      'Rotate tiles to build a connected path for each color.',
      'Link every train to its matching-color station to clear the level.',
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
      'Switch rules on the fly as the color changes.',
    ],
    component: lazy(() => import('../games/EbbFlow')),
  },
];

export function getGame(id: string | undefined): GameEntry | undefined {
  return GAMES.find((g) => g.id === id);
}
