import { chapterComplete } from './progress';
import type { Progress } from './progress';

export const JOURNEY = [
  {
    title: 'A place to begin again',
    restored: 'The courtyard is open. Green shoots find the gaps between the stones.',
    detail: 'Clear a path through the courtyard. Someone used to tend this place.',
  },
  {
    title: 'The valley opens',
    restored: 'The old gate rises. For the first time in years, the path reaches both sides of the valley.',
    detail: 'The gatehouse has been holding the valley apart. Its switches still work.',
  },
  {
    title: 'What was left behind',
    restored: 'The vault doors open. Nothing here was lost; it was waiting to be found.',
    detail: 'Some paths were locked, not forgotten. Find the keys their keepers left behind.',
  },
  {
    title: 'A little warmth',
    restored: 'Light reaches the winter garden. A few brave leaves appear above the frost.',
    detail: 'Beyond the vault, the garden sleeps under ice. Find a way through without disturbing its quiet.',
  },
  {
    title: 'The way holds',
    restored: 'The ruins have a way through again. The fallen stones become the beginning of a new path.',
    detail: 'The oldest part of the valley is fragile. Choose what you leave behind carefully.',
  },
  {
    title: 'Water returns',
    restored: 'The canal reconnects. Water runs beneath the bridges and back toward the garden.',
    detail: 'Turn the crossings into place. The dry garden is waiting for this water.',
  },
  {
    title: 'Follow the wind',
    restored: 'The wind finds its way through the pass. The valley can breathe again.',
    detail: 'The high pass was built around the wind. Work with its direction, not against it.',
  },
  {
    title: 'A heartbeat in the hall',
    restored: 'The clockwork wakes. Far above the valley, the observatory begins to turn.',
    detail: 'These quiet machines once moved the observatory. Give them a reason to move again.',
  },
  {
    title: 'Closer than it seemed',
    restored: 'The hidden passages join the valley to the summit. The last climb is within reach.',
    detail: 'The old builders left shortcuts through the mountain. Discover where each one leads.',
  },
  {
    title: 'The light comes home',
    restored: 'The observatory shines again. The paths you opened have brought the valley back to life.',
    detail: 'Guide the light through the observatory. This time, the way out is also a way home.',
  },
] as const;

export function restoredChapters(progress: Progress): number[] {
  return JOURNEY.flatMap((_, index) => (chapterComplete(progress, index + 1) ? [index + 1] : []));
}
