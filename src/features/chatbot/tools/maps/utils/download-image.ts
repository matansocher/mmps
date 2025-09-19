import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

export async function downloadImage(url: string, filepath: string): Promise<string> {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });

    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filepath, response.data);

    return filepath;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to download image: ${error.message}`);
    }
    throw error;
  }
}
