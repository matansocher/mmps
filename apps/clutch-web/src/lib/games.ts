import type { LeagueStats } from './storage';

export type Accent = 'flame' | 'hoop' | 'win';
export type GameGroup = 'streak' | 'challenge';
export type Metric = 'streak' | 'score';

export type GameDef = {
  readonly path: string;
  readonly title: string;
  readonly tagline: string;
  readonly badge: string;
  readonly accent: Accent;
  readonly group: GameGroup;
  readonly metric: Metric;
  readonly best: (s: LeagueStats) => number;
  readonly format: (v: number) => string;
};

// Literal class strings so Tailwind can see them at build time.
export const ACCENT: Record<Accent, { grad: string; badge: string; text: string; solid: string; ring: string }> = {
  flame: { grad: 'from-flame/25', badge: 'bg-flame/20 text-flame', text: 'text-flame', solid: 'bg-flame', ring: 'ring-flame/40' },
  hoop: { grad: 'from-hoop/25', badge: 'bg-hoop/20 text-hoop', text: 'text-hoop', solid: 'bg-hoop', ring: 'ring-hoop/40' },
  win: { grad: 'from-win/25', badge: 'bg-win/20 text-win', text: 'text-win', solid: 'bg-win', ring: 'ring-win/40' },
};

const streak = (v: number) => `🔥 ${v}`;

// Ordered so the streak-chasing games (the addictive "beat your best" loop) sit first,
// then the one-shot / scored challenges.
export const GAMES: readonly GameDef[] = [
  {
    path: '/rapid',
    title: 'Rapid Fire',
    tagline: 'Who advanced? Pick fast — 5 seconds a shot, endless streak.',
    badge: 'Survival',
    accent: 'win',
    group: 'streak',
    metric: 'streak',
    best: (s) => s.bestRapidStreak,
    format: streak,
  },
  {
    path: '/lifted',
    title: 'Who Lifted It?',
    tagline: 'A year flashes up — tap the champion in 5 seconds. One miss ends the streak.',
    badge: 'Trivia',
    accent: 'hoop',
    group: 'streak',
    metric: 'streak',
    best: (s) => s.bestLiftedStreak,
    format: streak,
  },
  {
    path: '/chump',
    title: 'Champion or Chump?',
    tagline: 'A team + year flash up. Champions — yes or no? 3 lives.',
    badge: 'Quick Win',
    accent: 'win',
    group: 'streak',
    metric: 'streak',
    best: (s) => s.bestChumpStreak,
    format: streak,
  },
  {
    path: '/daily',
    title: 'Daily Bracket',
    tagline: 'Rebuild a full playoff bracket, round by round. One shot, one score.',
    badge: 'Bracket',
    accent: 'hoop',
    group: 'challenge',
    metric: 'score',
    best: (s) => s.bestBracketScore,
    format: (v) => `${v} pts`,
  },
  {
    path: '/decades',
    title: 'Decade Champions',
    tagline: 'Drag 10 champions into their title years. 30 seconds on the clock.',
    badge: 'Beat the Clock',
    accent: 'flame',
    group: 'challenge',
    metric: 'score',
    best: (s) => s.bestDecadeScore,
    format: (v) => `${v}/10`,
  },
  {
    path: '/finalists',
    title: 'Both Finalists',
    tagline: 'Pick both teams that reached the final, then the winner. 10 rounds.',
    badge: 'Two Picks',
    accent: 'flame',
    group: 'challenge',
    metric: 'score',
    best: (s) => s.bestFinalistsScore,
    format: (v) => `${v}/20`,
  },
];
