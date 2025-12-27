import { initGoogleSheetsClient, type LogSeverity, sendLogToSheets } from '@services/google-sheets';

const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
};

function createConsoleOverride(severity: LogSeverity, originalMethod: (...args: any[]) => void) {
  return function (...args: any[]): void {
    originalMethod.apply(console, args);

    const message = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ');

    sendLogToSheets(severity, message).catch((err) => {
      originalConsole.error(`Error in sendLogToSheets: ${err}`);
    });
  };
}

export async function initConsoleOverride(): Promise<void> {
  await initGoogleSheetsClient();

  console.log = createConsoleOverride('INFO', originalConsole.log);
  console.warn = createConsoleOverride('WARNING', originalConsole.warn);
  console.error = createConsoleOverride('ERROR', originalConsole.error);
}
