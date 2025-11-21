import { throttle } from './throttle';

describe('throttle()', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should call function immediately on first call with leading: true (default)', () => {
    const func = jest.fn();
    const throttled = throttle(func, 1000);

    throttled();
    expect(func).toHaveBeenCalledTimes(1);
  });

  it('should not call function immediately on first call with leading: false', () => {
    const func = jest.fn();
    const throttled = throttle(func, 1000, { leading: false });

    throttled();
    expect(func).toHaveBeenCalledTimes(0);
  });

  it('should throttle multiple calls within the wait period', () => {
    const func = jest.fn();
    const throttled = throttle(func, 1000);

    throttled();
    throttled();
    throttled();

    expect(func).toHaveBeenCalledTimes(1);
  });

  it('should call function again after wait period', () => {
    const func = jest.fn();
    const throttled = throttle(func, 1000);

    throttled();
    expect(func).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1000);
    throttled();
    expect(func).toHaveBeenCalledTimes(2);
  });

  it('should call trailing function when trailing: true (default)', () => {
    const func = jest.fn();
    const throttled = throttle(func, 1000);

    throttled();
    expect(func).toHaveBeenCalledTimes(1);

    throttled();
    throttled();
    throttled();
    expect(func).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1000);
    expect(func).toHaveBeenCalledTimes(2);
  });

  it('should not call trailing function when trailing: false', () => {
    const func = jest.fn();
    const throttled = throttle(func, 1000, { trailing: false });

    throttled();
    expect(func).toHaveBeenCalledTimes(1);

    throttled();
    throttled();
    expect(func).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1000);
    expect(func).toHaveBeenCalledTimes(1);
  });

  it('should pass arguments to the function', () => {
    const func = jest.fn();
    const throttled = throttle(func, 1000);

    throttled('arg1', 'arg2');
    expect(func).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('should use the latest arguments for trailing call', () => {
    const func = jest.fn();
    const throttled = throttle(func, 1000);

    throttled('first');
    throttled('second');
    throttled('third');

    jest.advanceTimersByTime(1000);
    expect(func).toHaveBeenLastCalledWith('third');
  });

  it('should cancel pending calls', () => {
    const func = jest.fn();
    const throttled = throttle(func, 1000);

    throttled();
    expect(func).toHaveBeenCalledTimes(1);

    throttled();
    expect(func).toHaveBeenCalledTimes(1);

    throttled.cancel();
    jest.advanceTimersByTime(1000);
    expect(func).toHaveBeenCalledTimes(1);
  });

  it('should work with leading: false and trailing: true', () => {
    const func = jest.fn();
    const throttled = throttle(func, 1000, { leading: false, trailing: true });

    throttled();
    expect(func).toHaveBeenCalledTimes(0);

    jest.advanceTimersByTime(1000);
    expect(func).toHaveBeenCalledTimes(1);
  });

  it('should maintain context (this)', () => {
    const obj = {
      value: 42,
      method: jest.fn(function (this: any) {
        return this.value;
      }),
    };

    const throttled = throttle(obj.method, 1000);
    throttled.call(obj);

    expect(obj.method).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple throttled instances independently', () => {
    const func1 = jest.fn();
    const func2 = jest.fn();
    const throttled1 = throttle(func1, 1000);
    const throttled2 = throttle(func2, 500);

    throttled1();
    throttled2();

    expect(func1).toHaveBeenCalledTimes(1);
    expect(func2).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(500);
    throttled2();
    expect(func2).toHaveBeenCalledTimes(2);
    expect(func1).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(500);
    throttled1();
    expect(func1).toHaveBeenCalledTimes(2);
  });
});
