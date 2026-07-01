type IconProps = { readonly className?: string; readonly size?: number };

function base(size: number, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
  };
}

export function ArrowLeft({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

export function ChevronRight({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function ChevronLeft({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export function List({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </svg>
  );
}

export function Close({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function Check({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function Sparkles({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M9.94 6.06 12 2l2.06 4.06L18 8l-4 2-2 4-2-4-4-2 3.94-1.94Z" />
      <path d="M19 15l.7 1.4L21 17l-1.3.6L19 19l-.7-1.4L17 17l1.3-.6L19 15Z" />
      <path d="M5 14l.6 1.2L7 16l-1.4.7L5 18l-.6-1.3L3 16l1.4-.8L5 14Z" />
    </svg>
  );
}

export function Trophy({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

export function Flame({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5Z" />
    </svg>
  );
}

export function Brain({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
    </svg>
  );
}

export function BookOpen({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 7v14" />
      <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3Z" />
    </svg>
  );
}
