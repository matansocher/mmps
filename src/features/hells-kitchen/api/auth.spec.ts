import { createSession, passwordsMatch, sessionFromCookie, verifySession } from './auth';

describe('Hell’s Kitchen private session', () => {
  it('accepts its own signed token and rejects tampering, expiry and another secret', () => {
    const now = 1000000;
    const token = createSession('test-secret', now);
    expect(verifySession(token, 'test-secret', now)).toEqual(true);
    expect(verifySession(`${token}x`, 'test-secret', now)).toEqual(false);
    expect(verifySession(token, 'other-secret', now)).toEqual(false);
    expect(verifySession(token, 'test-secret', now + 8 * 24 * 60 * 60 * 1000)).toEqual(false);
    expect(verifySession('Infinity.fake', 'test-secret', now)).toEqual(false);
  });
  it('handles malformed cookies without throwing', () => {
    expect(sessionFromCookie('hells_kitchen_session=%ZZ')).toEqual('');
    expect(sessionFromCookie('other=1; hells_kitchen_session=123.abc')).toEqual('123.abc');
    expect(passwordsMatch('short', 'different-length')).toEqual(false);
  });
});
