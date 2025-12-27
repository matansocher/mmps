import type { LogSeverity, SeverityColor } from './types';

export const SHEETS_SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

export const SEVERITY_COLORS: Record<LogSeverity, SeverityColor> = {
  INFO: { red: 0.85, green: 0.92, blue: 0.83 },
  WARNING: { red: 1.0, green: 0.95, blue: 0.8 },
  ERROR: { red: 0.96, green: 0.8, blue: 0.8 },
};
