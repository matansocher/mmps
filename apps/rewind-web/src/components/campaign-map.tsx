import type { CSSProperties } from 'react';
import { roomNumber } from '../../../../src/shared/rewind';
import { chapterById, chapterComplete, CHAPTERS, isAvailable, isCleared, JOURNEY, levelById, LEVELS, nextLevelId, restoredChapters, skipBalance, totalStars } from '../game';
import type { Progress } from '../game';
import { Stars } from './game-view';
import { JourneyArt } from './journey-art';
import { ConceptArt, TravelerArt } from './room-scene';

const TRAIL_COLUMNS = [210, 350, 425, 315, 170, 205, 345, 420, 290, 185];

function Landscape({ terrain, restored, height }: { readonly terrain: string; readonly restored: boolean; readonly height: number }) {
  return (
    <g className={`landscape landscape-${terrain} ${restored ? 'restored' : ''}`}>
      {[
        [90, 170],
        [490, 450],
        [90, 700],
        [515, 870],
      ]
        .filter(([, y]) => y < height - 40)
        .map(([x, y], i) => (
          <g key={i} transform={`translate(${x},${y})`}>
            <ellipse cy="30" rx="42" ry="13" fill="#364d3e" opacity=".13" />
            {restored && (
              <g className="restored-lantern">
                <path d="M-42 30V5" stroke="#7e7048" strokeWidth="3" />
                <path d="M-47 6h10v12h-10z" fill="#eed387" stroke="#897343" strokeWidth="2" />
                <path d="M-48 4l6-5 6 5" fill="#897343" />
                <path d="M27 37v-9m-5 4h10M-30 37v-7m-4 3h8" stroke="#a78c4c" strokeWidth="3" />
              </g>
            )}
            {['winter', 'courtyard', 'gatehouse'].includes(terrain) ? (
              <>
                <path d="M0 19v24" stroke="#766246" strokeWidth="8" />
                <path d="M0-54l-34 44h14l-26 33h92L20-10h14z" fill={terrain === 'winter' ? '#a9c1b6' : '#6d8c66'} />
                <path d="M0-54l-23 30H23z" fill={terrain === 'winter' ? '#e8efe0' : '#87a179'} />
              </>
            ) : terrain === 'canal' ? (
              <>
                <path d="M-50 22q50-55 100 0v15q-50-25-100 0z" fill="#b99b6c" stroke="#857a56" strokeWidth="3" />
                <path d="M-60 46q30-10 60 0t60 0" stroke="#a6c9c1" strokeWidth="5" fill="none" />
              </>
            ) : (
              <>
                <path d="M-30 24v-52h23v-17h29v16h14v53z" fill="#98a48e" stroke="#798575" strokeWidth="2" />
                <path d="M-7 24V-5a10 10 0 0120 0v29z" fill="#617465" />
                <path d="M-26-22h16m7-16h20M18 7h13" stroke="#b9c1aa" strokeWidth="3" />
              </>
            )}
          </g>
        ))}
      {[
        [105, 390],
        [485, 130],
        [110, 900],
        [490, 630],
      ]
        .filter(([, y]) => y < height - 40)
        .map(([x, y], i) => (
          <g key={i} transform={`translate(${x},${y})`}>
            <path d="M-21 10l8-18 25-5 17 21-14 8z" fill="#a7b09a" stroke="#879581" strokeWidth="2" />
            <path d="M-13-8l10 14 19 10M-3 6L12-13" stroke="#c7cbb5" strokeWidth="2" />
            <path d="M-28 24l2-12m4 12l5-6M33 10l4-8" stroke="#7b926b" strokeWidth="3" />
          </g>
        ))}
    </g>
  );
}

export function CampaignMap({
  progress,
  resumeId,
  hasAttempt,
  onOpen,
  onHelp,
  onSettings,
  saveLabel,
}: {
  readonly progress: Progress;
  readonly resumeId: number;
  readonly hasAttempt: boolean;
  readonly onOpen: (id: number) => void;
  readonly onHelp: () => void;
  readonly onSettings: () => void;
  readonly saveLabel: string;
}) {
  const current = nextLevelId(progress);
  const solved = Object.keys(progress.completed).length;
  const passed = LEVELS.filter((level) => isCleared(progress, level.id)).length;
  const currentChapter = chapterById(levelById(current).chapter);
  const restored = restoredChapters(progress);
  return (
    <main className="campaign">
      <header className="map-header">
        <a className="wordmark" href="#map" aria-label="Rewind home">
          rewind
          <span className="wordmark-dot" />
        </a>
        <nav aria-label="Game options">
          <button className="quiet-button" onClick={onHelp}>
            Help
          </button>
          <button className="quiet-button" onClick={onSettings}>
            Settings
          </button>
        </nav>
      </header>
      <section className="map-intro">
        <JourneyArt restored={restored} />
        <h1 tabIndex={-1}>{passed === LEVELS.length ? 'The light is home.' : 'Bring the valley back to life.'}</h1>
        <p>
          {passed === LEVELS.length
            ? 'From the courtyard to the summit, the valley is awake again. These paths are yours to revisit.'
            : 'The observatory has gone dark. Open the old paths, wake the machinery, and bring its light back to the valley.'}
        </p>
        <div className="journey-summary">
          <span>
            {solved} / {LEVELS.length} solved
          </span>
          <span className="star-total">★ {totalStars(progress)}</span>
          {progress.seen.includes('skips') && <span>{skipBalance(progress)} skips</span>}
        </div>
        <button className="save-status quiet-button" onClick={onSettings}>
          {saveLabel}
        </button>
        {passed === LEVELS.length && solved < LEVELS.length && (
          <p className="supporting">
            The path is complete. {LEVELS.length - solved} skipped {LEVELS.length - solved === 1 ? 'room is' : 'rooms are'} still waiting for stars.
          </p>
        )}
      </section>
      <div className="chapter-list">
        {CHAPTERS.map((chapter, chapterIndex) => {
          const rooms = LEVELS.filter((level) => level.chapter === chapter.id);
          const available = rooms.some((level) => isAvailable(progress, level.id));
          const introduced = progress.seen.includes(`concept-${chapter.id}`);
          const complete = chapterComplete(progress, chapter.id);
          const height = 105 + rooms.length * 95;
          const points = rooms.map((room, index) => ({ room, x: TRAIL_COLUMNS[index % TRAIL_COLUMNS.length], y: 105 + index * 95 }));
          const knots = [{ x: 210, y: 0 }, ...points, { x: 210, y: height }];
          const path = knots.reduce((drawing, point, index) => {
            if (!index) return `M${point.x} ${point.y}`;
            const previous = knots[index - 1];
            const middle = (previous.y + point.y) / 2;
            return `${drawing} C${previous.x} ${middle} ${point.x} ${middle} ${point.x} ${point.y}`;
          }, '');
          return (
            <section
              key={chapter.id}
              className={`map-chapter ${available ? 'discovered' : 'undiscovered'}`}
              data-chapter={chapter.id}
              style={{ '--chapter-color': chapter.color } as CSSProperties}
              aria-labelledby={`chapter-${chapter.id}`}
            >
              <div className="chapter-heading">
                <span className="chapter-index">{String(chapterIndex + 1).padStart(2, '0')}</span>
                <div>
                  <p className="eyebrow">
                    Rooms {roomNumber(rooms[0].id)}–{roomNumber(rooms.at(-1)!.id)}
                    {complete ? ' · Path cleared' : !available ? ' · Ahead on your journey' : ''}
                  </p>
                  <h2 id={`chapter-${chapter.id}`}>{chapter.name}</h2>
                </div>
                {introduced && <ConceptArt concept={chapter.concept} />}
              </div>
              <div className="chapter-trail" style={{ aspectRatio: `600 / ${height}` }}>
                <svg className="trail-art" viewBox={`0 0 600 ${height}`} aria-hidden="true">
                  <Landscape terrain={chapter.terrain} restored={complete} height={height} />
                  <path d={path} fill="none" stroke="#6e8168" strokeWidth="40" opacity=".18" transform="translate(0 4)" />
                  <path d={path} className="trail-edge" />
                  <path d={path} className="trail-center" />
                  <path d={path} className="trail-stones" />
                </svg>
                {points.map(({ room, x, y }) => {
                  const { id } = room;
                  const number = roomNumber(id);
                  const result = progress.completed[id];
                  const skipped = progress.skipped.includes(id) && !result;
                  const unlocked = isAvailable(progress, id);
                  const isCurrent = current === id && !result;
                  return (
                    <button
                      key={id}
                      className={`level-node ${result ? 'solved' : skipped ? 'skipped' : unlocked ? 'available' : 'locked'} ${isCurrent ? 'current' : ''} ${room.difficulty >= 8 ? 'challenge-node' : ''}`}
                      style={{ left: `${x / 6}%`, top: `${(y / height) * 100}%` }}
                      disabled={!unlocked}
                      data-level={id}
                      data-current={isCurrent || undefined}
                      aria-label={`Level ${number}: ${room.name}. ${result ? `${result.stars} stars. Replay` : skipped ? 'Skipped. Play for stars' : unlocked ? 'Play' : 'Locked'}`}
                      aria-current={isCurrent ? 'step' : undefined}
                      onClick={() => onOpen(id)}
                    >
                      {isCurrent && (
                        <svg className="map-traveler" viewBox="0 0 64 64" aria-hidden="true">
                          <TravelerArt />
                        </svg>
                      )}
                      <span className="node-number">{number}</span>
                      {result ? (
                        <Stars count={result.stars} />
                      ) : skipped ? (
                        <span className="node-caption">skipped</span>
                      ) : room.difficulty >= 8 && unlocked ? (
                        <span className="node-caption">challenge</span>
                      ) : !unlocked ? (
                        <svg className="node-lock" viewBox="0 0 16 18" aria-hidden="true">
                          <path d="M4 7V5a4 4 0 018 0v2" fill="none" stroke="currentColor" strokeWidth="2" />
                          <rect x="2" y="7" width="12" height="9" rx="2" fill="currentColor" />
                        </svg>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              {complete && <p className="chapter-restoration">{JOURNEY[chapter.id - 1].restored}</p>}
            </section>
          );
        })}
        <div className="journey-end">
          <p>{passed === LEVELS.length ? 'The light will be here when you return.' : 'The observatory waits at the end of the path.'}</p>
          <p className="supporting">Revisit any cleared room. Your best stars stay with you.</p>
        </div>
      </div>
      <footer className="continue-dock">
        <div>
          <span className="eyebrow">{hasAttempt ? 'Right where you left off' : solved === LEVELS.length ? 'The path is yours' : currentChapter.name}</span>
          <strong>{hasAttempt ? `Room ${roomNumber(resumeId)}` : solved === LEVELS.length ? 'Revisit a favorite' : `Room ${roomNumber(current)}`}</strong>
        </div>
        <button className="primary-button" onClick={() => onOpen(hasAttempt ? resumeId : current)}>
          {hasAttempt ? 'Resume' : solved === LEVELS.length ? 'Play again' : 'Continue'} <span aria-hidden="true">→</span>
        </button>
      </footer>
    </main>
  );
}
