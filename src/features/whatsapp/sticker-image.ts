import sharp from 'sharp';
import { STICKER_DIMENSION, STICKER_MAX_ANIMATED_BYTES, STICKER_MAX_STATIC_BYTES } from './constants';

const QUALITY_STEPS = [80, 65, 50, 35, 20];

export function getStickerByteLimit(animated: boolean): number {
  return animated ? STICKER_MAX_ANIMATED_BYTES : STICKER_MAX_STATIC_BYTES;
}

// Returns the sticker re-encoded under Meta's size limit, the original if it already fits, or null if it can't be made to fit.
export async function fitStickerToLimit(data: Buffer, animated: boolean): Promise<Buffer | null> {
  const limit = getStickerByteLimit(animated);
  if (data.length <= limit) return data;

  for (const quality of QUALITY_STEPS) {
    const output = await sharp(data, { animated })
      .resize(STICKER_DIMENSION, STICKER_DIMENSION, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality, effort: 4 })
      .toBuffer();
    if (output.length <= limit) return output;
  }
  return null;
}
