import { createSavingsSessionToken, passwordsMatch, readCookie, verifySavingsSessionToken } from './auth';

describe('savings auth', () => {
  it('should compare passwords without exposing their length', () => {
    expect(passwordsMatch('family-secret', 'family-secret')).toEqual(true);
    expect(passwordsMatch('wrong', 'family-secret')).toEqual(false);
  });

  it('should create a valid expiring session token', () => {
    const now = Date.UTC(2026, 6, 17);
    const token = createSavingsSessionToken('family-secret', now);

    expect(verifySavingsSessionToken(token, 'family-secret', now + 1_000)).toEqual(true);
    expect(verifySavingsSessionToken(token, 'wrong-secret', now + 1_000)).toEqual(false);
    expect(verifySavingsSessionToken(token, 'family-secret', now + 8 * 24 * 60 * 60 * 1_000)).toEqual(false);
  });

  it('should read a named cookie', () => {
    expect(readCookie('theme=dark; savings_session=abc.def; other=value', 'savings_session')).toEqual('abc.def');
    expect(readCookie('theme=dark', 'savings_session')).toEqual(null);
  });
});
