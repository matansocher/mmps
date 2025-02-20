import { stringify } from './stringify';

describe('stringify()', () => {
  it('should return empty string for empty object', () => {
    const actualResult = stringify({});
    expect(actualResult).toEqual('');
  });

  it('should return a string for all data pieces in object and filter nulls', () => {
    const body = { aaa: 111, bbb: 'str', ccc: true, ddd: false, eee: null, fff: undefined };
    const actualResult = stringify(body);
    expect(actualResult).toEqual(`aaa: 111, bbb: str, ccc: true, ddd: false`);
  });
});
