import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CATEGORIES } from '../lib/categories';
import type { GameProps } from '../lib/types';
import { cx, shuffle } from '../lib/utils';
import { playSound } from '../lib/sound';
import { GameStage } from '../components/GameStage';
import { HUD } from '../components/HUD';
import { CountdownOverlay } from '../components/CountdownOverlay';
import { useCountdown } from '../hooks/useCountdown';
import { Token, TOKEN_KINDS, type TokenKind } from '../components/GameGlyphs';
import { useTheme } from '../hooks/useTheme';
import { advancePairMatchBoard, createPairMatchProgress, getPairMatchBoardConfig, recordPairMatchMove, scorePairMatch } from './pair-match-logic';

const accent = CATEGORIES.memory.accent;
const TOTAL_TIME = 60;
const SYMBOLS: TokenKind[] = TOKEN_KINDS;

type Card = {
  readonly id: number;
  readonly boardIndex: number;
  readonly symbol: TokenKind;
  readonly flipped: boolean;
  readonly matched: boolean;
};

function buildDeck(boardIndex: number): Card[] {
  const symbols = shuffle(SYMBOLS).slice(0, getPairMatchBoardConfig(boardIndex).pairs);
  const deck = shuffle([...symbols, ...symbols]).map((symbol, id) => ({
    id,
    boardIndex,
    symbol,
    flipped: false,
    matched: false,
  }));
  return deck;
}

export default function PairMatch({ onFinish }: GameProps) {
  const [counting, setCounting] = useState(true);
  const [cards, setCards] = useState<Card[]>(() => buildDeck(0));
  const [progress, setProgress] = useState(createPairMatchProgress);
  const [notice, setNotice] = useState('Find four pairs to unlock the next board');
  const [inputLocked, setInputLocked] = useState(false);
  const cardsRef = useRef(cards);
  const openIds = useRef<number[]>([]);
  const progressRef = useRef(progress);
  const lock = useRef(false);
  const finished = useRef(false);
  const started = useRef(false);
  const revealTimer = useRef<number | undefined>(undefined);
  const boardRef = useRef<HTMLDivElement>(null);
  const restoreBoardFocus = useRef(false);
  const { reducedMotion } = useTheme();
  const systemReducedMotion = useReducedMotion();

  useEffect(() => () => window.clearTimeout(revealTimer.current), []);
  useEffect(() => {
    if (!restoreBoardFocus.current) return;
    restoreBoardFocus.current = false;
    boardRef.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
  }, [progress.boardIndex]);

  const finish = useCallback(
    () => {
      if (finished.current) return;
      finished.current = true;
      lock.current = true;
      setInputLocked(true);
      window.clearTimeout(revealTimer.current);
      const current = progressRef.current;
      onFinish({
        score: scorePairMatch(current),
        stats: [
          { label: 'Boards cleared', value: String(current.boardsCleared) },
          { label: 'Pairs found', value: String(current.totalMatches) },
          { label: 'Moves', value: String(current.totalMoves) },
        ],
      });
    },
    [onFinish],
  );

  const timer = useCountdown({
    seconds: TOTAL_TIME,
    autoStart: false,
    onExpire: finish,
  });
  const { reset: resetTimer, stop, isExpired } = timer;

  const start = useCallback(() => {
    if (started.current) return;
    started.current = true;
    setCounting(false);
    resetTimer(TOTAL_TIME);
  }, [resetTimer]);

  const flip = useCallback((card: Card) => {
    if (!started.current || lock.current || finished.current) return;
    if (isExpired()) {
      stop();
      finish();
      return;
    }
    if (card.boardIndex !== progressRef.current.boardIndex) return;
    const currentCard = cardsRef.current[card.id];
    if (currentCard.flipped || currentCard.matched) return;

    const nextOpen = [...openIds.current, card.id];
    openIds.current = nextOpen;
    cardsRef.current = cardsRef.current.map((c) => (c.id === card.id ? { ...c, flipped: true } : c));
    setCards(cardsRef.current);
    setNotice('Choose one more card');

    if (nextOpen.length === 2) {
      lock.current = true;
      setInputLocked(true);
      const [a, b] = nextOpen;
      const cardA = cardsRef.current[a];
      const cardB = cardsRef.current[b];
      const isMatch = cardA.symbol === cardB.symbol;
      const config = getPairMatchBoardConfig(progressRef.current.boardIndex);
      const nextProgress = recordPairMatchMove(progressRef.current, isMatch);
      progressRef.current = nextProgress;
      setProgress(nextProgress);
      playSound(isMatch ? 'correct' : 'wrong');

      if (isMatch) {
        cardsRef.current = cardsRef.current.map((c) => c.id === a || c.id === b ? { ...c, matched: true } : c);
        setCards(cardsRef.current);
        setNotice(`Pair found! ${config.pairs - nextProgress.boardMatches} to go`);
      } else {
        setNotice('Not a pair — remember those shapes');
      }

      if (nextProgress.boardMatches === config.pairs) {
        setNotice(`Board cleared! +${config.clearBonus} bonus · Next board…`);
        revealTimer.current = window.setTimeout(() => {
          if (finished.current) return;
          if (isExpired()) {
            stop();
            finish();
            return;
          }
          const nextBoard = advancePairMatchBoard(progressRef.current);
          restoreBoardFocus.current = boardRef.current?.contains(document.activeElement) ?? false;
          progressRef.current = nextBoard;
          setProgress(nextBoard);
          cardsRef.current = buildDeck(nextBoard.boardIndex);
          setCards(cardsRef.current);
          openIds.current = [];
          lock.current = false;
          setInputLocked(false);
          setNotice(`Fresh board — find ${getPairMatchBoardConfig(nextBoard.boardIndex).pairs} pairs`);
        }, 600);
        return;
      }

      revealTimer.current = window.setTimeout(() => {
        if (finished.current) return;
        if (isExpired()) {
          stop();
          finish();
          return;
        }
        cardsRef.current = cardsRef.current.map((c) => c.id === a || c.id === b ? { ...c, matched: isMatch, flipped: isMatch } : c);
        setCards(cardsRef.current);
        openIds.current = [];
        lock.current = false;
        setInputLocked(false);
        setNotice('Find the next pair');
      }, isMatch ? 350 : config.mismatchMs);
    }
  }, [finish, isExpired, stop]);

  return (
    <div className="relative flex flex-1 flex-col">
      {counting && <CountdownOverlay accent={accent} onDone={start} />}
      <GameStage
        hud={
          <HUD
            accent={accent}
            score={scorePairMatch(progress)}
            status={String(progress.boardIndex + 1)}
            statusLabel="Board"
            time={timer.remaining}
            timeFraction={timer.remaining / TOTAL_TIME}
          />
        }
      >
        <div className="mb-3 min-h-12 text-center">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-100" role="status">{notice}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {progress.boardMatches}/{getPairMatchBoardConfig(progress.boardIndex).pairs} this board · {progress.totalMatches} pairs · {progress.totalMoves} moves
          </p>
        </div>
        <div
          ref={boardRef}
          className="grid grid-cols-4 gap-2 sm:gap-3"
          style={{ width: 'min(100%, 420px)' }}
        >
          {cards.map((card) => {
            const shown = card.flipped || card.matched;
            return (
              <button
                key={`${card.boardIndex}-${card.id}`}
                onClick={() => flip(card)}
                onKeyDown={(event) => {
                  if (event.repeat) event.preventDefault();
                }}
                aria-label={`Card ${card.id + 1}, ${shown ? `${card.symbol}${card.matched ? ', matched' : ''}` : 'face down'}`}
                aria-disabled={counting || inputLocked || shown}
                tabIndex={card.matched ? -1 : 0}
                className="ml-tap relative aspect-square min-h-11 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-700 dark:focus-visible:outline-white"
                style={{ perspective: 600 }}
              >
                <motion.div
                  className="relative h-full w-full"
                  style={{ transformStyle: 'preserve-3d' }}
                  animate={{ rotateY: shown ? 180 : 0 }}
                  transition={{ duration: reducedMotion || systemReducedMotion ? 0 : 0.25 }}
                >
                  <div
                    className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/70 text-2xl ring-1 ring-slate-200 dark:bg-white/10 dark:ring-white/10"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <span aria-hidden="true" className="text-2xl font-bold text-slate-500 dark:text-slate-300">?</span>
                  </div>
                  <div
                    className={cx(
                      'absolute inset-0 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800',
                      card.matched ? 'ring-2 ring-emerald-500' : '',
                    )}
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      boxShadow: '0 4px 12px -6px rgba(0,0,0,0.2)',
                    }}
                  >
                    <Token kind={card.symbol} className="h-8 w-8" />
                    {card.matched && <span aria-hidden="true" className="absolute right-1 top-0.5 text-sm font-bold text-emerald-700 dark:text-emerald-300">✓</span>}
                  </div>
                </motion.div>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">Clear boards for bonus points. The 60-second clock never refills.</p>
      </GameStage>
    </div>
  );
}
