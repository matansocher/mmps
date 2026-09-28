import { NavLink } from 'react-router-dom';
import { Icon } from './Icon';

const links = [
  { to: '/', label: 'Play', icon: 'home' },
  { to: '/stats', label: 'Progress', icon: 'chart' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
] as const;
export function NavBar() {
  return (
    <>
      <header className="ml-brandbar">
        <NavLink to="/" className="ml-brand">
          <span className="ml-brand-mark">
            <Icon name="leaf" />
          </span>
          mindloop<span className="ml-brand-dot">.</span>
        </NavLink>
        <span className="ml-brand-note">A little play. A brighter day.</span>
      </header>
      <nav className="ml-nav" aria-label="Main navigation">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon name={link.icon} />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
