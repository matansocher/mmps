import type { Viewer } from 'cesium';

export async function captureScreenshot(viewer: Viewer): Promise<Blob> {
  viewer.render();
  const source = viewer.scene.canvas;
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(source, 0, 0);

  // Attribution must stay visible on exported imagery.
  const credits = Array.from(document.querySelectorAll('.cesium-credit-textContainer, .cesium-credit-logoContainer'))
    .map((el) => (el.textContent ?? '').trim())
    .filter(Boolean)
    .join(' · ');
  const label = `Google${credits ? ` · ${credits}` : ''}`;
  const scale = canvas.width / source.clientWidth || 1;
  ctx.font = `${12 * scale}px Inter, system-ui, sans-serif`;
  const padding = 6 * scale;
  const width = Math.min(ctx.measureText(label).width + padding * 2, canvas.width);
  const height = 20 * scale;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(canvas.width - width, canvas.height - height, width, height);
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, canvas.width - width + padding, canvas.height - height / 2, width - padding * 2);

  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Screenshot failed'))), 'image/png'));
}
