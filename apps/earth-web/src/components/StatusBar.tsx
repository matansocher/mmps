import { formatLatLonDms } from '../lib/coordinates';
import { formatAltitude, niceScale } from '../lib/format';
import type { CameraState } from '../hooks/useCameraState';
import type { LatLon, Units } from '../types';

type Props = {
  readonly camera: CameraState | null;
  readonly cursor: (LatLon & { readonly height: number }) | null;
  readonly units: Units;
};

export function StatusBar({ camera, cursor, units }: Props) {
  const scale = camera?.metersPerPixel ? niceScale(camera.metersPerPixel, 110, units) : null;
  return (
    <div className="pointer-events-none fixed bottom-1.5 left-3 z-10 flex items-center gap-4 rounded-md bg-black/45 px-3 py-1 text-[11.5px] whitespace-nowrap text-white/85 tabular-nums backdrop-blur-sm max-sm:hidden">
      {scale && (
        <span className="flex items-center gap-2">
          <span className="inline-block h-1.5 border-x border-b border-white/85" style={{ width: scale.px }} />
          {scale.label}
        </span>
      )}
      {cursor && (
        <>
          <span>{formatLatLonDms(cursor)}</span>
          <span>elev {formatAltitude(cursor.height, units)}</span>
        </>
      )}
      {camera && <span>Camera: {formatAltitude(camera.altitude, units)}</span>}
    </div>
  );
}
