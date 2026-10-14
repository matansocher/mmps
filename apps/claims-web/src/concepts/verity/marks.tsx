export function PaperClip({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 28 72" aria-hidden="true" focusable="false">
      <path d="M9 18V54a6 6 0 0 0 12 0V10a8 8 0 0 0-16 0v46a10 10 0 0 0 20 0V22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function FolderMark() {
  return (
    <svg className="v-mark" viewBox="0 0 32 28" aria-hidden="true" focusable="false">
      <path d="M2 6.5A2.5 2.5 0 0 1 4.5 4h7l3 3h13A2.5 2.5 0 0 1 30 9.5v14a2.5 2.5 0 0 1-2.5 2.5h-23A2.5 2.5 0 0 1 2 23.5z" fill="currentColor" />
      <path d="M10 16.5l4 4 8-9" fill="none" stroke="#f7f9fb" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TickBox() {
  return (
    <svg className="v-tick" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <rect x="1.5" y="1.5" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 10.5l3.4 3.4L15.5 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Rough, speckled rubber-stamp ink applied with `filter: url(#verity-ink)`.
export function InkFilter() {
  return (
    <svg className="v-defs" width="0" height="0" aria-hidden="true" focusable="false">
      <filter id="verity-ink" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.2" xChannelSelector="R" yChannelSelector="G" result="rough" />
        <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -3.2 0 0 0 2.75" result="speckle" />
        <feComposite in="rough" in2="speckle" operator="in" />
      </filter>
    </svg>
  );
}
