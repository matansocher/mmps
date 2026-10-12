import { useEffect, useLayoutEffect, useReducer, useRef, useState, useSyncExternalStore } from 'react';
import { mergeProgress, parseCloudJourney, roomNumber } from '../../../src/shared/rewind';
import { GameAudio } from './audio';
import { initializeIdentity, journeyStorageKey, JourneySync } from './cloud';
import type { Identity, RemoteChange, SyncStatus } from './cloud';
import { ARROWS, Board, CampaignMap, ConceptArt, JourneyArt, OfflineSettings, Sheet, Stars, useOffline } from './components';
import {
  acknowledgeUnlock,
  availableInteractions,
  chapterById,
  CHAPTERS,
  createSession,
  DEFAULT_SETTINGS,
  earnProgress,
  emptyProgress,
  getGuidance,
  inspectObject,
  interactionLabel,
  introductionById,
  isAvailable,
  isBridge,
  isCleared,
  isMirror,
  JOURNEY,
  LEGACY_PROGRESS_KEY,
  levelById,
  LEVELS,
  nextLevelId,
  packRoom,
  pendingReward,
  PROGRESS_KEY,
  readCheckpoint,
  readProgress,
  readSettings,
  reduceSession,
  restoredChapters,
  restoreRoom,
  saveCheckpoint,
  saveProgress,
  saveSettings,
  skipBalance,
  skipLevel,
  twoStarTarget,
} from './game';
import type { Direction, GameAction, GameEvent, Progress, Session, Settings, Unlock } from './game';

type Model = {
  readonly session: Session;
  readonly progress: Progress;
  readonly notice: string;
  readonly canSave: boolean;
  readonly soundSequence: number;
  readonly soundEvents: readonly GameEvent[];
  readonly localSequence: number;
};
type LocalAction =
  | GameAction
  | { readonly type: 'open'; readonly id: number }
  | { readonly type: 'ack'; readonly unlock: Unlock }
  | { readonly type: 'skip' }
  | { readonly type: 'reset' }
  | { readonly type: 'dismiss-notice' };
type Action = LocalAction | { readonly type: 'remote'; readonly change: RemoteChange } | { readonly type: 'import'; readonly progress: Progress };
type CloudSetup = { readonly sync: JourneySync | null; readonly identity: Identity | null; readonly error: string };
const LOCAL_STATUS: SyncStatus = { state: 'local', notice: '' };
const localSubscribe = () => () => {};
const localSnapshot = () => LOCAL_STATUS;
const roomFromHash = () => /^#room-(\d+)$/.exec(window.location.hash)?.[1];

function initialModel(cloud: CloudSetup): Model {
  let progress = emptyProgress();
  let notice = cloud.error;
  let canSave = !cloud.error;
  try {
    progress = cloud.sync ? cloud.sync.journey.progress : cloud.error ? emptyProgress() : readProgress(window.localStorage);
    if (cloud.sync?.migrated || (!cloud.sync && !cloud.error && !window.localStorage.getItem(PROGRESS_KEY) && window.localStorage.getItem(LEGACY_PROGRESS_KEY))) {
      notice = 'New puzzles, a shorter path. Your previous save is untouched; unchanged rooms keep their stars.';
    }
  } catch (error) {
    console.warn('Rewind could not read progress.', error);
    notice = 'Saved progress could not be read. You can play without saving, or reset progress in Settings.';
    canSave = false;
  }
  let session = createSession(levelById(nextLevelId(progress)));
  if (canSave) {
    try {
      const savedRoom = cloud.sync?.journey.room;
      session = cloud.sync ? (savedRoom ? restoreRoom(savedRoom, LEVELS, progress) : session) : (readCheckpoint(window.localStorage, LEVELS, progress) ?? session);
    } catch (error) {
      console.warn('Rewind could not restore the room.', error);
      notice = 'The last room could not be restored. Your earned stars are kept; this room starts fresh.';
    }
  }
  const requested = Number(roomFromHash());
  if (requested && isAvailable(progress, requested) && session.state.level.id !== requested) session = createSession(levelById(requested));
  return { session, progress: earnProgress(progress, session.state), notice, canSave, soundSequence: 0, soundEvents: [], localSequence: 0 };
}

function reduceLocalModel(model: Model, action: LocalAction): Model {
  if (action.type === 'dismiss-notice') return { ...model, notice: '' };
  if (action.type === 'reset') return { ...model, session: createSession(LEVELS[0]), progress: emptyProgress(), notice: '', canSave: true, soundEvents: [] };
  if (action.type === 'ack') return { ...model, progress: acknowledgeUnlock(model.progress, action.unlock) };
  if (action.type === 'open') {
    if (!isAvailable(model.progress, action.id)) throw new Error('This room is not unlocked');
    return action.id === model.session.state.level.id && !model.session.state.won ? model : { ...model, session: createSession(levelById(action.id)), soundEvents: [] };
  }
  if (action.type === 'skip') {
    const progress = skipLevel(model.progress, model.session.state.level.id);
    return { ...model, progress, session: createSession(levelById(nextLevelId(progress))), soundEvents: [] };
  }
  const session = reduceSession(model.session, action);
  if (session === model.session) return model;
  return {
    ...model,
    session,
    progress: earnProgress(model.progress, session.state),
    soundSequence: model.soundSequence + 1,
    soundEvents: action.type === 'move' || action.type === 'interact' ? session.state.events : [],
  };
}

function reduceModel(model: Model, action: Action): Model {
  if (action.type === 'remote') {
    const { progress, room, replaceRoom, reset } = action.change;
    let session = reset ? createSession(levelById(nextLevelId(progress))) : model.session;
    let notice = reset ? 'Your journey was reset. This device now uses the fresh shared save.' : model.notice;
    if (replaceRoom && room) {
      try {
        session = restoreRoom(room, LEVELS, progress);
      } catch (error) {
        console.warn('Rewind could not restore the shared room.', error);
        session = createSession(levelById(nextLevelId(progress)));
        notice = 'The shared room has changed. Your stars are safe; continue from a fresh room.';
      }
    } else if (replaceRoom && !room) session = createSession(levelById(nextLevelId(progress)));
    return { ...model, progress, session, notice, localSequence: 0, soundEvents: [] };
  }
  if (action.type === 'import') {
    const result = mergeProgress(model.progress, action.progress);
    return {
      ...model,
      progress: result.progress,
      localSequence: model.localSequence + 1,
      notice: result.rejectedSkips.length ? 'Your stars were imported. Some skips were already spent on your other device.' : 'This browser’s progress was added to your Telegram journey.',
    };
  }
  const next = reduceLocalModel(model, action);
  return next === model ? model : { ...next, localSequence: model.localSequence + 1 };
}

export function App() {
  const offline = useOffline();
  const [cloud] = useState<CloudSetup>(() => {
    let identity: Identity | null = null;
    try {
      identity = initializeIdentity();
      return { sync: identity ? new JourneySync(identity, window.localStorage) : null, identity, error: '' };
    } catch (error) {
      console.warn('Rewind could not open the Telegram journey.', error);
      return {
        sync: null,
        identity,
        error: 'Your Telegram journey could not be opened. Allow browser storage and reopen the game from Telegram. This visit will not overwrite your saves.',
      };
    }
  });
  const syncStatus = useSyncExternalStore(cloud.sync?.subscribe ?? localSubscribe, cloud.sync?.getSnapshot ?? localSnapshot);
  const saveLabel =
    syncStatus.state === 'local'
      ? 'Saved on this device'
      : syncStatus.state === 'saved'
        ? 'Saved with Telegram'
        : syncStatus.state === 'syncing'
          ? 'Saving your journey…'
          : syncStatus.state === 'pending'
            ? 'Changes waiting to sync'
            : 'Sync paused · open Settings';
  const [model, dispatch] = useReducer(reduceModel, cloud, initialModel);
  const [screen, setScreen] = useState<'map' | 'room'>(() => (roomFromHash() && isAvailable(model.progress, Number(roomFromHash())) ? 'room' : 'map'));
  const [gate, setGate] = useState(true);
  const [panel, setPanel] = useState<'help' | 'settings' | 'reset' | 'skip' | 'restart' | 'import' | 'recover' | null>(null);
  const [resetBusy, setResetBusy] = useState(false);
  const [hintShown, setHintShown] = useState(false);
  const [inspection, setInspection] = useState<number | null>(null);
  const [saveError, setSaveError] = useState('');
  const [audioError, setAudioError] = useState('');
  const [savedSettings] = useState(() => {
    try {
      return { value: readSettings(window.localStorage), error: '' };
    } catch (error) {
      console.warn('Rewind could not read settings.', error);
      return { value: DEFAULT_SETTINGS, error: 'Your settings could not be restored. Sound is off; choose your preferences again below.' };
    }
  });
  const [settings, setSettings] = useState<Settings>(savedSettings.value);
  const [settingsError, setSettingsError] = useState(savedSettings.error);
  const [audioBusy, setAudioBusy] = useState(false);
  const audio = useRef(new GameAudio());
  const mapScroll = useRef(0);
  const lastSound = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const { progress, session } = model;
  const { state } = session;
  const { level } = state;
  const chapter = chapterById(level.chapter);
  const unlock: Unlock | undefined =
    screen === 'room' && gate
      ? (pendingReward(progress) ??
        (level.introduction && !progress.seen.includes(`concept-${level.introduction}`) ? { id: `concept-${level.introduction}`, kind: 'concept', chapter: level.introduction } : undefined))
      : undefined;
  const nextChapter = unlock?.kind === 'chapter' ? CHAPTERS[CHAPTERS.findIndex((item) => item.id === unlock.chapter) + 1] : undefined;
  const introducedChapter = unlock?.kind === 'concept' ? introductionById(unlock.chapter) : nextChapter;
  const guidance = (inspection === null ? null : inspectObject(state, inspection)) ?? getGuidance(state);
  const interactions = availableInteractions(state);
  const roomHasInteractions = state.board.tiles.some((tile) => tile === 'l' || isBridge(tile) || isMirror(tile));
  const selectedInteraction = inspection !== null && interactions.includes(inspection) ? inspection : interactions.length === 1 ? interactions[0] : undefined;
  const showSkips = progress.seen.includes('skips');
  const hasAttempt = session.actions.length > 0 && !state.won;

  function map(history = true) {
    setScreen('map');
    setPanel(null);
    setInspection(null);
    if (history) window.history.pushState(null, '', '#map');
  }
  function open(id: number, history = true) {
    if (!isAvailable(progress, id)) {
      setAudioError('That room is still locked. Continue from the next open room.');
      map(false);
      return;
    }
    if (screen === 'map') mapScroll.current = window.scrollY;
    dispatch({ type: 'open', id });
    setGate(true);
    setScreen('room');
    setInspection(null);
    setHintShown(false);
    setPanel(null);
    if (history) window.history.pushState(null, '', `#room-${id}`);
  }
  function audioFailure(error: unknown) {
    console.warn('Rewind audio is unavailable.', error);
    setAudioError('Sound could not start on this device. The game is still playable without it.');
    setSettings((current) => ({ ...current, sound: false }));
  }
  function act(action: GameAction) {
    setGate(false);
    setInspection(null);
    if (settings.sound) void audio.current.enable(true).catch(audioFailure);
    dispatch(action);
  }
  function inspect(position: number) {
    if (inspectObject(state, position)) setInspection(position);
  }
  async function changeSettings(next: Settings) {
    setAudioBusy(true);
    setSettingsError('');
    try {
      await audio.current.enable(next.sound);
      setSettings(next);
      try {
        saveSettings(window.localStorage, next);
      } catch (error) {
        console.warn('Rewind could not save settings.', error);
        setSettingsError('This setting works now, but could not be saved for your next visit.');
      }
    } catch (error) {
      audioFailure(error);
    } finally {
      setAudioBusy(false);
    }
  }
  async function resetProgress() {
    setResetBusy(true);
    try {
      if (cloud.sync) await cloud.sync.reset();
      else {
        saveProgress(window.localStorage, emptyProgress());
        saveCheckpoint(window.localStorage, createSession(LEVELS[0]));
        dispatch({ type: 'reset' });
      }

      dispatch({ type: 'dismiss-notice' });
      setSaveError('');
      mapScroll.current = 0;
      map();
    } catch (error) {
      console.warn('Rewind could not reset progress.', error);
      setSaveError(
        cloud.sync ? 'The shared reset could not be confirmed. Connect to the internet, sync, and try again.' : 'Progress could not be reset on this device. Check that browser storage is allowed.',
      );
    } finally {
      setResetBusy(false);
    }
  }

  async function recoverCloud() {
    if (!cloud.identity) return;
    setResetBusy(true);
    try {
      const response = await fetch('/api/rewind/progress', { headers: cloud.identity.headers, cache: 'no-store', signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error('Cloud recovery was not authorized or available');
      const data: unknown = await response.json();
      if (!data || typeof data !== 'object' || !('journey' in data)) throw new Error('Invalid cloud recovery response');
      const journey = parseCloudJourney(data.journey);
      const key = journeyStorageKey(cloud.identity.userId);
      const previous = window.localStorage.getItem(key);
      if (previous) window.localStorage.setItem(`${key}.recovery-backup`, previous);
      window.localStorage.setItem(key, JSON.stringify({ ...journey, dirty: false, roomDirty: false }));
      window.location.reload();
    } catch (error) {
      console.warn('Rewind could not recover the cloud journey.', error);
      setSaveError('Recovery could not finish. Check your connection and browser storage, then reopen from Telegram to retry. Your original cache is kept.');
    } finally {
      setResetBusy(false);
    }
  }

  useLayoutEffect(() => {
    if (!model.canSave || saveError) return;
    try {
      if (cloud.sync) {
        if (model.localSequence) cloud.sync.update(progress, packRoom(session));
      } else {
        saveProgress(window.localStorage, progress);
        saveCheckpoint(window.localStorage, session);
      }
    } catch (error) {
      console.warn('Rewind could not save the journey.', error);
      setSaveError('Saving is paused. Your current game still works, but changes may be lost when you leave.');
    }
  }, [progress, session, model.canSave, model.localSequence, saveError, cloud]);

  useEffect(() => {
    const sync = cloud.sync;
    if (!sync) return;
    const stop = sync.start((change) => dispatch({ type: 'remote', change }));
    const refresh = () => {
      if (document.visibilityState === 'visible') void sync.sync();
    };
    const flush = () => {
      void sync.sync();
    };
    window.addEventListener('online', refresh);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', flush);
    const interval = window.setInterval(refresh, 30000);
    return () => {
      stop();
      window.removeEventListener('online', refresh);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', flush);
      window.clearInterval(interval);
    };
  }, [cloud]);

  useEffect(() => {
    if (model.soundSequence !== lastSound.current) {
      lastSound.current = model.soundSequence;
      if (settings.sound) audio.current.play(model.soundEvents);
    }
  }, [model.soundSequence, model.soundEvents, settings.sound]);

  useEffect(() => {
    const player = audio.current;
    return () => {
      void player.close().catch((error) => console.warn('Rewind could not close audio.', error));
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(settings.reducedMotion);
  }, [settings.reducedMotion]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      window.scrollTo(0, screen === 'map' ? mapScroll.current : 0);
      (screen === 'map' ? document.querySelector<HTMLElement>('.map-intro h1') : heading.current)?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [screen, level.id, unlock?.id]);

  useEffect(() => {
    function back() {
      const id = Number(roomFromHash());
      if (id && isAvailable(progress, id)) open(id, false);
      else map(false);
    }
    window.addEventListener('popstate', back);
    return () => window.removeEventListener('popstate', back);
  });

  useEffect(() => {
    if (screen === 'room' && Number(roomFromHash()) !== level.id) window.history.replaceState(null, '', `#room-${level.id}`);
  }, [screen, level.id]);

  useEffect(() => {
    if (screen !== 'room' || panel || unlock) return;
    const keys: Readonly<Record<string, Direction>> = { arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down', arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right' };
    function keydown(event: KeyboardEvent) {
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.repeat ||
        (event.target instanceof HTMLElement && (event.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)))
      )
        return;
      const key = event.key.toLowerCase();
      if (!(key in keys) && !['u', 'r', 'escape', 'e'].includes(key)) return;
      event.preventDefault();
      if (key in keys) act({ type: 'move', move: keys[key] });
      else if (key === 'u') act({ type: 'undo' });
      else if (key === 'r' || key === 'escape') setPanel('restart');
      else if (selectedInteraction !== undefined) act({ type: 'interact', position: selectedInteraction });
    }
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  });

  return (
    <div className={`app ${screen === 'map' ? 'map-app' : 'room-app'}`}>
      {(model.notice || saveError || audioError) && (
        <aside className="notice" role="status">
          <p>{saveError || audioError || model.notice}</p>
          {saveError && model.canSave && (
            <button className="quiet-button" onClick={() => setSaveError('')}>
              Retry saving
            </button>
          )}
          {!model.canSave && (
            <button className="quiet-button" onClick={() => setPanel('settings')}>
              Settings
            </button>
          )}
          {model.canSave && !saveError && (
            <button
              className="quiet-button"
              onClick={() => {
                dispatch({ type: 'dismiss-notice' });
                setAudioError('');
              }}
            >
              Dismiss
            </button>
          )}
        </aside>
      )}
      {screen === 'map' ? (
        <CampaignMap
          progress={progress}
          resumeId={level.id}
          hasAttempt={hasAttempt}
          onOpen={open}
          onHelp={() => setPanel('help')}
          onSettings={() => setPanel('settings')}
          saveLabel={model.canSave && !saveError ? saveLabel : 'Saving needs attention'}
        />
      ) : (
        <>
          <header className="app-header">
            <button className="quiet-button" onClick={() => map()}>
              <span aria-hidden="true">←</span> The path
            </button>
            <span className="header-chapter">{chapter.name}</span>
            <button className="quiet-button" onClick={() => setPanel('help')}>
              Help
            </button>
          </header>
          {unlock ? (
            <main className="unlock-screen">
              <p className="eyebrow">{unlock.kind === 'chapter' ? `${chapterById(unlock.chapter).name} · Path cleared` : `Room ${roomNumber(level.id)} · A new discovery`}</p>
              {introducedChapter ? (
                <div className="unlock-art">
                  <ConceptArt concept={introducedChapter.concept} />
                </div>
              ) : (
                <JourneyArt restored={restoredChapters(progress)} />
              )}
              {unlock.kind === 'chapter' && <p className="restoration-reveal">{JOURNEY[unlock.chapter - 1].restored}</p>}
              <h1 ref={heading} tabIndex={-1}>
                {introducedChapter?.title ?? 'The light comes home.'}
              </h1>
              <p>{introducedChapter?.explanation ?? 'Revisit a room for a shorter route, or return for the stars you left behind. The valley is yours to explore.'}</p>
              {unlock.kind === 'concept' && <p className="supporting">{JOURNEY[unlock.chapter - 1].detail}</p>}
              {unlock.kind !== 'concept' && (
                <div className="unlock-reward">
                  <strong>+2 skips</strong>
                  <span>Added once for clearing this chapter.</span>
                </div>
              )}
              {unlock.kind === 'chapter' && !showSkips && <p className="supporting">Use a skip when you want a fresh puzzle. The unfinished room stays available for later, without stars.</p>}
              <button
                className="primary-button"
                onClick={() => {
                  dispatch({ type: 'ack', unlock });
                  if (unlock.kind === 'chapter' && unlock.chapter === CHAPTERS.at(-1)!.id) map();
                }}
              >
                {unlock.kind === 'concept' ? 'Enter the room' : nextChapter ? `Enter ${nextChapter.name.replace(/^The /, 'the ')}` : 'Back to the path'} <span aria-hidden="true">→</span>
              </button>
            </main>
          ) : (
            <main className="game">
              <section className="game-heading">
                <p className="eyebrow">
                  Room {roomNumber(level.id)} / {LEVELS.length}
                  {level.difficulty >= 8 ? ' · Chapter challenge' : ''}
                </p>
                <h1 ref={heading} tabIndex={-1}>
                  {level.name}
                </h1>
                <div className="budgets">
                  <span>
                    <strong data-move-count={state.moves}>{state.moves}</strong> moves
                  </span>
                  <span>★ ★ ★ in {level.par} moves</span>
                </div>
              </section>
              <section className="guidance" aria-live="polite">
                <h2>{guidance.title}</h2>
                {guidance.detail && <p>{guidance.detail}</p>}
              </section>
              <Board state={state} guidance={guidance} onMove={(move) => act({ type: 'move', move })} onInspect={inspect} />
              {state.won ? (
                <section className="win-panel" aria-label="Room completed">
                  <Stars count={1 + Number(state.moves <= twoStarTarget(level)) + Number(state.moves <= level.par)} />
                  <p>{state.moves <= level.par ? 'A beautifully short route.' : `Escaped in ${state.moves} moves. Your best result is always kept.`}</p>
                  <button
                    className="primary-button"
                    onClick={() => {
                      if (level.id === LEVELS.at(-1)!.id || Object.keys(progress.completed).length === LEVELS.length) {
                        if (pendingReward(progress)) setGate(true);
                        else map();
                      } else open(nextLevelId(progress));
                    }}
                  >
                    {level.id === LEVELS.at(-1)!.id ? 'See the journey' : Object.keys(progress.completed).length === LEVELS.length ? 'Back to the path' : 'Keep going'}{' '}
                    <span aria-hidden="true">→</span>
                  </button>
                  <div className="win-actions">
                    <button className="quiet-button" onClick={() => act({ type: 'undo' })}>
                      Undo last move
                    </button>
                    <button className="quiet-button" onClick={() => act({ type: 'restart' })}>
                      Try a shorter route
                    </button>
                  </div>
                </section>
              ) : (
                <section className="play-controls" aria-label="Game controls">
                  {roomHasInteractions && (
                    <div className="interaction-bar" aria-hidden={interactions.length === 0}>
                      {selectedInteraction !== undefined ? (
                        <button className="interaction-button" data-interaction={selectedInteraction} onClick={() => act({ type: 'interact', position: selectedInteraction })}>
                          {interactionLabel(state, selectedInteraction)} <span className="key-label">E</span>
                        </button>
                      ) : (
                        <div className="interaction-choices" role="group" aria-label="Nearby objects">
                          {interactions.map((position) => (
                            <button key={position} data-interaction={position} onClick={() => act({ type: 'interact', position })}>
                              {interactionLabel(state, position)}{' '}
                              <small>
                                row {Math.floor(position / state.board.width) + 1}, column {(position % state.board.width) + 1}
                              </small>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="control-row">
                    <button className="utility-control" disabled={!session.history.length} onClick={() => act({ type: 'undo' })}>
                      <span aria-hidden="true">↶</span>Undo
                    </button>
                    <div className="dpad">
                      {(['up', 'left', 'down', 'right'] as const).map((direction) => (
                        <button key={direction} className={`direction ${direction}`} aria-label={`Move ${direction}`} onClick={() => act({ type: 'move', move: direction })}>
                          {ARROWS[direction]}
                        </button>
                      ))}
                    </div>
                    <button className={`utility-control ${hintShown ? 'active' : ''}`} onClick={() => setHintShown((value) => !value)} aria-expanded={hintShown}>
                      <span aria-hidden="true">?</span>Hint
                    </button>
                  </div>
                  {hintShown && (
                    <p className="hint" role="status">
                      {level.hint}
                    </p>
                  )}
                  <div className="room-options">
                    <button className="quiet-button" onClick={() => setPanel('restart')}>
                      Start over
                    </button>
                    <span className="gesture-tip">Swipe the room to walk</span>
                    {showSkips && (
                      <button className="quiet-button" disabled={isCleared(progress, level.id) || skipBalance(progress) < 1} onClick={() => setPanel('skip')}>
                        Skip · {skipBalance(progress)}
                      </button>
                    )}
                  </div>
                </section>
              )}
            </main>
          )}
        </>
      )}
      {panel && (
        <Sheet
          title={
            panel === 'help'
              ? 'A little help'
              : panel === 'settings'
                ? 'Make yourself comfortable'
                : panel === 'skip'
                  ? 'Take a different room?'
                  : panel === 'restart'
                    ? 'Start this room over?'
                    : panel === 'recover'
                      ? 'Restore the cloud copy?'
                      : panel === 'import'
                        ? 'Bring your earlier journey along?'
                        : 'Reset the whole journey?'
          }
          onClose={() => {
            if (!resetBusy) setPanel(null);
          }}
        >
          {saveError && (
            <p className="settings-error" role="alert">
              {saveError}
            </p>
          )}
          {panel === 'help' ? (
            <>
              <p>Find the archway. Push barrels, explore the room, and try another approach whenever you need to. There is no clock, no move limit, and unlimited Undo.</p>
              <div className="help-controls">
                <p>
                  <strong>Phone</strong> Use the arrows or swipe on the room. Tap an object to learn about it.
                </p>
                <p>
                  <strong>Keyboard</strong> Arrows / WASD to walk · U to undo · E to use a nearby object · R / Esc to start over.
                </p>
              </div>
              <h3>Your stars</h3>
              <p>One for escaping. Two for a tidy route. Three for the shortest route. Hints and Undo never cost stars.</p>
              {screen === 'room' && (
                <p className="supporting">
                  This room: two stars in {twoStarTarget(level)} moves; three in {level.par}.
                </p>
              )}
              {showSkips && (
                <>
                  <h3>A way around a tricky room</h3>
                  <p>Each skip opens the next room without awarding stars. Clear a chapter, by solving or skipping its rooms, to earn two more skips. Replay a skipped room whenever you like.</p>
                </>
              )}
              {LEVELS.flatMap((room) => (room.introduction ? [introductionById(room.introduction)] : []))
                .filter((item) => progress.seen.includes(`concept-${item.id}`))
                .map((item) => (
                  <div className="help-concept" key={item.id}>
                    <ConceptArt concept={item.concept} />
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.explanation}</p>
                    </div>
                  </div>
                ))}
            </>
          ) : panel === 'settings' ? (
            <>
              <section className="cloud-settings" aria-label="Saved journey">
                <h3>{cloud.sync ? 'Your Telegram journey' : 'Your journey on this device'}</h3>
                <p>
                  {cloud.sync
                    ? 'Stars, skips, discoveries, and your saved room follow the same Telegram account on phone and computer. Offline changes wait safely here until you reconnect.'
                    : 'Open Rewind from the same Telegram account on each device to share your journey. A regular browser visit is saved only here.'}
                </p>
                <p className="sync-status" role="status">
                  {saveLabel}
                </p>
                <p className="supporting">Previous-version saves are kept separately. New puzzles begin without stars; unchanged rooms keep their results.</p>
                {model.notice && <p role="status">{model.notice}</p>}
                {cloud.error && cloud.identity && <button onClick={() => setPanel('recover')}>Recover my cloud journey</button>}
                {syncStatus.notice && <p role="status">{syncStatus.notice}</p>}
                {cloud.sync && (
                  <div className="cloud-actions">
                    <button
                      disabled={syncStatus.state === 'syncing' || resetBusy}
                      onClick={() => {
                        void cloud.sync?.sync();
                      }}
                    >
                      Sync now
                    </button>
                    <button className="quiet-button" onClick={() => setPanel('import')}>
                      Import this browser’s earlier progress
                    </button>
                  </div>
                )}
              </section>
              <label className="setting-row">
                <span>
                  <strong>Sound</strong>
                  <small>Footsteps, wooden barrels, water, and discoveries. Stays on this device.</small>
                </span>
                <input
                  type="checkbox"
                  checked={settings.sound}
                  disabled={audioBusy}
                  onChange={(event) => {
                    void changeSettings({ ...settings, sound: event.target.checked });
                  }}
                />
              </label>
              <label className="setting-row">
                <span>
                  <strong>Reduce motion</strong>
                  <small>Keep movement and transitions still. Your device preference is also respected.</small>
                </span>
                <input
                  type="checkbox"
                  checked={settings.reducedMotion}
                  disabled={audioBusy}
                  onChange={(event) => {
                    void changeSettings({ ...settings, reducedMotion: event.target.checked });
                  }}
                />
              </label>
              {(settingsError || audioError) && (
                <p role="alert" className="settings-error">
                  {settingsError || audioError}
                </p>
              )}
              <OfflineSettings offline={offline} />
              <div className="reset-area">
                <button className="quiet-button danger" disabled={!!cloud.error} onClick={() => setPanel('reset')}>
                  Reset progress
                </button>
                <p className="supporting">
                  {cloud.sync
                    ? 'Resets this Telegram journey on every device. Requires a connection.'
                    : 'Clears this device’s solo journey, stars, skips, and saved room. Previous-version saves are left untouched.'}
                </p>
              </div>
            </>
          ) : panel === 'recover' ? (
            <>
              <p>Restore the last confirmed Telegram save. The unreadable local cache will be kept as a recovery backup, but unsynced changes in it may not be recoverable.</p>
              <div className="sheet-actions">
                <button disabled={resetBusy} onClick={() => setPanel('settings')}>
                  Not now
                </button>
                <button
                  disabled={resetBusy}
                  className="primary-button"
                  onClick={() => {
                    void recoverCloud();
                  }}
                >
                  {resetBusy ? 'Recovering…' : 'Restore cloud save'}
                </button>
              </div>
            </>
          ) : panel === 'import' ? (
            <>
              <p>Add the stars and discoveries saved here before Telegram sync. Your shared stars stay safe. Only import this if it is your own journey.</p>
              <div className="sheet-actions">
                <button onClick={() => setPanel('settings')}>Not now</button>
                <button
                  className="primary-button"
                  onClick={() => {
                    try {
                      dispatch({ type: 'import', progress: readProgress(window.localStorage) });
                      setPanel('settings');
                    } catch (error) {
                      console.warn('Rewind could not import earlier progress.', error);
                      setSaveError('The earlier journey could not be read. Your Telegram save is untouched.');
                    }
                  }}
                >
                  Add my progress
                </button>
              </div>
            </>
          ) : panel === 'skip' ? (
            <>
              <p>Spend one skip to open the next room. This room stays on the path without stars, ready for another visit.</p>
              <p className="supporting">You have {skipBalance(progress)} skips. Two more arrive after every completed chapter.</p>
              <div className="sheet-actions">
                <button onClick={() => setPanel(null)}>Stay here</button>
                <button
                  className="primary-button"
                  onClick={() => {
                    const next = nextLevelId(skipLevel(progress, level.id));
                    dispatch({ type: 'skip' });
                    setGate(true);
                    setPanel(null);
                    setInspection(null);
                    setHintShown(false);
                    window.history.pushState(null, '', `#room-${next}`);
                  }}
                >
                  Use one skip
                </button>
              </div>
            </>
          ) : panel === 'restart' ? (
            <>
              <p>The room returns to its original state. Stars you have already earned stay safe.</p>
              <div className="sheet-actions">
                <button onClick={() => setPanel(null)}>Keep playing</button>
                <button
                  className="primary-button"
                  onClick={() => {
                    act({ type: 'restart' });
                    setPanel(null);
                  }}
                >
                  Start over
                </button>
              </div>
            </>
          ) : (
            <>
              <p>
                {cloud.sync
                  ? 'This removes your Telegram journey on every device, including stars, skips, discoveries, and the saved room. Older offline saves will not bring it back. It cannot be undone.'
                  : 'This removes all solo-campaign stars, skips, and your saved room from this browser. It cannot be undone.'}
              </p>
              <div className="sheet-actions">
                <button disabled={resetBusy} onClick={() => setPanel('settings')}>
                  Keep my journey
                </button>
                <button
                  className="danger-button"
                  disabled={resetBusy}
                  onClick={() => {
                    void resetProgress();
                  }}
                >
                  {resetBusy ? 'Resetting…' : cloud.sync ? 'Reset on every device' : 'Reset everything'}
                </button>
              </div>
            </>
          )}
        </Sheet>
      )}
    </div>
  );
}
