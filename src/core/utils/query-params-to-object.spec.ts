import { queryParamsToObject } from './query-params-to-object';

describe('queryParamsToObject()', () => {
  it('should return empty object for empty string', () => {
    const actualResult = queryParamsToObject('');
    expect(actualResult).toEqual({});
  });

  it('should return an object for one key string', () => {
    const body = 'aaa=111';
    const actualResult = queryParamsToObject(body);
    expect(actualResult).toEqual({ aaa: '111' });
  });

  it('should return an object for one multiple keys string', () => {
    const body = 'aaa=111&bbb=str';
    const actualResult = queryParamsToObject(body);
    expect(actualResult).toEqual({ aaa: '111', bbb: 'str' });
  });
});
