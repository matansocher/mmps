import { promises as fs } from 'fs';

export async function saveVideoBytesArray(videoBytesArray: Uint8Array | number[], videoFilePath: string): Promise<string | undefined> {
  try {
    const buffer = Buffer.from(videoBytesArray);
    await fs.writeFile(videoFilePath, buffer);
    return videoFilePath;
  } catch {
    return undefined;
  }
}
