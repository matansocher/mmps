import axios from 'axios';
import { getErrorMessage, Logger } from '@core/utils';

const logger = new Logger('map-service:fetch-buffer');

export async function fetchBuffer(url: string, headers: Record<string, string> = {}): Promise<Buffer | null> {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers,
      timeout: 5000,
    });
    return Buffer.from(response.data);
  } catch (err) {
    logger.warn(`Failed to fetch tile ${url}: ${getErrorMessage(err)}`);
    return null;
  }
}
