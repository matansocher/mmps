import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { AppIcon, type AppIconName } from './components/AppIcon';
import { ProgressProvider, useProgress } from './hooks/useProgress';
import { readTelegramTheme } from './lib/api';
import { CURRICULUM } from './lib/bites';
import { summarize } from './lib/scheduler';
import { selectReviewQueue } from './lib/selection';
import { BitePage } from './pages/BitePage';
import { BrowsePage } from './pages/BrowsePage';
import { QuizPage } from './pages/QuizPage';
import { ReviewPage } from './pages/ReviewPage';
import { TodayPage } from './pages/TodayPage';

type Theme = 'light' | 'dark';

const THEME_KEY = 'learner:theme';

function initialTheme(): Theme {
  const stored = (() => {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch {
      return null;
    }
  })();
  if (stored === 'light' || stored === 'dark') return stored;
  const fromTelegram = readTelegramTheme();
  if (fromTelegram) return fromTelegram;
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches) return 'light';
  return 'dark';
}

function TopBar({ theme, onToggleTheme }: { readonly theme: Theme; readonly onToggleTheme: () => void }) {
  const { progress } = useProgress();
  const summary = useMemo(() => summarize(progress, CURRICULUM), [progress]);
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link to="/" className="brand" aria-label="Go to Today">
          <span className="logo" aria-hidden>
            <img src="/learner/owl-logo.webp" alt="" />
          </span>
          <span className="title">Learner</span>
        </Link>
        <span className="spacer" />
        {summary.mastered > 0 || progress.streak > 0 ? (
          <span className="streak" title="Day streak">
            <AppIcon name="fire" size={17} /> {progress.streak}
          </span>
        ) : null}
        <button type="button" className="icon-btn" onClick={onToggleTheme} title="Toggle theme" aria-label="Toggle theme">
          <AppIcon name={theme === 'dark' ? 'sun' : 'moon'} size={19} />
        </button>
      </div>
    </header>
  );
}

function TabBar() {
  const { progress } = useProgress();
  const location = useLocation();
  const dueCount = useMemo(() => selectReviewQueue(progress).length, [progress]);

  const tabs: ReadonlyArray<{ to: string; icon: AppIconName; label: string; badge?: number; end?: boolean }> = [
    { to: '/', icon: 'today', label: 'Today', end: true },
    { to: '/browse', icon: 'browse', label: 'Browse' },
    { to: '/review', icon: 'review', label: 'Review', badge: dueCount },
  ];

  // Hide the tabbar on immersive reader/quiz screens.
  const immersive = location.pathname.startsWith('/bite/') || location.pathname.startsWith('/quiz/');
  if (immersive) return null;

  return (
    <nav className="tabbar">
      {tabs.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end={tab.end} className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
          <span className="tab-icon" aria-hidden>
            <AppIcon name={tab.icon} />
          </span>
          {tab.label}
          {tab.badge ? <span className="badge">{tab.badge}</span> : null}
        </NavLink>
      ))}
    </nav>
  );
}

function Shell() {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  return (
    <>
      <TopBar theme={theme} onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} />
      <div className="app">
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/browse" element={<BrowsePage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/bite/:biteId" element={<BitePage />} />
          <Route path="/quiz/:biteId" element={<QuizPage />} />
        </Routes>
      </div>
      <TabBar />
    </>
  );
}

export function App() {
  useEffect(() => {
    const wa = (window as unknown as { Telegram?: { WebApp?: { ready?: () => void; expand?: () => void } } }).Telegram?.WebApp;
    wa?.ready?.();
    wa?.expand?.();
  }, []);

  return (
    <BrowserRouter basename="/learner">
      <ProgressProvider>
        <Shell />
      </ProgressProvider>
    </BrowserRouter>
  );
}
