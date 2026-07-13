import { useState } from 'react';
import { Game } from './components/Game';
import { FLOORS } from './game';
import { loadProfile, recordFloorCompletion, setSoundEnabled } from './lib/storage';

export function App() {
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [profile, setProfile] = useState(loadProfile);

  if (selectedFloor !== null) {
    const floor = FLOORS[selectedFloor];
    return (
      <main className="app-shell">
        <Game
          floor={floor}
          floorNumber={selectedFloor + 1}
          floorCount={FLOORS.length}
          soundEnabled={profile.settings.soundEnabled}
          onComplete={(elapsed) => setProfile(recordFloorCompletion(floor.id, selectedFloor + 1, elapsed))}
          onExit={() => setSelectedFloor(null)}
        />
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="home-screen">
        <div className="home-copy">
          <p className="eyebrow">TACTICAL INFILTRATION</p>
          <h1>GROUND<br />ZERO</h1>
          <p className="home-description">Five expanded facilities. Secure the objective, read each guard's full field of view, and disappear without a trace.</p>
        </div>
        <div>
          <div className="floor-list" aria-label="Floor selection">
            {FLOORS.map((floor, index) => {
              const floorNumber = index + 1;
              const unlocked = floorNumber <= profile.unlockedFloor;
              const bestTime = profile.bestTimes[floor.id];
              return (
                <button key={floor.id} className="floor-card" type="button" disabled={!unlocked} onClick={() => setSelectedFloor(index)}>
                  <span>{String(floorNumber).padStart(2, '0')}</span>
                  <strong>{floor.name}</strong>
                  <small>{unlocked ? (bestTime === undefined ? 'AVAILABLE' : `BEST ${(bestTime / 1000).toFixed(1)}S`) : 'LOCKED'}</small>
                </button>
              );
            })}
          </div>
          <button
            className="sound-toggle"
            type="button"
            aria-pressed={profile.settings.soundEnabled}
            onClick={() => setProfile(setSoundEnabled(!profile.settings.soundEnabled))}
          >
            SOUND {profile.settings.soundEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
        <footer className="home-footer">WASD / ARROW KEYS · SWIPE / TAP</footer>
      </section>
    </main>
  );
}
