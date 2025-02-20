import { getLogBody } from './get-log-body';

describe('getLogBody()', () => {
  it('should return empty string for empty object', () => {
    const actualResult = getLogBody({});
    expect(actualResult).toEqual('');
  });

  it('should return a string for all data pieces in object and filter nulls', () => {
    const body = { aaa: 111, bbb: 'str', ccc: true, ddd: false, eee: null, fff: undefined };
    const actualResult = getLogBody(body);
    expect(actualResult).toEqual(`aaa: 111, bbb: str, ccc: true, ddd: false`);
  });
});
