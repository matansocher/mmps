import { NavLink } from 'react-router-dom';
import { cx } from '../lib/utils';
import { ThemeToggle } from './ThemeToggle';

const links = [
  { to: '/', label: 'Home', icon: '🏠', end: true },
  { to: '/stats', label: 'Stats', icon: '📊', end: false },
  { to: '/settings', label: 'Settings', icon: '⚙️', end: false },
];

export function NavBar() {
  return (
    <nav className="mx-auto mb-6 flex w-full max-w-5xl items-center justify-between gap-3 px-4 pt-6 sm:px-6">
      <NavLink to="/" className="ml-tap flex items-center gap-2 text-lg font-extrabold">
        <span className="h-3 w-3 rounded-full bg-gradient-to-br from-teal-500 to-cyan-400" />
        <span className="bg-gradient-to-r from-teal-600 to-cyan-500 bg-clip-text text-transparent dark:from-teal-400 dark:to-cyan-300">
          Mindloop
        </span>
      </NavLink>

      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1 rounded-full bg-white/70 p-1 shadow-sm ring-1 ring-slate-100 dark:bg-white/10 dark:ring-white/10">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                cx(
                  'ml-tap flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold transition-colors',
                  isActive
                    ? 'bg-white text-slate-800 shadow-sm dark:bg-white/20 dark:text-white'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white',
                )
              }
            >
              <span aria-hidden>{l.icon}</span>
              <span className="hidden sm:inline">{l.label}</span>
            </NavLink>
          ))}
        </div>
        <ThemeToggle />
      </div>
    </nav>
  );
}
