import { useEffect, useRef } from 'react';

type Props = {
  readonly fire: boolean;
  readonly count?: number;
};

const COLORS = ['#F97316', '#3B82F6', '#22C55E', '#FDB927', '#EF4444', '#FFFFFF'];

// Dependency-free canvas confetti burst. Renders once when `fire` flips true.
export function Confetti({ fire, count = 90 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!fire) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = (canvas.width = canvas.offsetWidth * dpr);
    const H = (canvas.height = canvas.offsetHeight * dpr);

    type P = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; size: number; color: string };
    const parts: P[] = Array.from({ length: count }, () => ({
      x: W / 2,
      y: H * 0.28,
      vx: (Math.random() - 0.5) * 14 * dpr,
      vy: (Math.random() - 1.1) * 14 * dpr,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      size: (5 + Math.random() * 6) * dpr,
      color: COLORS[(Math.random() * COLORS.length) | 0],
    }));

    let raf = 0;
    let frame = 0;
    const gravity = 0.35 * dpr;

    const tick = () => {
      ctx.clearRect(0, 0, W, H);
      frame++;
      for (const p of parts) {
        p.vy += gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, 1 - frame / 120);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5);
        ctx.restore();
      }
      if (frame < 120) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [fire, count]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />;
}
