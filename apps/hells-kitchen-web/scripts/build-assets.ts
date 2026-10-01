import { rm } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// Builds optimized runtime artwork in public/game-assets from the editable masters in art/source.
// Run with: npx tsx apps/hells-kitchen-web/scripts/build-assets.ts
const root = path.resolve(import.meta.dirname, '..');
const source = (name: string) => path.join(root, 'art/source', name);
const target = (name: string) => path.join(root, 'public/game-assets', name);

type Matte = 'white' | 'black';

// Flood-fills the flat studio matte from the image border so interior highlights stay opaque.
async function cutout(input: string, matte: Matte, tolerance: number): Promise<sharp.Sharp> {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const value = matte === 'black' ? 0 : 255;
  const distance = (i: number) => Math.max(Math.abs(data[i] - value), Math.abs(data[i + 1] - value), Math.abs(data[i + 2] - value));
  const background = new Uint8Array(width * height);
  const stack: number[] = [];
  const seed = (x: number, y: number) => {
    const p = y * width + x;
    if (!background[p] && distance(p * 4) <= tolerance) {
      background[p] = 1;
      stack.push(p);
    }
  };
  for (let x = 0; x < width; x++) {
    seed(x, 0);
    seed(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    seed(0, y);
    seed(width - 1, y);
  }
  while (stack.length) {
    const p = stack.pop()!;
    const x = p % width;
    const y = (p - x) / width;
    if (x > 0) seed(x - 1, y);
    if (x < width - 1) seed(x + 1, y);
    if (y > 0) seed(x, y - 1);
    if (y < height - 1) seed(x, y + 1);
  }
  for (let p = 0; p < width * height; p++) {
    if (background[p]) {
      data[p * 4 + 3] = 0;
      continue;
    }
    // Feather edge pixels so sprites do not keep a bright or dark halo.
    const x = p % width;
    const y = (p - x) / width;
    let near = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (background[Math.min(height - 1, Math.max(0, y + dy)) * width + Math.min(width - 1, Math.max(0, x + dx))]) near++;
    if (near) data[p * 4 + 3] = Math.round(255 * Math.min(1, distance(p * 4) / (tolerance * 2.2)) * (1 - near / 14));
  }
  return sharp(data, { raw: { width, height, channels: 4 } });
}

async function write(image: sharp.Sharp, name: string, width: number, alpha: boolean): Promise<void> {
  const buffer = await image.png().toBuffer();
  const info = await sharp(buffer)
    .resize({ width })
    .webp({ quality: alpha ? 86 : 82, alphaQuality: 90, effort: 6 })
    .toFile(target(name));
  console.log(`${name}: ${info.width}×${info.height}, ${Math.round(info.size / 1024)} KB`);
}

await write(sharp(source('dining.png')), 'dining.webp', 1448, false);
await write(sharp(source('kitchen.png')), 'kitchen.webp', 1448, false);
await write(sharp(source('chef.png')), 'chef.webp', 1128, false);
await write(await cutout(source('people.png'), 'white', 30), 'people.webp', 1024, true);
await write(await cutout(source('ingredients.png'), 'black', 30), 'ingredients.webp', 888, true);
for (const legacy of ['dining.png', 'kitchen.png', 'chef.png', 'people.png', 'ingredients.png']) await rm(target(legacy), { force: true });
