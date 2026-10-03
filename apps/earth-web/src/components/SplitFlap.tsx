import { useEffect, useState } from 'react';
import { prefersReducedMotion } from '../lib/motion';
import { playFlaps } from '../store/sound';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const FRAME_MS = 40;
const isLetter = (char: string) => /\p{L}|\p{N}/u.test(char);
const randomChar = () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)];

type Props = {
  readonly text: string;
  readonly className?: string;
  readonly delayMs?: number;
  readonly sound?: boolean;
};

// An airport split-flap row: each letter spins through the alphabet before landing.
export function SplitFlap({ text, className = '', delayMs = 0, sound = false }: Props) {
  const target = text.toUpperCase();
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? target : target.replace(/\S/g, ' ')));

  useEffect(() => {
    if (prefersReducedMotion()) {
      setShown(target);
      return;
    }
    const chars = [...target];
    const delayFrames = Math.round(delayMs / FRAME_MS);
    const settleAt = chars.map((_, i) => delayFrames + 3 + Math.round(i * 0.9) + Math.floor(Math.random() * 4));
    const last = Math.max(0, ...settleAt);
    let frame = 0;
    let started = false;
    const timer = window.setInterval(() => {
      frame++;
      if (frame < delayFrames) return;
      if (!started && sound) playFlaps(chars.filter(isLetter).length);
      started = true;
      setShown(chars.map((char, i) => (frame >= settleAt[i] || !isLetter(char) ? char : randomChar())).join(''));
      if (frame >= last) window.clearInterval(timer);
    }, FRAME_MS);
    return () => window.clearInterval(timer);
  }, [target, delayMs, sound]);

  const shownChars = [...shown];
  let index = 0;
  return (
    <span className={`inline-flex flex-wrap gap-x-[0.3em] gap-y-[0.12em] ${className}`} role="img" aria-label={text}>
      {target.split(' ').map((word, w) => {
        const start = index;
        index += [...word].length + 1;
        return (
          <span key={w} className="inline-flex gap-[0.06em] whitespace-nowrap" aria-hidden="true">
            {[...word].map((_, i) => {
              const value = shownChars[start + i] ?? ' ';
              return (
                <span key={i} className="flap">
                  <span key={value}>{value === ' ' ? '\u00a0' : value}</span>
                </span>
              );
            })}
          </span>
        );
      })}
    </span>
  );
}
