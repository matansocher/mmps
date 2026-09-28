import { useState } from 'react';

export function RailLesson() {
  const [route, setRoute] = useState(0);
  const [sent, setSent] = useState(false);
  return (
    <div className="ml-rail-lesson">
      <p>Try one junction. Send train 2 to station 2.</p>
      <svg viewBox="0 0 300 110" role="img" aria-label={`Train 2, junction points to station ${route + 1}`}>
        <path d="M20 55H140L255 20M140 55L255 90" fill="none" stroke="var(--ml-line)" strokeWidth="10" />
        <path d={`M20 55H140L255 ${route ? 90 : 20}`} fill="none" stroke="var(--ml-accent)" strokeWidth="5" />
        <circle cx="260" cy="20" r="16" fill="#168bff" />
        <text x="260" y="26" textAnchor="middle" fill="#071b2c" fontSize="17">
          1
        </text>
        <circle cx="260" cy="90" r="16" fill="#ffe13d" />
        <text x="260" y="96" textAnchor="middle" fill="#182116" fontSize="17">
          2
        </text>
        <g className={sent ? 'sent' : ''} style={{ transform: sent ? `translate(220px,${route ? 35 : -35}px)` : 'translate(0,0)' }}>
          <rect x="18" y="40" width="36" height="30" rx="7" fill="#ffe13d" stroke="#746527" />
          <text x="36" y="61" textAnchor="middle" fill="#182116" fontSize="18">
            2
          </text>
        </g>
      </svg>
      <div>
        <button
          className="ml-secondary"
          onClick={() => {
            setRoute((r) => 1 - r);
            setSent(false);
          }}
        >
          Switch junction · {route + 1}
        </button>
        <button className="ml-secondary" onClick={() => setSent(true)}>
          Send train
        </button>
      </div>
      <p role="status">{sent ? (route ? 'Right station. You’re ready for a shift.' : 'That was station 1. Switch the junction and try again.') : 'Tap the junction before you send the train.'}</p>
    </div>
  );
}
