type ThrottleOptions = {
  readonly leading?: boolean;
  readonly trailing?: boolean;
};

export function throttle<T extends (...args: any[]) => any>(func: T, wait: number, options: ThrottleOptions = {}): T & { cancel: () => void } {
  let timeout: NodeJS.Timeout | null = null;
  let previous = 0;
  let lastArgs: any[] | null = null;

  const { leading = true, trailing = true } = options;

  const throttled = function (this: any, ...args: any[]) {
    const now = Date.now();

    if (!previous && !leading) {
      previous = now;
    }

    const remaining = wait - (now - previous);
    lastArgs = args;

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func.apply(this, args);
      lastArgs = null;
    } else if (!timeout && trailing) {
      timeout = setTimeout(() => {
        previous = leading ? Date.now() : 0;
        timeout = null;
        if (lastArgs) {
          func.apply(this, lastArgs);
          lastArgs = null;
        }
      }, remaining);
    }
  } as T & { cancel: () => void };

  throttled.cancel = function () {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    previous = 0;
    lastArgs = null;
  };

  return throttled;
}