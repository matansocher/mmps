import { useMemo, useState } from 'react';
import { Pitch } from './components/Pitch';
import { PlayerList } from './components/PlayerList';
import {
  eligibleOpenSlots,
  gradeLabel,
  gradeSquad,
  isPrimaryFit,
  MAX_RESHUFFLES,
  nextStep,
  TOTAL_STEPS,
  type Placement,
  type Player,
  type Step,
} from './lib/game';
import { FORMATION, type Slot } from './lib/positions';

type Phase = 'start' | 'playing' | 'done';

export function App() {
  const [phase, setPhase] = useState<Phase>('start');
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [step, setStep] = useState<Step | null>(null);
  const [selected, setSelected] = useState<Player | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const [reshufflesUsed, setReshufflesUsed] = useState(0);

  const usedPlayerIds = useMemo(() => new Set(placements.map((p) => p.player.id)), [placements]);
  const filledSlotIds = useMemo(() => new Set(placements.map((p) => p.slotId)), [placements]);
  const openSlots = useMemo(() => FORMATION.filter((s) => !filledSlotIds.has(s.id)), [filledSlotIds]);
  const movingPlayer = useMemo(() => placements.find((p) => p.slotId === moving)?.player ?? null, [placements, moving]);

  function startGame() {
    const first = nextStep(new Set(), FORMATION);
    setPlacements([]);
    setReshufflesUsed(0);
    setSelected(null);
    setMoving(null);
    setStep(first);
    setPhase('playing');
  }

  function reshuffle() {
    if (reshufflesUsed >= MAX_RESHUFFLES) return;
    setReshufflesUsed((n) => n + 1);
    setSelected(null);
    setMoving(null);
    setStep(nextStep(usedPlayerIds, openSlots));
  }

  function selectPlayer(player: Player) {
    setMoving(null);
    setSelected(player);
  }

  function startMoving(placement: Placement) {
    setSelected(null);
    setMoving((cur) => (cur === placement.slotId ? null : placement.slotId));
  }

  function handleSlotClick(slot: Slot) {
    if (selected) {
      placeNewPlayer(slot);
    } else if (moving) {
      movePlayer(slot);
    }
  }

  function placeNewPlayer(slot: Slot) {
    if (!selected) return;
    const viaPrimary = isPrimaryFit(selected, slot.type);
    const newPlacements = [...placements, { slotId: slot.id, player: selected, viaPrimary }];
    setSelected(null);

    if (newPlacements.length >= TOTAL_STEPS) {
      setPlacements(newPlacements);
      setStep(null);
      setPhase('done');
      return;
    }

    const newUsed = new Set(newPlacements.map((p) => p.player.id));
    const newOpen = FORMATION.filter((s) => !new Set(newPlacements.map((p) => p.slotId)).has(s.id));
    setPlacements(newPlacements);
    setStep(nextStep(newUsed, newOpen));
  }

  function movePlayer(targetSlot: Slot) {
    if (!moving) return;
    setPlacements((prev) =>
      prev.map((p) =>
        p.slotId === moving ? { slotId: targetSlot.id, player: p.player, viaPrimary: isPrimaryFit(p.player, targetSlot.type) } : p,
      ),
    );
    setMoving(null);
  }

  const highlightSlotIds = useMemo(() => {
    const player = selected ?? movingPlayer;
    if (!player) return new Set<string>();
    return new Set(eligibleOpenSlots(player, openSlots).map((s) => s.id));
  }, [selected, movingPlayer, openSlots]);

  if (phase === 'start') return <StartScreen onStart={startGame} />;
  if (phase === 'done') return <ResultScreen placements={placements} onReplay={startGame} />;

  return (
    <div className="mx-auto max-w-md p-4 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <div className="text-text-primary text-base font-bold">Build Your XI</div>
          <div className="text-text-muted text-xs">Step {placements.length + 1} / {TOTAL_STEPS}</div>
        </div>
        <button
          onClick={reshuffle}
          disabled={reshufflesUsed >= MAX_RESHUFFLES || !!selected}
          className="rounded-lg border border-border-subtle bg-bg-card px-3 py-1.5 text-xs font-semibold text-text-primary disabled:opacity-40"
        >
          🔀 Reshuffle ({MAX_RESHUFFLES - reshufflesUsed})
        </button>
      </header>

      <Pitch
        placements={placements}
        highlightSlotIds={highlightSlotIds}
        movingSlotId={moving}
        onSlotClick={handleSlotClick}
        onPlacedClick={selected ? undefined : startMoving}
      />

      {selected ? (
        <div className="bg-bg-card border border-accent-draw/40 rounded-xl px-3 py-2 text-sm text-text-primary">
          Selected <span className="font-bold">{selected.name}</span> — tap a highlighted position to place him.
          <button onClick={() => setSelected(null)} className="ml-2 text-text-muted underline">cancel</button>
        </div>
      ) : moving ? (
        <div className="bg-bg-card border border-accent-draw/40 rounded-xl px-3 py-2 text-sm text-text-primary">
          {highlightSlotIds.size > 0 ? (
            <>Move <span className="font-bold">{movingPlayer?.name}</span> — tap a highlighted position.</>
          ) : (
            <>No other position fits <span className="font-bold">{movingPlayer?.name}</span>.</>
          )}
          <button onClick={() => setMoving(null)} className="ml-2 text-text-muted underline">cancel</button>
        </div>
      ) : (
        <>
          {placements.length > 0 && (
            <div className="text-text-muted text-xs px-1">Tip: tap a placed player to move him to another suitable position.</div>
          )}
          {step && <PlayerList step={step} openSlots={openSlots} selectedPlayerId={null} onSelect={selectPlayer} />}
        </>
      )}
    </div>
  );
}

function StartScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center p-6 text-center space-y-6">
      <div className="text-5xl">⚽️</div>
      <h1 className="text-2xl font-bold text-text-primary">Build Your Dream XI</h1>
      <div className="space-y-2 text-sm text-text-secondary">
        <p>Fill an empty 4-3-3 formation, one player at a time.</p>
        <p>Each step shows the squad of a random club. Pick a player, then place him in a highlighted position that fits his role.</p>
        <p>You get <span className="text-text-primary font-semibold">2 reshuffles</span> to swap a club you don't like.</p>
        <p>After all 11 players, you get a squad rating out of 100 — the better the players and positions, the higher your score.</p>
      </div>
      <button
        onClick={onStart}
        className="w-full rounded-xl bg-accent-win px-6 py-3 text-base font-bold text-bg-base hover:opacity-90 transition-opacity"
      >
        Start
      </button>
    </div>
  );
}

function ResultScreen({ placements, onReplay }: { placements: readonly Placement[]; onReplay: () => void }) {
  const grade = gradeSquad(placements);
  const oop = placements.filter((p) => !p.viaPrimary).length;
  return (
    <div className="mx-auto max-w-md p-4 space-y-4">
      <div className="text-center space-y-1">
        <div className="text-text-muted text-sm">Your squad rating</div>
        <div className="score-font text-6xl font-bold text-accent-win">{grade}</div>
        <div className="text-text-primary text-lg font-semibold">{gradeLabel(grade)}</div>
        {oop > 0 && <div className="text-text-muted text-xs">{oop} player{oop > 1 ? 's' : ''} out of position</div>}
      </div>

      <Pitch placements={placements} />

      <button
        onClick={onReplay}
        className="w-full rounded-xl bg-accent-win px-6 py-3 text-base font-bold text-bg-base hover:opacity-90 transition-opacity"
      >
        Play again
      </button>
    </div>
  );
}
