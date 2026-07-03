import { createCanvas, loadImage } from 'canvas';
import { BASE_IMAGE_PATH } from '@services/wc-tree/constants';
(async () => {
  const base = await loadImage(BASE_IMAGE_PATH);
  const c = createCanvas(base.width, base.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(base, 0, 0);
  // sample colors along x at a suspected border y and interior y
  const dump = (y: number) => {
    const cols = [310, 340, 370, 400];
    console.log(`y=${y}: ` + cols.map((x) => { const [r,g,b]=ctx.getImageData(x,y,1,1).data; return `${x}:(${r},${g},${b})`; }).join('  '));
  };
  for (let y = 210; y <= 300; y += 4) dump(y);
})();
