import { Cartesian2, Cartesian3, Ellipsoid, EllipsoidalOccluder, SceneTransforms, type Viewer } from 'cesium';
import { useEffect, useRef } from 'react';

type Props = {
  readonly viewer: Viewer;
  readonly lat: number;
  readonly lon: number;
  readonly label: string;
};

// HTML pin that tracks a point on the globe every frame and hides when it's behind the planet.
export function AnswerPin({ viewer, lat, lon, label }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const position = Cartesian3.fromDegrees(lon, lat);
    const scratch = new Cartesian2();
    const update = () => {
      const element = ref.current;
      if (!element) return;
      const point = SceneTransforms.worldToWindowCoordinates(viewer.scene, position, scratch);
      const occluder = new EllipsoidalOccluder(Ellipsoid.WGS84, viewer.camera.positionWC);
      const visible = !!point && occluder.isPointVisible(position);
      element.style.opacity = visible ? '1' : '0';
      if (point) element.style.transform = `translate(${point.x}px, ${point.y}px)`;
    };
    const remove = viewer.scene.postRender.addEventListener(update);
    viewer.scene.requestRender();
    return remove;
  }, [viewer, lat, lon]);

  return (
    <div ref={ref} className="answer-pin" style={{ opacity: 0 }} aria-hidden="true">
      <span className="answer-pin-ring" />
      <span className="absolute -top-[5px] -left-[5px] h-2.5 w-2.5 rounded-full bg-[var(--color-ok)] ring-2 ring-[var(--color-bg)]" />
      <span className="absolute bottom-3 left-0 flex -translate-x-1/2 flex-col items-center">
        <span className="rounded-full border-2 border-[var(--color-ok)] bg-[var(--color-ink)] px-3 py-1 text-[14px] font-bold whitespace-nowrap text-white shadow-[0_8px_20px_rgb(0_0_0/0.5)]">
          <span className="text-[var(--color-ok)]">✓</span> {label} is here
        </span>
        <span className="h-4 w-0.5 bg-[var(--color-ok)]" />
      </span>
    </div>
  );
}
