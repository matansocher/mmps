import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import type { FormationDef, FormationSlotDef, SquadPlayer } from '../types';

type Props = {
  readonly formations: readonly FormationDef[];
  readonly initialFormationId: string;
  readonly players: readonly SquadPlayer[];
  readonly initialStarters: readonly number[]; // ordered, slot i = starters[i]
  readonly busy: boolean;
  readonly actionLabel: string;
  readonly busyLabel: string;
  readonly onCommit: (starters: number[], formationId: string) => void;
  readonly intro?: string;
  readonly header?: ReactNode; // optional banner rendered above the editor (e.g. opponent preview)
  readonly resetSignal?: number; // bump to re-seed from initial props
};

// A dragged/dropped lineup token: either an on-pitch slot (by index) or a
// bench player (by id). Drag any onto any to swap the two players.
type DragItem = { readonly kind: 'slot'; readonly index: number } | { readonly kind: 'bench'; readonly id: number };

// Live pointer-drag session. We implement drag-and-drop with raw pointer events
// (not the HTML5 Drag-and-Drop API) so the floating token is a normal element we
// position ourselves — it can never drift away from the cursor.
type DragState = {
  readonly item: DragItem;
  readonly pointerId: number;
  readonly faceUrl: string | null;
  readonly label: string;
  readonly startX: number;
  readonly startY: number;
  x: number; // current pointer position
  y: number;
  active: boolean; // true once the pointer has moved past the start threshold
};

// Pointer must travel this far before a press turns into a drag; below it we
// treat the gesture as a tap (select slot / bring on a sub).
const DRAG_THRESHOLD_PX = 6;
const GHOST_SIZE = 52;

// Related-role clusters mirror the backend engine so warnings match the sim.
const ROLE_FAMILY: Record<string, string> = {
  GK: 'gk',
  CB: 'cb',
  LB: 'fb',
  RB: 'fb',
  LWB: 'fb',
  RWB: 'fb',
  CDM: 'dm',
  CM: 'cm',
  CAM: 'am',
  LM: 'wm',
  RM: 'wm',
  LW: 'w',
  RW: 'w',
  CF: 'st',
  ST: 'st',
};

const RELATED_FAMILIES: Record<string, readonly string[]> = {
  gk: [],
  cb: ['fb', 'dm'],
  fb: ['cb', 'wm', 'dm'],
  dm: ['cm', 'cb', 'fb'],
  cm: ['dm', 'am'],
  am: ['cm', 'w', 'st'],
  wm: ['w', 'fb', 'cm'],
  w: ['wm', 'am', 'st'],
  st: ['am', 'w'],
};

function familyOf(role: string): string {
  return ROLE_FAMILY[role] ?? 'cm';
}

function isSameItem(a: DragItem | null, b: DragItem | null): boolean {
  if (!a || !b || a.kind !== b.kind) return false;
  return a.kind === 'slot' ? a.index === (b as { index: number }).index : a.id === (b as { id: number }).id;
}

// 'natural' | 'related' | 'unrelated' | 'gk' — used to colour/warn a slotted player.
function fitLevel(slotRole: string, positions: readonly string[]): 'natural' | 'related' | 'unrelated' | 'gk' {
  const slotFamily = familyOf(slotRole);
  const naturalFamilies = new Set(positions.map(familyOf));
  const isGkSlot = slotFamily === 'gk';
  const isGkPlayer = naturalFamilies.has('gk');
  if (isGkSlot !== isGkPlayer) return 'gk';
  if (isGkSlot && isGkPlayer) return 'natural';
  if (naturalFamilies.has(slotFamily)) return 'natural';
  for (const fam of naturalFamilies) {
    if ((RELATED_FAMILIES[slotFamily] ?? []).includes(fam)) return 'related';
  }
  return 'unrelated';
}

const FIT_SCORE: Record<'natural' | 'related' | 'unrelated' | 'gk', number> = { natural: 0, related: 2, unrelated: 5, gk: 12 };

// Greedily assign 11 players to formation slots minimising the total positional
// penalty (GK slots resolved first so a keeper isn't stolen by an outfield slot).
// Returns an array where index i holds the player id for slots[i].
function arrangeByFit(ids: readonly number[], slots: readonly FormationSlotDef[], byId: Map<number, SquadPlayer>): number[] {
  const remaining = new Set(ids);
  const result: number[] = new Array(slots.length).fill(0);
  const order = slots.map((_, i) => i).sort((a, b) => (familyOf(slots[a].role) === 'gk' ? -1 : 0) - (familyOf(slots[b].role) === 'gk' ? -1 : 0));
  for (const slotIdx of order) {
    let best: number | null = null;
    let bestCost = Number.POSITIVE_INFINITY;
    for (const id of remaining) {
      const p = byId.get(id);
      if (!p) continue;
      const cost = FIT_SCORE[fitLevel(slots[slotIdx].role, p.positions)] - p.effectiveOverall / 100;
      if (cost < bestCost) {
        bestCost = cost;
        best = id;
      }
    }
    if (best != null) {
      result[slotIdx] = best;
      remaining.delete(best);
    }
  }
  // Any leftover ids (shouldn't happen with 11 slots) fill empty slots in order.
  const leftover = [...remaining];
  for (let i = 0; i < result.length && leftover.length; i += 1) {
    if (!result[i]) result[i] = leftover.shift() as number;
  }
  return result;
}

function seedStarters(formationId: string, initialFormationId: string, initialStarters: readonly number[], slots: readonly FormationSlotDef[], players: readonly SquadPlayer[], byId: Map<number, SquadPlayer>): number[] {
  const usable = formationId === initialFormationId;
  const chosen = initialStarters.filter((id) => byId.has(id)).slice(0, 11);
  if (usable && chosen.length === slots.length) return [...chosen];
  if (chosen.length < 11) {
    const used = new Set(chosen);
    const rest = players.filter((p) => !used.has(p.eaPlayerId) && p.availability === 'available').sort((a, b) => b.effectiveOverall - a.effectiveOverall);
    for (const p of rest) {
      if (chosen.length >= 11) break;
      chosen.push(p.eaPlayerId);
    }
  }
  return arrangeByFit(chosen, slots, byId);
}

// Shared vertical-pitch XI editor: a football pitch showing the starting eleven
// in their formation slots, with the replaceable squad members listed below.
// PreMatch and the Squad tab both render this; only the commit action differs.
//
// Drag-and-drop is built on raw pointer events. The floating token is a plain
// absolutely-positioned element we move on every pointermove, so it stays glued
// to the cursor — there is no native drag image that could drift.
export function LineupEditor({ formations, initialFormationId, players, initialStarters, busy, actionLabel, busyLabel, onCommit, intro, header, resetSignal = 0 }: Props) {
  const byId = useMemo(() => new Map(players.map((p) => [p.eaPlayerId, p])), [players]);
  const [formationId, setFormationId] = useState<string>(formations.some((f) => f.id === initialFormationId) ? initialFormationId : (formations[0]?.id ?? '4-3-3'));

  const formation = formations.find((f) => f.id === formationId) ?? formations[0];
  const slots: readonly FormationSlotDef[] = formation?.slots ?? [];

  const [starters, setStarters] = useState<number[]>(() => seedStarters(formationId, initialFormationId, initialStarters, slots, players, byId));
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  // Live pointer-drag session. `drag` drives rendering (ghost + highlights);
  // `dragRef` mirrors it so pointer handlers read the latest value synchronously.
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  // The item currently under the cursor while dragging (drop highlight target).
  const [dropTarget, setDropTarget] = useState<DragItem | null>(null);

  function setDragState(next: DragState | null) {
    dragRef.current = next;
    setDrag(next);
  }

  // Re-seed when the upstream lineup changes (e.g. after saving, advancing a
  // matchday, or a scouting move that alters the squad).
  useEffect(() => {
    const baseId = formations.some((f) => f.id === initialFormationId) ? initialFormationId : (formations[0]?.id ?? '4-3-3');
    const baseSlots = formations.find((f) => f.id === baseId)?.slots ?? [];
    setFormationId(baseId);
    setStarters(seedStarters(baseId, initialFormationId, initialStarters, baseSlots, players, byId));
    setSelectedSlot(null);
    setDragState(null);
    setDropTarget(null);
  }, [resetSignal, initialFormationId, initialStarters, players]);

  function changeFormation(nextId: string) {
    const nextSlots = formations.find((f) => f.id === nextId)?.slots ?? [];
    setStarters((prev) => arrangeByFit(prev, nextSlots, byId));
    setSelectedSlot(null);
    setFormationId(nextId);
  }

  const starterSet = new Set(starters);
  const bench = players.filter((p) => !starterSet.has(p.eaPlayerId)).sort((a, b) => b.effectiveOverall - a.effectiveOverall);

  const warnings = slots.reduce((count, slot, i) => {
    const p = byId.get(starters[i]);
    if (!p) return count;
    const fit = fitLevel(slot.role, p.positions);
    return fit === 'natural' ? count : count + 1;
  }, 0);

  function selectSlot(i: number) {
    setSelectedSlot((prev) => (prev === i ? null : i));
  }

  function swapIn(benchId: number) {
    if (selectedSlot == null) return;
    setStarters((prev) => {
      const next = [...prev];
      const benchIdx = next.indexOf(benchId);
      if (benchIdx >= 0) {
        const tmp = next[selectedSlot];
        next[selectedSlot] = benchId;
        next[benchIdx] = tmp;
      } else {
        next[selectedSlot] = benchId;
      }
      return next;
    });
    setSelectedSlot(null);
  }

  // Swap two players regardless of where they sit. slot↔slot reorders the XI;
  // slot↔bench brings the bench player on and sends the starter off.
  function applySwap(a: DragItem, b: DragItem) {
    if (isSameItem(a, b)) return;
    if (a.kind === 'slot' && b.kind === 'slot') {
      setStarters((prev) => {
        const next = [...prev];
        [next[a.index], next[b.index]] = [next[b.index], next[a.index]];
        return next;
      });
      return;
    }
    // Normalise to (slotItem, benchItem). bench↔bench is a no-op (both off-pitch).
    const slotItem = a.kind === 'slot' ? a : b.kind === 'slot' ? b : null;
    const benchItem = a.kind === 'bench' ? a : b.kind === 'bench' ? b : null;
    if (!slotItem || !benchItem) return;
    setStarters((prev) => {
      const next = [...prev];
      const benchIdx = next.indexOf(benchItem.id);
      if (benchIdx >= 0) {
        // The bench player was already a starter elsewhere — straight swap.
        const tmp = next[slotItem.index];
        next[slotItem.index] = benchItem.id;
        next[benchIdx] = tmp;
      } else {
        next[slotItem.index] = benchItem.id;
      }
      return next;
    });
  }

  function isDropTarget(item: DragItem): boolean {
    if (!drag?.active) return false;
    return isSameItem(dropTarget, item);
  }

  // Resolve the DragItem sitting under a screen coordinate by hit-testing the
  // DOM. Every drop zone tags itself with a data-drag-item attribute so we don't
  // depend on React refs for each of the (up to) 11 slots + full bench.
  function hitTest(x: number, y: number): DragItem | null {
    const el = document.elementFromPoint(x, y);
    const zone = el?.closest<HTMLElement>('[data-drag-item]');
    const raw = zone?.dataset.dragItem;
    if (!raw) return null;
    if (raw.startsWith('slot:')) return { kind: 'slot', index: Number(raw.slice(5)) };
    if (raw.startsWith('bench:')) return { kind: 'bench', id: Number(raw.slice(6)) };
    return null;
  }

  // Start a potential drag. It only becomes a real drag once the pointer moves
  // past DRAG_THRESHOLD_PX; a press without movement stays a tap/click.
  function beginDrag(item: DragItem, e: ReactPointerEvent) {
    if (busy || e.button !== 0) return;
    const p = item.kind === 'slot' ? byId.get(starters[item.index]) : byId.get(item.id);
    if (!p) return;
    if (item.kind === 'bench' && p.availability !== 'available') return;
    setDragState({
      item,
      pointerId: e.pointerId,
      faceUrl: p.faceUrl ?? null,
      label: p.shortName,
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      active: false,
    });
    setDropTarget(null);
  }

  // Window-level pointer tracking while a drag session exists. Registering on
  // window (not the element) means the drag keeps working even if the pointer
  // outruns the small token, and we always get the terminating pointerup.
  useEffect(() => {
    if (!drag) return;

    function onMove(e: PointerEvent) {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      const active = d.active || Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX;
      const next: DragState = { ...d, x: e.clientX, y: e.clientY, active };
      setDragState(next);
      if (active) {
        e.preventDefault();
        const over = hitTest(e.clientX, e.clientY);
        setDropTarget((prev) => (isSameItem(prev, over) ? prev : over));
      }
    }

    function finish(e: PointerEvent) {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      if (d.active) {
        const over = hitTest(e.clientX, e.clientY);
        if (over) applySwap(d.item, over);
      }
      setDragState(null);
      setDropTarget(null);
    }

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
    };
  }, [drag, starters, selectedSlot, byId]);

  return (
    <div className="fm-prematch">
      {header}
      <div className="fm-prematch-head">
        <div>
          <p className="section-title">Starting XI</p>
          <p className="muted">{intro ?? 'Drag any player onto another to swap them — pitch to pitch, or bench onto the pitch. Off-position players are dimmed.'}</p>
        </div>
        <label className="fm-formation-picker">
          <span>Formation</span>
          <select value={formationId} onChange={(e) => changeFormation(e.target.value)} disabled={busy}>
            {formations.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={`fm-editor-layout ${drag?.active ? 'is-dragging' : ''}`}>
        <div className="fm-editor-pitch">
          <div className="fm-formation-pitch fm-pitch-vertical">
            <div className="fm-pitch-lines" aria-hidden="true" />
            {slots.map((slot, i) => {
              const p = byId.get(starters[i]);
              const fit = p ? fitLevel(slot.role, p.positions) : 'natural';
              const item: DragItem = { kind: 'slot', index: i };
              // Vertical pitch, team attacks upward: GK (x≈0) at the bottom,
              // strikers (x≈1) at the top; slot.y (0..1 across) maps to horizontal.
              // Inset the placement band (6%–94% vertical, 8%–92% horizontal) so
              // edge rows keep their name/role labels inside the pitch.
              const top = `${6 + (1 - slot.x) * 88}%`;
              const left = `${8 + slot.y * 84}%`;
              const isSource = drag?.active && isSameItem(drag.item, item);
              return (
                <button
                  key={i}
                  data-drag-item={`slot:${i}`}
                  className={`fm-slot fit-${fit} ${selectedSlot === i ? 'selected' : ''} ${isSource ? 'dragging' : ''} ${isDropTarget(item) ? 'drop-hover' : ''}`}
                  style={{ left, top }}
                  onClick={() => selectSlot(i)}
                  disabled={busy}
                  onPointerDown={(e) => p && beginDrag(item, e)}
                  title={p ? `${p.shortName} — ${slot.role}` : slot.role}
                >
                  <span className="disc">{p ? <img src={p.faceUrl} alt={p.shortName} loading="lazy" draggable={false} /> : slot.role}</span>
                  <span className="fm-slot-name">{p ? p.shortName : 'Empty'}</span>
                  <span className="fm-slot-role">
                    {slot.role} · {p?.effectiveOverall ?? '—'}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="fm-prematch-meta">
            <span className={`fm-warn ${warnings > 0 ? 'bad' : 'ok'}`}>{warnings > 0 ? `⚠ ${warnings} player${warnings > 1 ? 's' : ''} out of position` : '✓ Everyone in position'}</span>
          </div>
        </div>

        <div className="fm-editor-bench">
          <p className="section-title">Substitutes {selectedSlot != null ? '— tap to bring on' : '— or drag onto the pitch'}</p>
          <div className="fm-bench-grid">
            {bench.map((p) => {
              const slot = selectedSlot != null ? slots[selectedSlot] : null;
              const fit = slot ? fitLevel(slot.role, p.positions) : 'natural';
              const available = p.availability === 'available';
              const tapActionable = !busy && selectedSlot != null && available;
              const item: DragItem = { kind: 'bench', id: p.eaPlayerId };
              const isSource = drag?.active && isSameItem(drag.item, item);
              return (
                <button
                  key={p.eaPlayerId}
                  data-drag-item={`bench:${p.eaPlayerId}`}
                  className={`fm-bench-row fit-${fit} ${tapActionable ? '' : 'not-actionable'} ${!available ? 'unavailable' : ''} ${isSource ? 'dragging' : ''} ${isDropTarget(item) ? 'drop-hover' : ''}`}
                  onClick={() => {
                    if (tapActionable) swapIn(p.eaPlayerId);
                  }}
                  onPointerDown={(e) => available && beginDrag(item, e)}
                  title={available ? `Drag ${p.shortName} onto the pitch` : `${p.shortName} is unavailable`}
                >
                  <img className="face" src={p.faceUrl} alt={p.shortName} loading="lazy" draggable={false} />
                  <span className="pos">{p.positions[0] ?? '—'}</span>
                  <span className="nm">{p.shortName}</span>
                  {p.availability !== 'available' && <span className="unavail">{p.availability === 'injured' ? '🚑' : '⛔'}</span>}
                  <span className="ovr">{p.effectiveOverall}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="actions">
        <button onClick={() => onCommit(starters, formationId)} disabled={busy || starters.length < 11}>
          {busy ? busyLabel : actionLabel}
        </button>
      </div>

      {drag?.active && (
        <div
          className="fm-drag-ghost"
          aria-hidden="true"
          style={{
            width: GHOST_SIZE,
            height: GHOST_SIZE,
            transform: `translate(${drag.x - GHOST_SIZE / 2}px, ${drag.y - GHOST_SIZE / 2}px)`,
          }}
        >
          {drag.faceUrl ? <img src={drag.faceUrl} alt="" draggable={false} /> : <span>{drag.label}</span>}
        </div>
      )}
    </div>
  );
}
