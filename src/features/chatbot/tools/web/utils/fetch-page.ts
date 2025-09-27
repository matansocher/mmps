import axios, { AxiosError } from 'axios';

export interface FetchPageResult {
  html: string;
  url: string;
  statusCode: number;
}

export async function fetchPage(url: string): Promise<FetchPageResult> {
  try {
    // Validate URL
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Only HTTP and HTTPS protocols are supported');
    }

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ChatBot/1.0; +http://example.com/bot)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        Connection: 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 15000, // 15 second timeout
      maxRedirects: 5,
      validateStatus: (status) => status < 500, // Accept any status code less than 500
    });

    if (response.status >= 400) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return {
      html: response.data,
      url: response.config.url || url,
      statusCode: response.status,
    };
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.code === 'ECONNABORTED') {
        throw new Error(`Request timeout: The page took too long to respond`);
      }
      if (error.code === 'ENOTFOUND') {
        throw new Error(`Domain not found: ${url}`);
      }
      if (error.response) {
        throw new Error(`HTTP ${error.response.status}: Unable to fetch the page`);
      }
      throw new Error(`Network error: ${error.message}`);
    }
    throw error;
  }
}
