import { MotionConfig, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { CountdownOverlay } from '../components/CountdownOverlay';
import { GameStage } from '../components/GameStage';
import { HUD } from '../components/HUD';
import { useTheme } from '../hooks/useTheme';
import { CATEGORIES } from '../lib/categories';
import { playSound } from '../lib/sound';
import type { GameProps } from '../lib/types';
import { cx } from '../lib/utils';
import { createOrderUpState, createOrderWave, INGREDIENTS, ORDER_UP_WAVES, orderUpReducer, orderUpResult } from './order-up';
import type { Ingredient } from './order-up';

const accent = CATEGORIES.memory.accent;
const control =
  'ml-tap min-h-11 rounded-xl px-3 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-600 disabled:cursor-not-allowed disabled:opacity-45';

function FoodArt({ ingredient }: { readonly ingredient: Ingredient }) {
  return (
    <svg viewBox="0 0 48 48" width="36" height="36" aria-hidden="true" focusable="false">
      {ingredient === 'apple' && <path d="M24 15C8 5 3 22 12 36c5 8 10 3 12 3s7 5 12-3c9-14 4-31-12-21Z" fill="#dc4b4b" />}
      {ingredient === 'pear' && <path d="M19 12c0 13-11 15-10 24 2 12 28 12 30 0 1-9-10-11-10-24Z" fill="#b6c851" />}
      {(ingredient === 'apple' || ingredient === 'pear') && <path d="M24 15V6m1 4q8-10 12-5-2 9-12 5Z" fill="#45844b" stroke="#38653b" strokeWidth="2" />}
      {ingredient === 'banana' && <path d="M10 8c-9 26 12 39 30 17C21 31 16 24 15 7Z" fill="#f8cf4e" stroke="#b98b25" strokeWidth="2" />}
      {ingredient === 'berry' && (
        <>
          <path d="m24 8-8-4 3 10-9-1 8 7h13l8-7-10 1 3-10Z" fill="#45844b" />
          <path d="M9 20c0-12 30-12 30 0 0 9-12 23-15 23S9 29 9 20Z" fill="#d74967" />
          <path d="m18 21 1 2m9-2 1 2m-6 6 1 2" stroke="#fff0c9" strokeWidth="3" strokeLinecap="round" />
        </>
      )}
      {ingredient === 'mint' && (
        <>
          <path d="M24 42V14" stroke="#38774e" strokeWidth="3" />
          <path d="M24 30Q3 29 7 12q19 0 17 18Zm0-9Q23 3 41 6q1 17-17 15Z" fill="#4ba275" />
          <path d="m13 19 11 11L35 12" fill="none" stroke="#d2ebcb" strokeWidth="2" />
        </>
      )}
      {ingredient === 'lemon' && (
        <>
          <path d="M7 28C1 13 19 2 33 12l8 1-1 8C47 36 27 45 14 35l-7-1Z" fill="#f0cf43" stroke="#b69a20" strokeWidth="2" />
          <path d="M14 23q2-8 10-8" fill="none" stroke="#fff2aa" strokeWidth="3" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

function CustomerArt({ index }: { readonly index: number }) {
  const shirts = ['#138478', '#a36eae', '#cf8235'];
  return (
    <svg viewBox="0 0 64 64" width="42" height="42" aria-hidden="true" focusable="false">
      <path d="M8 63q0-24 24-24t24 24" fill={shirts[index]} />
      <ellipse cx="32" cy="27" rx="17" ry="20" fill={index === 1 ? '#be865f' : '#edbf94'} />
      <path d={index === 2 ? 'M15 27Q3 0 33 4q25 0 19 30L42 14 17 22Z' : 'M14 25Q10 1 33 4q23 0 18 22l-9-13q-9 10-28 12Z'} fill="#503e38" />
      <path d="M26 27v2m12-2v2m-12 6q6 5 12 0" stroke="#503e38" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function OrderUp({ onFinish }: GameProps) {
  const { reducedMotion } = useTheme();
  const systemReducedMotion = useReducedMotion();
  const [state, dispatch] = useReducer(orderUpReducer, undefined, () => createOrderUpState(Array.from({ length: ORDER_UP_WAVES }, (_, index) => createOrderWave(index))));
  const finished = useRef(false);
  const soundedAttempt = useRef(0);
  const wave = state.waves[state.waveIndex];
  const selected = wave.orders.find((order) => order.id === state.selectedId)!;
  const draft = state.drafts[selected.id] ?? [];
  const canAssemble = state.phase === 'serve' && !state.resolved[selected.id];
  const start = useCallback(() => dispatch({ type: 'start' }), []);

  useEffect(() => {
    if (state.phase !== 'watch') return;
    const deadline = Date.now() + wave.revealSeconds * 1000;
    const timer = window.setInterval(() => {
      dispatch({ type: 'tick', wave: wave.index, remaining: Math.max(0, Math.ceil((deadline - Date.now()) / 1000)) });
    }, 100);
    return () => window.clearInterval(timer);
  }, [state.phase, wave]);

  useEffect(() => {
    if (state.attempted <= soundedAttempt.current) return;
    soundedAttempt.current = state.attempted;
    playSound(state.lastCorrect ? 'correct' : 'wrong');
  }, [state.attempted, state.lastCorrect]);

  useEffect(() => {
    if (state.phase !== 'over' || finished.current) return;
    finished.current = true;
    onFinish(orderUpResult(state));
  }, [state, onFinish]);

  const customerAction = (type: 'serve' | 'skip' | 'undo' | 'clear') => dispatch({ type, wave: wave.index, customerId: selected.id });
  const phaseTitle = state.phase === 'watch' ? 'Watch the orders' : state.phase === 'update' ? 'A customer changed their mind' : state.phase === 'between' ? 'Counter cleared' : 'Serve from memory';
  const updateCustomer = wave.orders.find((order) => order.id === wave.update?.customerId);

  return (
    <div className="relative flex flex-1 flex-col">
      {state.phase === 'ready' && (
        <MotionConfig reducedMotion={reducedMotion || systemReducedMotion ? 'always' : 'never'}>
          <CountdownOverlay accent={accent} onDone={start} />
        </MotionConfig>
      )}
      <GameStage hud={<HUD accent={accent} score={state.score} status={`${state.waveIndex + 1}/${ORDER_UP_WAVES}`} statusLabel="Wave" />}>
        <section
          aria-label="Order Up café"
          className="w-full max-w-xl overflow-hidden rounded-3xl border border-teal-200 bg-[#fffdf6] text-slate-800 shadow-sm dark:border-teal-800 dark:bg-slate-900 dark:text-slate-100"
        >
          <div aria-hidden="true" className="h-4 bg-[repeating-linear-gradient(90deg,#147d72_0px,#147d72_28px,#d9efe7_28px,#d9efe7_56px)]" />
          <div className="p-4 sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">{phaseTitle}</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {state.phase === 'watch'
                    ? 'Remember each list, top to bottom.'
                    : state.phase === 'update'
                      ? 'Keep the order, replace just one ingredient.'
                      : state.phase === 'between'
                        ? 'Take a breath before the next wave.'
                        : 'Pick a customer. Build their list in order.'}
                </p>
              </div>
              <span className="shrink-0 text-right text-sm font-semibold text-teal-800 dark:text-teal-200">
                Streak
                <br />
                {state.streak}
              </span>
            </div>

            {state.phase === 'watch' && (
              <div className="mb-4 flex items-center justify-between gap-2 rounded-xl bg-teal-50 px-3 py-2 text-sm text-teal-900 dark:bg-teal-950 dark:text-teal-100">
                <span role="timer" aria-label="Seconds until orders hide">
                  Hiding in <strong className="tabular-nums">{state.remaining}s</strong>
                </span>
                <button type="button" className={cx(control, 'bg-teal-700 text-white hover:bg-teal-800')} onClick={() => dispatch({ type: 'hide', wave: wave.index })}>
                  Ready — hide
                </button>
              </div>
            )}

            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${wave.orders.length}, minmax(0, 1fr))` }}>
              {wave.orders.map((order, index) => {
                const result = state.resolved[order.id];
                return (
                  <div
                    key={order.id}
                    className={cx(
                      'min-w-0 rounded-2xl border-2 p-2',
                      state.selectedId === order.id && state.phase === 'serve' ? 'border-teal-600 dark:border-teal-400' : 'border-slate-200 dark:border-slate-700',
                    )}
                  >
                    <button
                      type="button"
                      disabled={state.phase !== 'serve' || !!result}
                      aria-pressed={state.selectedId === order.id && state.phase === 'serve'}
                      aria-label={`Select ${order.name}${result ? `, ${result === 'correct' ? 'served' : 'order lost'}` : ''}`}
                      onClick={() => dispatch({ type: 'select', wave: wave.index, customerId: order.id })}
                      className={cx(control, 'flex w-full flex-col items-center px-0 hover:bg-teal-50 disabled:opacity-100 dark:hover:bg-teal-950')}
                    >
                      <CustomerArt index={index} />
                      {order.name}
                    </button>
                    {state.phase === 'watch' ? (
                      <ol aria-label={`${order.name}'s order`} className="mt-2 space-y-1">
                        {order.ingredients.map((ingredient, position) => (
                          <li key={position} className="flex items-center justify-center gap-1 text-xs sm:text-sm">
                            <span className="text-slate-500 dark:text-slate-400">{position + 1}.</span>
                            <span className="capitalize">{ingredient}</span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="mt-1 text-center text-xs font-medium text-slate-600 dark:text-slate-300">
                        {result
                          ? result === 'correct'
                            ? '✓ Served'
                            : 'Order lost'
                          : state.phase === 'serve'
                            ? `${state.drafts[order.id]?.length ?? 0}/${order.ingredients.length} on tray`
                            : 'Order hidden'}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {state.phase === 'update' && wave.update && (
              <div className="mt-4 rounded-2xl bg-amber-100 p-4 text-amber-950 dark:bg-amber-950 dark:text-amber-100">
                <p className="font-bold">
                  {updateCustomer?.name}: “Swap {wave.update.from} for {wave.update.to}.”
                </p>
                <p className="mt-1 text-sm">Everything else stays in the same position. This note hides when you start serving.</p>
                <button type="button" className={cx(control, 'mt-3 w-full bg-teal-700 text-white hover:bg-teal-800')} onClick={() => dispatch({ type: 'acknowledge', wave: wave.index })}>
                  Got it — start serving
                </button>
              </div>
            )}

            {state.phase === 'serve' && (
              <div className="mt-4">
                {canAssemble ? (
                  <>
                    <h3 className="text-sm font-bold">
                      {selected.name}’s tray <span className="font-normal text-slate-600 dark:text-slate-300">· drafts stay when you switch</span>
                    </h3>
                    <ol aria-label={`${selected.name}'s assembled ingredients`} className="my-3 flex min-h-16 gap-2 rounded-xl border border-dashed border-teal-400 bg-teal-50/70 p-2 dark:bg-teal-950">
                      {Array.from({ length: selected.ingredients.length }, (_, position) => (
                        <li key={position} className="flex min-w-0 flex-1 flex-col items-center justify-center text-xs">
                          {draft[position] ? (
                            <>
                              <FoodArt ingredient={draft[position]} />
                              <span className="capitalize">
                                {position + 1}. {draft[position]}
                              </span>
                            </>
                          ) : (
                            <span className="text-slate-500 dark:text-slate-400">{position + 1}. Empty</span>
                          )}
                        </li>
                      ))}
                    </ol>
                    <div className="grid grid-cols-3 gap-2" aria-label="Ingredient counter">
                      {INGREDIENTS.map((ingredient) => (
                        <button
                          key={ingredient}
                          type="button"
                          aria-label={`Add ${ingredient}`}
                          disabled={draft.length >= selected.ingredients.length}
                          className={cx(
                            control,
                            'flex flex-col items-center border border-slate-200 bg-white text-sm capitalize hover:bg-teal-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-teal-950',
                          )}
                          onClick={() => dispatch({ type: 'add', wave: wave.index, customerId: selected.id, ingredient })}
                        >
                          <FoodArt ingredient={ingredient} />
                          {ingredient}
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        className={cx(control, 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700')}
                        disabled={!draft.length}
                        onClick={() => customerAction('undo')}
                      >
                        Undo
                      </button>
                      <button
                        type="button"
                        className={cx(control, 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700')}
                        disabled={!draft.length}
                        onClick={() => customerAction('clear')}
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        className={cx(control, 'flex-1 bg-teal-700 text-white hover:bg-teal-800')}
                        disabled={draft.length !== selected.ingredients.length}
                        onClick={() => customerAction('serve')}
                      >
                        Serve order
                      </button>
                    </div>
                    <button
                      type="button"
                      className={cx(control, 'mt-1 text-sm text-slate-600 underline underline-offset-4 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white')}
                      onClick={() => customerAction('skip')}
                    >
                      Skip order (breaks streak)
                    </button>
                  </>
                ) : (
                  <p className="rounded-xl bg-teal-50 p-4 text-sm text-teal-900 dark:bg-teal-950 dark:text-teal-100">Choose another customer above to keep serving.</p>
                )}
              </div>
            )}

            <p role="status" aria-live="polite" className="mt-3 min-h-5 text-sm font-semibold">
              {state.feedback}
            </p>
            {state.phase === 'between' && (
              <button type="button" className={cx(control, 'mt-2 w-full bg-teal-700 text-white hover:bg-teal-800')} onClick={() => dispatch({ type: 'next', wave: wave.index })}>
                {state.waveIndex === ORDER_UP_WAVES - 1 ? 'Finish shift' : 'Next wave'}
              </button>
            )}
          </div>
        </section>
      </GameStage>
    </div>
  );
}
