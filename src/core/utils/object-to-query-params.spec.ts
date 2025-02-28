import { objectToQueryParams } from './object-to-query-params';

describe('objectToQueryParams()', () => {
  it('should return empty string for empty object', () => {
    const actualResult = objectToQueryParams({});
    expect(actualResult).toEqual('');
  });

  it('should return a string for all one key object', () => {
    const body = { aaa: 111 };
    const actualResult = objectToQueryParams(body);
    expect(actualResult).toEqual('aaa=111');
  });

  it('should return a string for all data pieces in object', () => {
    const body = { aaa: 111, bbb: 'str' };
    const actualResult = objectToQueryParams(body);
    expect(actualResult).toEqual('aaa=111&bbb=str');
  });
});
