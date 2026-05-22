type Props = {
  readonly className?: string;
  readonly rounded?: 'sm' | 'md' | 'full';
};

export function Skeleton({ className = '', rounded = 'md' }: Props) {
  const roundedClass = rounded === 'full' ? 'rounded-full' : rounded === 'sm' ? 'rounded-sm' : 'rounded';
  return <div className={`animate-pulse bg-bg-elevated ${roundedClass} ${className}`} />;
}
