export type AppIconName =
  | 'ai-engineering'
  | 'arrow-up'
  | 'book'
  | 'brain'
  | 'browse'
  | 'check'
  | 'complete'
  | 'fire'
  | 'fuzzy'
  | 'moon'
  | 'map'
  | 'nope'
  | 'review'
  | 'scenario'
  | 'sun'
  | 'system-design'
  | 'target'
  | 'today'
  | 'unknown';

type AppIconProps = {
  readonly name: AppIconName;
  readonly className?: string;
  readonly size?: number;
};

export function AppIcon({ name, className, size = 24 }: AppIconProps) {
  const commonProps = {
    className,
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  switch (name) {
    case 'arrow-up':
      return (
        <svg {...commonProps}>
          <path d="m6 10 6-6 6 6M12 4v16" />
        </svg>
      );
    case 'map':
      return (
        <svg {...commonProps}>
          <path d="m3.5 6 5-2.5 7 3 5-2.5v14l-5 2.5-7-3-5 2.5zM8.5 3.5v14M15.5 6.5v14" />
        </svg>
      );
    case 'scenario':
      return (
        <svg {...commonProps}>
          <path d="M6 3.5v17M6 6h8l-2.2 3L14 12H6M6 17h11" />
          <circle cx="18" cy="17" r="2" />
        </svg>
      );
    case 'fire':
      return (
        <svg {...commonProps}>
          <path d="M12.4 21c4 0 6.6-2.6 6.6-6.4 0-3.1-1.6-5.7-4.8-8.6.1 2.7-1.2 4-2.3 4.7.1-3.8-1.8-6.3-3.8-7.7.2 3.6-3.1 5.7-3.1 10.7C5 18 8 21 12.4 21Z" />
          <path d="M9.4 16.3c0 2 1.3 3.4 3.2 3.4 1.8 0 3-1.2 3-3 0-1.5-.8-2.8-2.2-4.2-.1 1.4-.9 2.1-1.6 2.5-.2-1.5-.8-2.5-1.6-3.2.1 1.9-.8 2.8-.8 4.5Z" />
        </svg>
      );
    case 'sun':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="3.5" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
        </svg>
      );
    case 'moon':
      return (
        <svg {...commonProps}>
          <path d="M20 15.4A8.5 8.5 0 0 1 8.6 4a8.5 8.5 0 1 0 11.4 11.4Z" />
        </svg>
      );
    case 'today':
      return (
        <svg {...commonProps}>
          <rect x="3.5" y="4.5" width="17" height="16" rx="3" />
          <path d="M7.5 2.5v4M16.5 2.5v4M3.5 9h17M8 13h3v3H8z" />
        </svg>
      );
    case 'browse':
    case 'book':
      return (
        <svg {...commonProps}>
          <path d="M4 4.5c2.7-.7 5.2-.2 7.5 1.5v13c-2.3-1.7-4.8-2.2-7.5-1.5zM20 4.5c-2.7-.7-5.2-.2-7.5 1.5v13c2.3-1.7 4.8-2.2 7.5-1.5z" />
          {name === 'browse' ? <path d="M7 9h2M16 9h1.5M7 12h2M16 12h1.5" /> : null}
        </svg>
      );
    case 'review':
      return (
        <svg {...commonProps}>
          <path d="M20 7.5h-7.5a6 6 0 1 0 5.7 7.8" />
          <path d="m17 4.5 3 3-3 3M4 16.5h7.5" />
          <path d="m7 13.5-3 3 3 3" />
        </svg>
      );
    case 'system-design':
      return (
        <svg {...commonProps}>
          <rect x="3" y="3" width="6" height="5" rx="1.5" />
          <rect x="15" y="3" width="6" height="5" rx="1.5" />
          <rect x="9" y="16" width="6" height="5" rx="1.5" />
          <path d="M6 8v3h12V8M12 11v5" />
        </svg>
      );
    case 'ai-engineering':
    case 'brain':
      return (
        <svg {...commonProps}>
          <path d="M9.5 4.5A3 3 0 0 0 4.8 7a3.2 3.2 0 0 0-.3 5.8A3.3 3.3 0 0 0 8 18a3 3 0 0 0 4 2.2V5.8a3 3 0 0 0-2.5-1.3ZM14.5 4.5A3 3 0 0 1 19.2 7a3.2 3.2 0 0 1 .3 5.8A3.3 3.3 0 0 1 16 18a3 3 0 0 1-4 2.2V5.8a3 3 0 0 1 2.5-1.3Z" />
          <path d="M8 9.5h2M14 8h2M7.5 14H10M14 13.5h2.5M10 9.5v2M14 8v2" />
        </svg>
      );
    case 'nope':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="m9 9 6 6M15 9l-6 6" />
        </svg>
      );
    case 'fuzzy':
      return (
        <svg {...commonProps}>
          <path d="M8.8 9a3.3 3.3 0 0 1 6.4 1.1c0 2.4-3.2 2.5-3.2 4.4" />
          <path d="M12 18.5h.01" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
    case 'check':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12.2 2.6 2.6L16.5 9" />
        </svg>
      );
    case 'complete':
      return (
        <svg {...commonProps}>
          <path d="M5 12.5 9.2 17 19 7" />
          <path d="M7 3.5h10M4 7v10M20 11v6a3 3 0 0 1-3 3H7" />
        </svg>
      );
    case 'target':
      return (
        <svg {...commonProps}>
          <circle cx="11" cy="13" r="8" />
          <circle cx="11" cy="13" r="4" />
          <path d="m13.5 10.5 7-7M16.5 3.5h4v4" />
        </svg>
      );
    case 'unknown':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9 9a3.2 3.2 0 0 1 6.2 1.1c0 2.4-3.2 2.5-3.2 4.4M12 18h.01" />
        </svg>
      );
  }
}
