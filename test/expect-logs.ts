import { expect, onTestFinished, vi } from 'vitest';
import { Logger } from '@core/utils/logger';

export function expectLogs(level: 'error' | 'warn', ...messages: readonly (string | RegExp)[]): void {
  const original = Logger.prototype[level];
  const actual: string[] = [];
  const spy = vi.spyOn(Logger.prototype, level).mockImplementation(function (this: Logger, message: string) {
    const expected = messages[actual.length];
    actual.push(message);
    if (typeof expected === 'string' ? message !== expected : !expected || !message.match(expected)) {
      original.call(this, message);
    }
  });

  onTestFinished(() => {
    try {
      expect(actual).toEqual(messages.map((message) => (typeof message === 'string' ? message : expect.stringMatching(message))));
    } finally {
      spy.mockRestore();
    }
  });
}
