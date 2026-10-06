import { createStepTimer, parseTagEdits, tokenize } from './stickers.utils';

describe('tokenize()', () => {
  test.each([
    { text: 'Happy  Cat!', expected: ['happy', 'cat'] },
    { text: 'חתול שמח, חתול', expected: ['חתול', 'שמח'] },
    { text: 'ג׳ורג׳ עו״ד', expected: ['ג׳ורג׳', 'עו״ד'] },
    { text: `ג'ורג' עו"ד`, expected: ['ג׳ורג׳', 'עו״ד'] },
    { text: 'ג’ורג’ עו”ד', expected: ['ג׳ורג׳', 'עו״ד'] },
    { text: '"שלום" \'cat\' don\'t', expected: ['שלום', 'cat', "don't"] },
    { text: 'צה"ל, ה׳!', expected: ['צה״ל', 'ה׳'] },
    { text: 'lol 100%', expected: ['lol', '100'] },
    { text: '  ?! ', expected: [] },
    { text: 'חתול😂😂 🔥', expected: ['חתול', '😂', '🔥'] },
    { text: '❤️ ❤', expected: ['❤'] },
    { text: '👍🏽 👍', expected: ['👍🏽', '👍'] },
    { text: '👨‍👩‍👧 ❤️‍🔥', expected: ['👨‍👩‍👧', '❤‍🔥'] },
    { text: '🇮🇱🇺🇸', expected: ['🇮🇱', '🇺🇸'] },
  ])('should tokenize "$text"', ({ text, expected }) => {
    expect(tokenize(text)).toEqual(expected);
  });
});

describe('parseTagEdits()', () => {
  test.each([
    { text: 'Happy cat', expected: { add: ['happy', 'cat'], remove: [] } },
    { text: 'טוב -לילה', expected: { add: ['טוב'], remove: ['לילה'] } },
    { text: `עו"ד -ג'ורג'`, expected: { add: ['עו״ד'], remove: ['ג׳ורג׳'] } },
    { text: 'לילה- Cat', expected: { add: ['cat'], remove: ['לילה'] } },
    { text: '-cat cat', expected: { add: [], remove: ['cat'] } },
    { text: '-', expected: { add: [], remove: [] } },
    { text: '  dog,  -dog-  ', expected: { add: [], remove: ['dog'] } },
    { text: '😂 cat -🔥', expected: { add: ['😂', 'cat'], remove: ['🔥'] } },
  ])('should parse "$text"', ({ text, expected }) => {
    expect(parseTagEdits(text)).toEqual(expected);
  });
});

describe('createStepTimer()', () => {
  it('should list each step duration in order, then the total', async () => {
    const ticks = [0, 10, 25, 30, 100, 120];
    const timer = createStepTimer(() => ticks.shift());
    await timer.time('search', async () => 'x');
    await timer.time('send', async () => 'y');
    expect(timer.summary()).toEqual('search=15ms send=70ms total=120ms');
  });

  it('should report the time elapsed since it was created', () => {
    const ticks = [100, 350];
    const timer = createStepTimer(() => ticks.shift());
    expect(timer.elapsedMs()).toEqual(250);
  });

  it('should record a step that throws and rethrow', async () => {
    const ticks = [0, 0, 5, 9];
    const timer = createStepTimer(() => ticks.shift());
    await expect(timer.time('upload', async () => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    expect(timer.summary()).toEqual('upload=5ms total=9ms');
  });
});
