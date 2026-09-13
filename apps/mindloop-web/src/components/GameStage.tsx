import type { ReactNode } from 'react';

interface Props {
  hud?: ReactNode;
  children: ReactNode;
}

/**
 * Consistent play-area layout for every game: a HUD row on top and a
 * centered stage below. Games render their board into `children`.
 */
export function GameStage({ hud, children }: Props) {
  return (
    <div className="ml-game-stage flex min-w-0 flex-1 flex-col gap-4 pt-3">
      {hud && <div className="flex-none">{hud}</div>}
      <div className="relative flex flex-1 items-center justify-center">
        <div className="flex w-full flex-col items-center justify-center">{children}</div>
      </div>
    </div>
  );
}
