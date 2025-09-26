import { env } from 'node:process';
import puppeteerCore from 'puppeteer-core';

export async function getBrowser() {
  if (env.PUPPETEER_EXECUTABLE_PATH) {
    return puppeteerCore.launch({
      executablePath: env.PUPPETEER_EXECUTABLE_PATH,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      headless: true,
    });
  }

  const puppeteer = await import('puppeteer');
  return puppeteer.launch({ headless: true });
}
