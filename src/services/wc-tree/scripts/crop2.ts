import { createCanvas, loadImage } from 'canvas';
import { writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { OUTPUT_DIR } from '@services/wc-tree/constants';
(async () => {
  const files = readdirSync(OUTPUT_DIR).filter((f) => f.endsWith('.png')).sort();
  const latest = path.join(OUTPUT_DIR, files[files.length - 1]);
  const img = await loadImage(latest);
  const mk = (x0: number, y0: number, w: number, h: number, out: string, s = 2) => {
    const c = createCanvas(w * s, h * s); const ctx = c.getContext('2d');
    ctx.drawImage(img, x0, y0, w, h, 0, 0, w * s, h * s);
    writeFileSync(out, c.toBuffer('image/png'));
  };
  mk(200, 205, 300, 620, '/tmp/gen-left.png');
  mk(770, 205, 300, 620, '/tmp/gen-right.png');
  console.log('cropped', latest);
})();
