import newrelic from 'newrelic';
import { env } from 'node:process';

type LogLevel = 'ERROR' | 'LOG' | 'WARN';

const SENSITIVE_PATTERNS = [
  /(NRAL|NRAK|sk|rk)-[A-Za-z0-9_-]+/g,
  /(mongodb(?:\+srv)?:\/\/)[^\s'"]+/gi,
  /((?:api[_-]?key|authorization|token|password|secret)\s*[=:]\s*)[^\s,;]+/gi,
  /\b(\d{6,}):[A-Za-z0-9_-]{20,}\b/g,
];

export function forwardLogToNewRelic(level: LogLevel, context: string, message: string): void {
  if (env.IS_PROD !== 'true') return;

  newrelic.recordLogEvent({
    level,
    message: `${context}: ${redactLogMessage(message)}`,
  });
}

export function redactLogMessage(message: string): string {
  return SENSITIVE_PATTERNS.reduce((redacted, pattern) => redacted.replace(pattern, '$1[REDACTED]'), message);
}
