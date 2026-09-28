import { useState } from 'react';
import { resetOnboarding } from '../components/Onboarding';
import { ReminderPrompt } from '../components/ReminderPrompt';
import { useDataVersion } from '../hooks/useDataVersion';
import { useTheme } from '../hooks/useTheme';
import { clearFavorites } from '../lib/favorites';
import { clearHistory } from '../lib/history';
import { syncLabel } from '../lib/player-sync';
import { readJson, removeJson, writeJson } from '../lib/progress';
import { restoreRecommendations } from '../lib/session';
import type { ThemeMode } from '../lib/settings';
import { getSettings, resetSettings, saveSettings } from '../lib/settings';
import { playSound } from '../lib/sound';
import { clearBestScores } from '../lib/storage';
import { telegram } from '../lib/telegram';
import { cx } from '../lib/utils';

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'dark', label: 'Dark', icon: '🌙' },
  { value: 'system', label: 'System', icon: '🖥️' },
];

export function Settings() {
  useDataVersion();
  const { themeMode, setThemeMode, sound, setSound, reducedMotion, setReducedMotion } = useTheme();
  const [confirming, setConfirming] = useState(false);
  const [analytics, setAnalytics] = useState(() => readJson('mindloop:analytics-enabled', true));
  const [haptics, setHaptics] = useState(() => getSettings().haptics);
  const [shapes, setShapes] = useState(() => readJson('mindloop:odd-shapes', false));
  const [mathLevel, setMathLevel] = useState(() => readJson('mindloop:math-level', 0));
  const [done, setDone] = useState(false);
  const [restored, setRestored] = useState(false);

  const resetAll = () => {
    clearBestScores();
    clearHistory();
    clearFavorites();
    resetSettings();
    for (const key of ['mindloop:odd-shapes', 'mindloop:math-level', 'mindloop:keepsake', 'mindloop:less-like', 'mindloop:session']) removeJson(key);
    setHaptics(getSettings().haptics);
    setShapes(false);
    setMathLevel(0);
    window.dispatchEvent(new Event('mindloop:settings-reset'));
    setConfirming(false);
    setDone(true);
    window.setTimeout(() => setDone(false), 2500);
  };

  return (
    <div className="ml-page ml-settings">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 sm:text-4xl">Settings</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">{syncLabel()}. Appearance and sound stay on this device.</p>
      </header>

      <div className="space-y-4">
        {/* Theme */}
        <Row title="Appearance" description="Choose light, dark, or match your system.">
          <div className="flex gap-1.5 rounded-full bg-slate-100 p-1 dark:bg-white/10">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                aria-label={opt.label}
                aria-pressed={themeMode === opt.value}
                onClick={() => setThemeMode(opt.value)}
                className={cx(
                  'ml-tap flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold transition-colors',
                  themeMode === opt.value ? 'bg-white text-slate-800 shadow-sm dark:bg-white/25 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white',
                )}
              >
                <span aria-hidden>{opt.icon}</span>
                <span className="inline">{opt.label}</span>
              </button>
            ))}
          </div>
        </Row>

        {/* Sound */}
        <Row title="Sound effects" description="Play tones for correct, wrong and game-over events.">
          <Toggle
            on={sound}
            onChange={(v) => {
              setSound(v);
              if (v) playSound('correct');
            }}
            label="Sound effects"
          />
        </Row>

        <Row title="Haptic feedback" description="A small Telegram vibration for a finish or a mistake.">
          <Toggle
            on={haptics}
            onChange={(v) => {
              setHaptics(v);
              saveSettings({ haptics: v });
            }}
            label="Haptic feedback"
          />
        </Row>
        {/* Reduced motion */}
        <Row title="Reduced motion" description="Minimize animations and transitions across the app.">
          <Toggle on={reducedMotion} onChange={setReducedMotion} label="Reduced motion" />
        </Row>

        {/* Replay intro */}
        <Row title="Replay intro" description="Watch the welcome tour and quick warm-up game again.">
          <button
            onClick={() => {
              resetOnboarding();
              window.dispatchEvent(new Event('mindloop:replay-onboarding'));
            }}
            className="ml-tap rounded-full bg-teal-100 px-4 py-2 text-sm font-bold text-teal-700 hover:bg-teal-200 dark:bg-teal-500/15 dark:text-teal-300 dark:hover:bg-teal-500/25"
          >
            Replay
          </button>
        </Row>

        <Row title="Shape spotting" description="Use outlines instead of shades in Odd One Out. Each version keeps its own record.">
          <Toggle
            on={shapes}
            onChange={(v) => {
              setShapes(v);
              writeJson('mindloop:odd-shapes', v);
            }}
            label="Shape spotting"
          />
        </Row>
        <Row title="Math practice starting level" description="Classic always starts evenly. Set a comfortable starting point for practice.">
          <select
            aria-label="Math practice starting level"
            value={mathLevel}
            onChange={(e) => {
              setMathLevel(Number(e.target.value));
              writeJson('mindloop:math-level', Number(e.target.value));
            }}
          >
            {[0, 2, 4, 6].map((v) => (
              <option key={v} value={v}>
                Level {v + 1}
              </option>
            ))}
          </select>
        </Row>
        <ReminderPrompt settings />
        <Row title="Fresh recommendations" description="Include games you previously asked to see less often.">
          <button
            className="ml-text-button"
            onClick={() => {
              restoreRecommendations();
              setRestored(true);
            }}
          >
            {restored ? 'Restored' : 'Restore'}
          </button>
        </Row>
        {telegram()?.addToHomeScreen && (
          <Row title="One tap away" description="Add Mindloop to your home screen.">
            <button className="ml-text-button" onClick={() => telegram()?.addToHomeScreen?.()}>
              Add shortcut
            </button>
          </Row>
        )}
        <Row title="Help improve Mindloop" description="Share game starts, finishes and screen sizes. No messages or Telegram authentication data are stored in usage analytics.">
          <Toggle
            on={analytics}
            onChange={(v) => {
              setAnalytics(v);
              writeJson('mindloop:analytics-enabled', v);
              if (!v) writeJson('mindloop:events', []);
            }}
            label="Usage analytics"
          />
        </Row>
        {/* Reset */}
        <div className="rounded-2xl bg-white/70 p-4 shadow-sm ring-1 ring-rose-100 dark:bg-white/10 dark:ring-rose-500/20">
          <h2 className="font-extrabold text-slate-700 dark:text-slate-100">Clear this device</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Clears local progress and preferences. This does not delete your Telegram account data; saved cloud progress will return on the next sync.
          </p>

          {done ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              ✓ Local data cleared
            </div>
          ) : confirming ? (
            <div className="mt-4 flex flex-wrap gap-3">
              <button onClick={resetAll} className="ml-tap rounded-full bg-rose-500 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-rose-600">
                Clear local data
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="ml-tap rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/20"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="ml-tap mt-4 rounded-full bg-rose-100 px-4 py-2 text-sm font-bold text-rose-600 hover:bg-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/25"
            >
              Clear this device
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white/70 p-4 shadow-sm ring-1 ring-slate-100 dark:bg-white/10 dark:ring-white/10">
      <div className="min-w-0">
        <h2 className="font-extrabold text-slate-700 dark:text-slate-100">{title}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      <div className="flex-none">{children}</div>
    </div>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cx('ml-tap relative inline-flex h-11 w-12 flex-none items-center rounded-full px-0.5 transition-colors duration-200', on ? 'bg-teal-500' : 'bg-slate-300 dark:bg-white/20')}
    >
      <span
        className={cx(
          'inline-block h-6 w-6 rounded-full bg-white shadow-md ring-1 ring-black/5 transition-transform duration-200 ease-out will-change-transform',
          on ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  );
}
