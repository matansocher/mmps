import { Logger } from '@core/utils/logger';
import { expectLogs } from './expect-logs';

const { finish } = vi.hoisted(() => ({ finish: vi.fn<(callback: () => void) => void>() }));

// Keep assertions and spies real; capture only the helper's end-of-test callback.
vi.mock('vitest', () => ({ expect, vi, onTestFinished: finish }));

describe('expectLogs()', () => {
  const logger = new Logger('test');

  beforeEach(() => finish.mockClear());
  afterEach(() => vi.restoreAllMocks());

  function finishTest(): void {
    expect(finish).toHaveBeenCalledTimes(1);
    finish.mock.calls[0][0]();
  }

  it('silences and asserts the expected messages, then restores the logger', () => {
    const original = Logger.prototype.error;
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expectLogs('error', 'expected failure', /^retry \d+$/);

    logger.error('expected failure');
    logger.error('retry 1');

    expect(consoleError).not.toHaveBeenCalled();
    finishTest();
    expect(Logger.prototype.error).toEqual(original);
  });

  it('prints unexpected messages and fails the assertion while still restoring the logger', () => {
    const original = Logger.prototype.error;
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expectLogs('error', 'expected failure');

    logger.error('unexpected failure');

    expect(consoleError).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('unexpected failure'));
    expect(finishTest).toThrow();
    expect(Logger.prototype.error).toEqual(original);
  });

  it('fails when an expected message is missing', () => {
    expectLogs('error', 'expected failure');

    expect(finishTest).toThrow();
  });

  it('prints and rejects extra occurrences of an expected message', () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expectLogs('warn', 'retry');

    logger.warn('retry');
    logger.warn('retry');

    expect(consoleWarn).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('retry'));
    expect(finishTest).toThrow();
  });

  it('leaves other log levels untouched', () => {
    const original = Logger.prototype.warn;
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expectLogs('error', 'expected failure');

    logger.warn('unexpected warning');
    logger.error('expected failure');

    expect(Logger.prototype.warn).toEqual(original);
    expect(consoleWarn).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('unexpected warning'));
    finishTest();
  });

  it('keeps recorded messages when an afterEach hook restores mocks before verification', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expectLogs('error', 'expected failure');

    logger.error('expected failure');
    vi.restoreAllMocks();

    finishTest();
  });
});
