import { createCanvas, loadImage } from 'canvas';
import { writeFileSync } from 'node:fs';
import { BASE_IMAGE_PATH, QF, SF, FINAL } from '@services/wc-tree/constants';
(async () => {
  const base = await loadImage(BASE_IMAGE_PATH);
  const c = createCanvas(base.width, base.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(base, 0, 0);
  const cross = (x: number, y: number, col: string, r = 18) => {
    ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.lineTo(x + 10, y); ctx.moveTo(x, y - 10); ctx.lineTo(x, y + 10); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  };
  // QF left/right, symmetric off
  for (const cy of QF.boxCy) {
    cross(QF.x.L - QF.flagDx, cy - QF.off, 'red'); cross(QF.x.L - QF.flagDx, cy + QF.off, 'cyan');
    cross(QF.x.R + QF.flagDx, cy - QF.off, 'red'); cross(QF.x.R + QF.flagDx, cy + QF.off, 'cyan');
  }
  // SF
  cross(SF.x.L - SF.flagDx, SF.boxCy - SF.off, 'red'); cross(SF.x.L - SF.flagDx, SF.boxCy + SF.off, 'cyan');
  cross(SF.x.R + SF.flagDx, SF.boxCy - SF.off, 'red'); cross(SF.x.R + SF.flagDx, SF.boxCy + SF.off, 'cyan');
  // FINAL
  cross(FINAL.x - FINAL.flagDx, FINAL.ys[0], 'yellow'); cross(FINAL.x - FINAL.flagDx, FINAL.ys[1], 'yellow');
  // center crop
  const x0 = 400, y0 = 300, w = 470, h = 500, s = 1.5;
  const crop = createCanvas(Math.round(w * s), Math.round(h * s));
  const cc = crop.getContext('2d');
  cc.drawImage(c, x0, y0, w, h, 0, 0, w * s, h * s);
  writeFileSync('/tmp/marks-center.png', crop.toBuffer('image/png'));
  console.log('done');
})();
