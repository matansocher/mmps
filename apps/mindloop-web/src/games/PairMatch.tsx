import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CATEGORIES } from '../lib/categories';
import type { GameProps } from '../lib/types';
import { cx, shuffle } from '../lib/utils';
import { playSound } from '../lib/sound';
import { GameStage } from '../components/GameStage';
import { HUD } from '../components/HUD';
import { CountdownOverlay } from '../components/CountdownOverlay';
import { useCountdown } from '../hooks/useCountdown';
import { Token, TOKEN_KINDS, type TokenKind } from '../components/GameGlyphs';

const accent = CATEGORIES.memory.accent;
const TOTAL_TIME = 60;
const SYMBOLS: TokenKind[] = TOKEN_KINDS;

interface Card {
  id: number;
  symbol: TokenKind;
  flipped: boolean;
  matched: boolean;
}

function buildDeck(): Card[] {
  const deck = shuffle([...SYMBOLS, ...SYMBOLS]).map((symbol, id) => ({
    id,
    symbol,
    flipped: false,
    matched: false,
  }));
  return deck;
}

export default function PairMatch({ onFinish }: GameProps) {
  const [counting, setCounting] = useState(true);
  const [cards, setCards] = useState<Card[]>(buildDeck);
  const [openIds, setOpenIds] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const lock = useRef(false);
  const finished = useRef(false);

  const finish = useCallback(
    (won: boolean, timeLeft: number) => {
      if (finished.current) return;
      finished.current = true;
      const base = matches * 100;
      const timeBonus = won ? Math.round(timeLeft * 20) : 0;
      const movePenalty = moves * 5;
      const score = Math.max(0, base + timeBonus - movePenalty);
      onFinish({
        score,
        stats: [
          { label: 'Pairs found', value: `${matches}/${SYMBOLS.length}` },
          { label: 'Moves', value: String(moves) },
        ],
      });
    },
    [matches, moves, onFinish],
  );

  const timer = useCountdown({
    seconds: TOTAL_TIME,
    autoStart: false,
    onExpire: () => finish(false, 0),
  });

  const start = useCallback(() => {
    setCounting(false);
    timer.reset(TOTAL_TIME);
  }, [timer]);

  useEffect(() => {
    if (!counting && matches === SYMBOLS.length) {
      timer.stop();
      finish(true, timer.remaining);
    }
  }, [matches, counting, finish, timer]);

  const flip = (card: Card) => {
    if (counting || lock.current || card.flipped || card.matched) return;
    if (openIds.length === 2) return;

    const nextOpen = [...openIds, card.id];
    setCards((cs) => cs.map((c) => (c.id === card.id ? { ...c, flipped: true } : c)));
    setOpenIds(nextOpen);

    if (nextOpen.length === 2) {
      setMoves((m) => m + 1);
      lock.current = true;
      const [a, b] = nextOpen;
      const cardA = cards.find((c) => c.id === a)!;
      const cardB = cards.find((c) => c.id === b)!;
      const isMatch = cardA.symbol === cardB.symbol;

      window.setTimeout(() => {
        setCards((cs) =>
          cs.map((c) =>
            c.id === a || c.id === b
              ? { ...c, matched: isMatch, flipped: isMatch }
              : c,
          ),
        );
        if (isMatch) setMatches((m) => m + 1);
        playSound(isMatch ? 'correct' : 'wrong');
        setOpenIds([]);
        lock.current = false;
      }, isMatch ? 350 : 750);
    }
  };

  return (
    <div className="relative flex flex-1 flex-col">
      {counting && <CountdownOverlay accent={accent} onDone={start} />}
      <GameStage
        hud={
          <HUD
            accent={accent}
            score={matches * 100}
            scoreLabel="Pairs"
            time={timer.remaining}
            timeFraction={timer.remaining / TOTAL_TIME}
          />
        }
      >
        <div
          className="grid grid-cols-4 gap-2 sm:gap-3"
          style={{ width: 'min(92vw, 420px)' }}
        >
          {cards.map((card) => {
            const shown = card.flipped || card.matched;
            return (
              <button
                key={card.id}
                onClick={() => flip(card)}
                className="ml-tap relative aspect-square"
                style={{ perspective: 600 }}
              >
                <motion.div
                  className="relative h-full w-full"
                  style={{ transformStyle: 'preserve-3d' }}
                  animate={{ rotateY: shown ? 180 : 0 }}
                  transition={{ duration: 0.35 }}
                >
                  <div
                    className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/70 text-2xl ring-1 ring-slate-200 dark:bg-white/10 dark:ring-white/10"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <span className="opacity-30 text-2xl">❔</span>
                  </div>
                  <div
                    className={cx(
                      'absolute inset-0 flex items-center justify-center rounded-2xl',
                      card.matched ? 'ring-2' : '',
                    )}
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      background: card.matched ? `${accent}22` : '#fff',
                      boxShadow: '0 4px 12px -6px rgba(0,0,0,0.2)',
                    }}
                  >
                    <Token kind={card.symbol} className="h-8 w-8" />
                  </div>
                </motion.div>
              </button>
            );
          })}
        </div>
      </GameStage>
    </div>
  );
}
