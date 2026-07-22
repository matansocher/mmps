import { afterEach, describe, expect, it, vi } from 'vitest';
import { forwardLogToNewRelic, redactLogMessage } from './new-relic';

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

const { recordLogEvent } = vi.hoisted(() => ({ recordLogEvent: vi.fn() }));

vi.mock('newrelic', () => ({
  default: {
    recordLogEvent,
  },
}));

describe('redactLogMessage()', () => {
  it('should redact credentials from log messages', () => {
    const message = 'token=secret-value NRAL-secret-value mongodb+srv://user:password@cluster.example.com 123456:abcdefghijklmnopqrstuvwxyz';

    expect(redactLogMessage(message)).toEqual('token=[REDACTED] NRAL[REDACTED] mongodb+srv://[REDACTED] 123456[REDACTED]');
  });
});

describe('forwardLogToNewRelic()', () => {
  it('should only forward logs in production', () => {
    vi.stubEnv('IS_PROD', 'false');

    forwardLogToNewRelic('ERROR', 'TestLogger', 'token=secret-value');

    expect(recordLogEvent).not.toHaveBeenCalled();
  });

  it('should forward a redacted error in production', () => {
    vi.stubEnv('IS_PROD', 'true');

    forwardLogToNewRelic('ERROR', 'TestLogger', 'token=secret-value');

    expect(recordLogEvent).toHaveBeenCalledWith({
      level: 'ERROR',
      message: 'TestLogger: token=[REDACTED]',
    });
  });

  it('should forward production log events', () => {
    vi.stubEnv('IS_PROD', 'true');

    forwardLogToNewRelic('LOG', 'TestLogger', 'Started');

    expect(recordLogEvent).toHaveBeenCalledWith({
      level: 'LOG',
      message: 'TestLogger: Started',
    });
  });
});
