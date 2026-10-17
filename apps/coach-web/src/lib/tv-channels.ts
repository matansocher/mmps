import one from '../assets/tv/one.png';
import sport1 from '../assets/tv/sport1.svg';
import sport2 from '../assets/tv/sport2.svg';
import sport3 from '../assets/tv/sport3.svg';
import sport4 from '../assets/tv/sport4.svg';
import sport5Gold from '../assets/tv/sport5-gold.svg';
import sport5Live from '../assets/tv/sport5-live.svg';
import sport5Max from '../assets/tv/sport5-max.svg';
import sport5Mobile from '../assets/tv/sport5-mobile.svg';
import sport5Plus from '../assets/tv/sport5-plus.svg';
import sport5Sport from '../assets/tv/sport5-sport.svg';
import sport5Sport4k from '../assets/tv/sport5-sport4k.svg';
import sport5Stars from '../assets/tv/sport5-stars.svg';
import sport6 from '../assets/tv/sport6.svg';

// light = dark logo on a white chip; dark = white logo on the brand's purple chip.
export type LocalChannelLogo = { readonly src: string; readonly chip: 'light' | 'dark' };

// Official logos from sport5.co.il, sport1.maariv.co.il and one.co.il; 365's own are wrong or missing for Israeli channels.
const SPORT5: readonly (readonly [RegExp, string])[] = [
  [/4k/, sport5Sport4k],
  [/live/, sport5Live],
  [/plus/, sport5Plus],
  [/stars/, sport5Stars],
  [/gold/, sport5Gold],
  [/max/, sport5Max],
  [/mobile/, sport5Mobile],
];

const SPORT1: Record<string, string> = { '1': sport1, '2': sport2, '3': sport3, '4': sport4, '6': sport6 };

// Names as 365 sends them, e.g. "Sport 5 Live HD", "5 Stars", "Sport 2", "ONE2 HD".
export function localChannelLogo(name: string): LocalChannelLogo | null {
  const n = name.toLowerCase().replace(/\s+hd$/, '').trim();
  if (/^one\b|^one\d/.test(n)) return { src: one, chip: 'light' };
  if (/^(sport\s*5|5\s)/.test(n) || n === 'sport5') {
    const variant = SPORT5.find(([pattern]) => pattern.test(n));
    return { src: variant ? variant[1] : sport5Sport, chip: 'light' };
  }
  const sportOne = /^sport\s*([12346])$/.exec(n);
  if (sportOne) return { src: SPORT1[sportOne[1]], chip: 'dark' };
  return null;
}
