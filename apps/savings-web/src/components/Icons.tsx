import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

export function SaveIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3.75h11.25L20.25 7.5v12.75H3.75V3.75H5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75v5.5h8v-5.5M7.5 20.25v-7h9v7" />
    </svg>
  );
}

export function LogoutIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 8V5.75A2.75 2.75 0 0 0 11.75 3h-5A2.75 2.75 0 0 0 4 5.75v12.5A2.75 2.75 0 0 0 6.75 21h5a2.75 2.75 0 0 0 2.75-2.75V16" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 12h10m-3.5-3.5L20 12l-3.5 3.5" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function EditIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.25 5.25 4.5 4.5M5 19l3.25-.75L19 7.5a1.6 1.6 0 0 0 0-2.25l-.25-.25a1.6 1.6 0 0 0-2.25 0L5.75 15.75 5 19Z" />
    </svg>
  );
}

export function CoinsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
      <ellipse cx="8.5" cy="6.25" rx="5.25" ry="2.5" />
      <path strokeLinecap="round" d="M3.25 6.25v4c0 1.38 2.35 2.5 5.25 2.5s5.25-1.12 5.25-2.5v-4" />
      <path strokeLinecap="round" d="M3.25 10.25v4c0 1.38 2.35 2.5 5.25 2.5.7 0 1.37-.07 1.98-.19" />
      <circle cx="16.5" cy="15.5" r="4.75" />
      <path strokeLinecap="round" d="M16.5 13.25v4.5M14.25 15.5h4.5" />
    </svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 7h15M9 3.75h6M7 7l.75 13.25h8.5L17 7M10 10.5v6M14 10.5v6" />
    </svg>
  );
}

export function EyeIcon({ crossed = false, ...props }: IconProps & { readonly crossed?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.75 12s3.25-5.25 9.25-5.25S21.25 12 21.25 12 18 17.25 12 17.25 2.75 12 2.75 12Z" />
      <circle cx="12" cy="12" r="2.25" />
      {crossed ? <path strokeLinecap="round" d="m4 4 16 16" /> : null}
    </svg>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7.5V3.75m0 0h-3.75M20 3.75l-3.2 3.2A7 7 0 1 0 18.4 16" />
    </svg>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
      <path strokeLinecap="round" d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6" />
      <circle cx="14" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
      <path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function ArrowIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-5-5 5 5-5 5" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m5.5 8.5 6.5 7 6.5-7" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  );
}

export function LightbulbIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18h6M10 21h4M8 14.5A5.5 5.5 0 1 1 16 14.5c-.8.9-1.4 1.7-1.4 2.75H9.4c0-1.05-.6-1.85-1.4-2.75Z" />
      <path strokeLinecap="round" d="M12 3v1.5" />
    </svg>
  );
}
