export type CategoryId =
  | 'memory'
  | 'attention'
  | 'speed'
  | 'problem-solving'
  | 'flexibility';

export interface Category {
  id: CategoryId;
  label: string;
  /** Tailwind gradient stops for cards / accents. */
  from: string;
  to: string;
  /** Solid accent color used for text, rings and HUD. */
  accent: string;
  /** Soft tint used for card backgrounds. */
  soft: string;
}

export interface GameMeta {
  id: string;
  title: string;
  tagline: string;
  category: CategoryId;
  /** Emoji used as the card glyph. */
  icon: string;
  /** Short "how to play" lines shown on the intro screen. */
  howTo: string[];
}

/** Result reported by a game when a run finishes. */
export interface GameResult {
  score: number;
  /** Optional extra stats shown on the results screen. */
  stats?: { label: string; value: string }[];
}

/** Props every game component receives from the shell. */
export interface GameProps {
  onFinish: (result: GameResult) => void;
}
