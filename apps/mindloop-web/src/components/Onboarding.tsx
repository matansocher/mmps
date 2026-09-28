import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { track } from '../lib/analytics';
import { recordPlay } from '../lib/history';
import { syncResult } from '../lib/player-sync';
import { localDay, readJson, removeJson, writeJson } from '../lib/progress';
import { playSound } from '../lib/sound';
import { newId } from '../lib/utils';
import { Icon } from './Icon';

const KEY = 'mindloop:onboarded';
export function hasOnboarded(): boolean {
  return readJson<number>(KEY, 0) === 1;
}
export function resetOnboarding(): void {
  removeJson(KEY);
}
export function Onboarding({ onClose }: { readonly onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    if (!started.current) {
      track('onboarding_started');
      started.current = true;
    }
    return () => element?.close();
  }, []);
  const [found, setFound] = useState(false);
  const [hint, setHint] = useState(false);
  function close() {
    writeJson(KEY, 1);
    track(found ? 'onboarding_completed' : 'onboarding_skipped');
    onClose();
  }
  async function choose(index: number) {
    if (index !== 2) {
      setHint(true);
      return;
    }
    if (found) return;
    setFound(true);
    playSound('success');
    const run = { runId: `warm-up-${localDay()}`, gameId: 'warm-up', score: 0, at: new Date().toISOString(), day: localDay(), mode: 'practice' as const, version: 2 };
    // Replaying the welcome does not generate unlimited progress.
    if (!readJson('mindloop:warmup-earned', false)) {
      await recordPlay({ ...run, runId: newId() });
      syncResult();
    }
  }
  return (
    <dialog
      ref={dialog}
      className="ml-welcome"
      aria-label="Welcome to Mindloop"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <div className="ml-welcome-top">
        <span className="ml-brand">
          <Icon name="leaf" /> mindloop.
        </span>
        <button className="ml-text-button" onClick={close}>
          Skip intro
        </button>
      </div>
      <div className="ml-welcome-body">
        <p className="ml-eyebrow">A SMALL MOMENT FOR YOURSELF</p>
        <h1>{found ? 'There’s your first little win.' : 'Let’s start with a little curiosity.'}</h1>
        <p>{found ? 'Warm-up complete. Your first step counts toward today’s loop.' : 'One of these shapes is different. Tap it.'}</p>
        <div className="ml-warmup">
          {[0, 1, 2, 3].map((i) => (
            <button key={i} disabled={found} aria-label={`Shape ${i + 1}`} onClick={() => choose(i)}>
              <span className={i === 2 ? 'diamond' : 'circle'} />
              {found && i === 2 && <Icon name="check" />}
            </button>
          ))}
        </div>
        <p role="status">{hint && !found ? 'Look for the shape with corners. No timer, no pressure.' : found ? 'A little play is all it takes to get started.' : 'No timer. Just give it a try.'}</p>
        {found && (
          <Link className="ml-primary" to="/" onClick={close}>
            Continue to today’s loop <Icon name="arrow" />
          </Link>
        )}
      </div>
    </dialog>
  );
}
