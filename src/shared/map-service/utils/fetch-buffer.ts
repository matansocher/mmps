import axios from 'axios';
import { Logger } from '@core/utils';

const logger = new Logger('fetch-buffer');

export async function fetchBuffer(url: string, headers: Record<string, string> = {}): Promise<Buffer | null> {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers,
      timeout: 5000,
    });
    return Buffer.from(response.data);
  } catch (err) {
    logger.warn(`Failed to fetch tile: ${url}, error - ${err}`);
    return null;
  }
}
