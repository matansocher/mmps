import type { Direction } from './types';

const DIRECTION_ROTATION: Readonly<Record<Direction, number>> = {
  up: 0,
  right: 90,
  down: 180,
  left: 270,
};

function svgDataUrl(content: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${content}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function characterShell(content: string): string {
  return `
    <defs>
      <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="2.2"/>
      </filter>
      <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#334155"/>
        <stop offset="0.52" stop-color="#172033"/>
        <stop offset="1" stop-color="#080d17"/>
      </linearGradient>
    </defs>
    <style>
      .edge { stroke: #020617; stroke-width: 2.2; stroke-linejoin: round; }
      .detail { fill: none; stroke-linecap: round; stroke-linejoin: round; }
    </style>
    <ellipse cx="50" cy="78" rx="24" ry="10" fill="#020617" opacity=".52" filter="url(#shadow)"/>
    ${content}
  `;
}

export function createPlayerSprite(direction: Direction): string {
  const rotation = DIRECTION_ROTATION[direction];
  return svgDataUrl(
    characterShell(`
      <g transform="rotate(${rotation} 50 50)">
        <path class="edge" d="M42 60 38 83 46 84 50 65Z" fill="#111827"/>
        <path class="edge" d="m58 60 4 23-8 1-4-19Z" fill="#0b1220"/>
        <path class="edge" d="M35 43 24 61l6 5 14-15Z" fill="#111827"/>
        <path class="edge" d="m65 43 11 18-6 5-14-15Z" fill="#0b1220"/>
        <path class="edge" d="M36 38 42 29h16l6 9 3 27-17 7-17-7Z" fill="url(#metal)"/>
        <path d="M39 43h22l-2 18-9 4-9-4Z" fill="#0a1423"/>
        <path d="M40 45h4v15h-4ZM56 45h4v15h-4Z" fill="#26354a"/>
        <path d="M42 42h16v5H42Z" fill="#075985"/>
        <path d="M44 43h12v2H44Z" fill="#67e8f9"/>
        <path class="edge" d="M41 29c0-8 4-13 9-13s9 5 9 13l-4 9H45Z" fill="#202c40"/>
        <path d="M43 25h14l-2 7H45Z" fill="#07101d"/>
        <path d="M45 25h10v2H45Z" fill="#22d3ee"/>
        <path d="M48 13h4l2 6h-8Z" fill="#67e8f9"/>
        <circle cx="27" cy="64" r="3.5" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
        <circle cx="73" cy="64" r="3.5" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
        <path class="detail" d="M36 55h28M46 69v9M54 69v9" stroke="#475569" stroke-width="1.4" opacity=".8"/>
      </g>
    `),
  );
}

export function createGuardSprite(direction: Direction): string {
  const rotation = DIRECTION_ROTATION[direction];
  return svgDataUrl(
    characterShell(`
      <g transform="rotate(${rotation} 50 50)">
        <path class="edge" d="M40 61 36 84h10l4-19Z" fill="#111827"/>
        <path class="edge" d="m60 61 4 23H54l-4-19Z" fill="#0b1220"/>
        <path class="edge" d="M34 39 21 58l7 7 15-15Z" fill="#151d2b"/>
        <path class="edge" d="m66 39 13 19-7 7-15-15Z" fill="#0d1420"/>
        <path class="edge" d="m34 37 8-10h16l8 10 3 29-19 7-19-7Z" fill="url(#metal)"/>
        <path d="M36 42h28l-3 20-11 4-11-4Z" fill="#151827"/>
        <path d="M39 44h5v16h-5ZM56 44h5v16h-5Z" fill="#374151"/>
        <path d="M36 38h10v7H35ZM54 38h10l1 7H54Z" fill="#7f1d1d"/>
        <path d="M38 39h7v2h-7ZM55 39h7v2h-7Z" fill="#fb7185"/>
        <path class="edge" d="M39 28c0-9 5-14 11-14s11 5 11 14l-5 10H44Z" fill="#293548"/>
        <path d="M41 23h18l-3 9H44Z" fill="#090e17"/>
        <path d="M43 24h14v2H43Z" fill="#f43f5e"/>
        <rect x="62" y="31" width="6" height="12" rx="2" fill="#111827" stroke="#fb7185" stroke-width="1.4"/>
        <circle cx="25" cy="62" r="4" fill="#0f172a" stroke="#475569" stroke-width="1.5"/>
        <circle cx="75" cy="62" r="4" fill="#0f172a" stroke="#475569" stroke-width="1.5"/>
        <path class="detail" d="M34 54h32M45 70v9M55 70v9" stroke="#64748b" stroke-width="1.4" opacity=".75"/>
      </g>
    `),
  );
}

export function createObjectiveSprite(): string {
  return svgDataUrl(`
    <defs>
      <linearGradient id="case" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#475569"/>
        <stop offset=".55" stop-color="#172033"/>
        <stop offset="1" stop-color="#070b12"/>
      </linearGradient>
      <filter id="glow" x="-60%" y="-100%" width="220%" height="300%">
        <feGaussianBlur stdDeviation="3"/>
      </filter>
    </defs>
    <ellipse cx="50" cy="75" rx="30" ry="10" fill="#020617" opacity=".55"/>
    <rect x="25" y="34" width="50" height="37" rx="8" fill="#fbbf24" opacity=".2" filter="url(#glow)"/>
    <rect x="25" y="34" width="50" height="37" rx="7" fill="url(#case)" stroke="#fbbf24" stroke-width="2.5"/>
    <path d="M40 34v-5c0-4 3-7 7-7h6c4 0 7 3 7 7v5" fill="none" stroke="#64748b" stroke-width="4"/>
    <path d="M27 47h46M28 59h44" stroke="#64748b" stroke-width="1.5" opacity=".75"/>
    <rect x="43" y="44" width="14" height="11" rx="2" fill="#111827" stroke="#fde68a" stroke-width="1.5"/>
    <rect x="46" y="47" width="8" height="2.5" rx="1" fill="#67e8f9"/>
    <circle cx="50" cy="64" r="2" fill="#fef3c7"/>
  `);
}

export function createExitSprite(locked: boolean): string {
  const accent = locked ? '#64748b' : '#4ade80';
  const glow = locked ? '#334155' : '#22c55e';
  return svgDataUrl(`
    <defs>
      <linearGradient id="door" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#334155"/>
        <stop offset="1" stop-color="#0b1220"/>
      </linearGradient>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
    </defs>
    <rect x="18" y="14" width="64" height="72" rx="10" fill="${glow}" opacity=".22" filter="url(#glow)"/>
    <path d="M19 83V20l8-8h46l8 8v63Z" fill="#080d17" stroke="${accent}" stroke-width="3"/>
    <path d="M26 76V23l5-5h38l5 5v53Z" fill="url(#door)" stroke="#475569" stroke-width="2"/>
    <path d="M50 19v57" stroke="${accent}" stroke-width="2"/>
    <path d="m34 49 7-7v5h18v-5l7 7-7 7v-5H41v5Z" fill="${accent}" opacity="${locked ? '.55' : '.95'}"/>
    <rect x="67" y="30" width="8" height="15" rx="2" fill="#070b12" stroke="${accent}" stroke-width="1.5"/>
    <circle cx="71" cy="34" r="1.8" fill="${accent}"/>
    ${locked ? '<path d="M45 58h10v9H45Z" fill="#111827" stroke="#94a3b8" stroke-width="1.5"/><path d="M47 58v-3a3 3 0 0 1 6 0v3" fill="none" stroke="#94a3b8" stroke-width="1.5"/>' : '<path d="M32 80h36" stroke="#86efac" stroke-width="4"/>'}
  `);
}

export function createHidingSprite(): string {
  return svgDataUrl(`
    <defs>
      <linearGradient id="locker" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#334155"/>
        <stop offset=".5" stop-color="#172033"/>
        <stop offset="1" stop-color="#080d17"/>
      </linearGradient>
    </defs>
    <ellipse cx="50" cy="82" rx="29" ry="8" fill="#020617" opacity=".52"/>
    <rect x="22" y="14" width="56" height="68" rx="6" fill="url(#locker)" stroke="#38bdf8" stroke-width="2.5"/>
    <path d="M50 16v64" stroke="#0ea5e9" stroke-width="1.5" opacity=".7"/>
    <path d="M29 27h14M29 31h14M57 27h14M57 31h14" stroke="#64748b" stroke-width="2" stroke-linecap="round"/>
    <path d="M29 65h14M29 69h14M57 65h14M57 69h14" stroke="#334155" stroke-width="2" stroke-linecap="round"/>
    <rect x="43" y="44" width="3" height="10" rx="1.5" fill="#7dd3fc"/>
    <rect x="54" y="44" width="3" height="10" rx="1.5" fill="#7dd3fc"/>
    <path d="M25 18h50" stroke="#94a3b8" stroke-width="2" opacity=".45"/>
  `);
}

export function createKeycardSprite(): string {
  return svgDataUrl(`
    <defs>
      <linearGradient id="card" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#164e63"/>
        <stop offset=".55" stop-color="#0e7490"/>
        <stop offset="1" stop-color="#083344"/>
      </linearGradient>
      <filter id="glow" x="-70%" y="-100%" width="240%" height="300%"><feGaussianBlur stdDeviation="3"/></filter>
    </defs>
    <ellipse cx="50" cy="74" rx="25" ry="8" fill="#020617" opacity=".5"/>
    <rect x="25" y="34" width="50" height="32" rx="6" fill="#22d3ee" opacity=".28" filter="url(#glow)"/>
    <rect x="25" y="34" width="50" height="32" rx="6" fill="url(#card)" stroke="#67e8f9" stroke-width="2.5"/>
    <circle cx="37" cy="47" r="7" fill="#082f49" stroke="#a5f3fc" stroke-width="1.5"/>
    <path d="M49 43h18M49 49h13M31 59h37" stroke="#cffafe" stroke-width="2" stroke-linecap="round" opacity=".85"/>
    <rect x="61" y="55" width="7" height="5" rx="1" fill="#fbbf24"/>
  `);
}

export function createDoorSprite(open: boolean): string {
  const accent = open ? '#4ade80' : '#fbbf24';
  return svgDataUrl(`
    <defs>
      <linearGradient id="door" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#334155"/>
        <stop offset=".5" stop-color="#172033"/>
        <stop offset="1" stop-color="#080d17"/>
      </linearGradient>
    </defs>
    <rect x="12" y="25" width="76" height="50" rx="7" fill="#020617" opacity=".55"/>
    <path d="M15 72V28l8-8h54l8 8v44Z" fill="url(#door)" stroke="${accent}" stroke-width="3"/>
    ${
      open
        ? '<path d="M24 26h16v40H24ZM60 26h16v40H60Z" fill="#101827" stroke="#475569" stroke-width="2"/><path d="M44 48h12" stroke="#86efac" stroke-width="4" stroke-linecap="round"/>'
        : '<path d="M50 22v48M20 48h60" stroke="#64748b" stroke-width="2"/><rect x="43" y="39" width="14" height="18" rx="3" fill="#111827" stroke="#fde68a" stroke-width="2"/><path d="M46 39v-4a4 4 0 0 1 8 0v4" fill="none" stroke="#fde68a" stroke-width="2"/>'
    }
    <rect x="76" y="31" width="7" height="12" rx="2" fill="#07101d" stroke="${accent}" stroke-width="1.5"/>
  `);
}

export function createVentSprite(): string {
  return svgDataUrl(`
    <defs>
      <radialGradient id="vent" cx="50%" cy="50%" r="60%">
        <stop offset="0" stop-color="#172033"/>
        <stop offset="1" stop-color="#050810"/>
      </radialGradient>
    </defs>
    <ellipse cx="50" cy="77" rx="30" ry="8" fill="#020617" opacity=".5"/>
    <rect x="18" y="20" width="64" height="57" rx="9" fill="url(#vent)" stroke="#a78bfa" stroke-width="2.5"/>
    <path d="M28 31h44M28 39h44M28 47h44M28 55h44M28 63h44" stroke="#64748b" stroke-width="3" stroke-linecap="round"/>
    <path d="M31 27v40M42 27v40M58 27v40M69 27v40" stroke="#1e293b" stroke-width="1.5"/>
    <circle cx="25" cy="27" r="2" fill="#c4b5fd"/>
    <circle cx="75" cy="70" r="2" fill="#c4b5fd"/>
  `);
}
