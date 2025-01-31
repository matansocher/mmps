import { promises as fs } from 'fs';

export async function saveVideoBytesArray(videoBytesArray, videoFilePath: string): Promise<string> {
  try {
    const buffer = Buffer.from(videoBytesArray);
    await fs.writeFile(videoFilePath, buffer);
    return videoFilePath;
  } catch {}
}
