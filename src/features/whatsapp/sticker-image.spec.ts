import { randomBytes } from 'node:crypto';
import sharp from 'sharp';
import { fitStickerToLimit, getStickerByteLimit } from './sticker-image';

const noiseFrame = (size: number, upscaleTo = size) =>
  sharp(randomBytes(size * size * 4), { raw: { width: size, height: size, channels: 4 } })
    .resize(upscaleTo, upscaleTo, { kernel: 'cubic' })
    .png()
    .toBuffer();

const solidFrame = (r: number) =>
  sharp({ create: { width: 512, height: 512, channels: 4, background: { r, g: 100, b: 50, alpha: 1 } } })
    .png()
    .toBuffer();

const animatedWebp = async (frames: Buffer[], quality = 100) =>
  sharp(frames, { join: { animated: true } })
    .webp({ quality, lossless: quality === 100, delay: 100, loop: 0 })
    .toBuffer();

describe('fitStickerToLimit()', () => {
  it('should return a sticker that already fits unchanged', async () => {
    const data = await animatedWebp([await solidFrame(10), await solidFrame(200)]);
    expect(await fitStickerToLimit(data, true)).toBe(data);
  });

  it('should shrink an oversized animated sticker and keep its frames', async () => {
    const frames = await Promise.all([1, 2].map(() => noiseFrame(32, 1024)));
    const data = await animatedWebp(frames);
    expect(data.length).toBeGreaterThan(getStickerByteLimit(true));

    const fitted = await fitStickerToLimit(data, true);
    expect(fitted).not.toBeNull();
    expect(fitted!.length).toBeLessThanOrEqual(getStickerByteLimit(true));
    const meta = await sharp(fitted!, { animated: true }).metadata();
    expect(meta).toEqual(expect.objectContaining({ format: 'webp', width: 512, pages: 2, loop: 0, delay: [100, 100], pageHeight: 512 }));
  });

  it('should give up when even the lowest quality is too big', async () => {
    const frames = await Promise.all(Array.from({ length: 12 }, () => noiseFrame(512)));
    const data = await animatedWebp(frames, 90);
    expect(await fitStickerToLimit(data, true)).toBeNull();
  }, 30_000);
});
