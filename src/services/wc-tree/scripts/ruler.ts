import { createCanvas, loadImage } from 'canvas';
import { writeFileSync } from 'node:fs';
import { BASE_IMAGE_PATH } from '@services/wc-tree/constants';
(async () => {
  const base = await loadImage(BASE_IMAGE_PATH);
  // Focus region: left R16 column, boxes 1-2 (x 200-360, y 200-520)
  const x0 = 200, y0 = 205, w = 200, h = 340, scale = 3;
  const c = createCanvas(w * scale, h * scale);
  const ctx = c.getContext('2d');
  ctx.drawImage(base, x0, y0, w, h, 0, 0, w * scale, h * scale);
  ctx.font = '11px sans-serif';
  ctx.lineWidth = 1;
  for (let y = y0; y <= y0 + h; y += 10) {
    const yy = (y - y0) * scale;
    const major = y % 50 === 0;
    ctx.strokeStyle = major ? 'rgba(0,255,0,0.9)' : 'rgba(0,255,0,0.3)';
    ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(w * scale, yy); ctx.stroke();
    if (major) { ctx.fillStyle = '#00ff00'; ctx.fillText(String(y), 2, yy - 2); }
  }
  for (let x = x0; x <= x0 + w; x += 10) {
    const xx = (x - x0) * scale;
    const major = x % 50 === 0;
    ctx.strokeStyle = major ? 'rgba(0,200,255,0.9)' : 'rgba(0,200,255,0.3)';
    ctx.beginPath(); ctx.moveTo(xx, 0); ctx.lineTo(xx, h * scale); ctx.stroke();
    if (major) { ctx.fillStyle = '#00ccff'; ctx.fillText(String(x), xx + 2, 12); }
  }
  writeFileSync('/tmp/ruler-left-r16.png', c.toBuffer('image/png'));
  console.log('wrote /tmp/ruler-left-r16.png');
})();
