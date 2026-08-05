import { getErrorMessage } from './get-error-message';

describe('getErrorMessage()', () => {
  it('should return the message when given an Error', () => {
    expect(getErrorMessage(new Error('boom'))).toEqual('boom');
  });

  it('should return the message for Error subclasses', () => {
    expect(getErrorMessage(new TypeError('bad type'))).toEqual('bad type');
  });

  it('should stringify a non-Error value', () => {
    expect(getErrorMessage('just a string')).toEqual('just a string');
  });

  it('should stringify a number', () => {
    expect(getErrorMessage(42)).toEqual('42');
  });

  it('should stringify null and undefined', () => {
    expect(getErrorMessage(null)).toEqual('null');
    expect(getErrorMessage(undefined)).toEqual('undefined');
  });
});
