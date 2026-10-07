import { createStepTimer, formatStatsMessage, maskPhone, parseTagEdits, tokenize } from './stickers.utils';

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
    { text: 'ת.ז U.S.A 3.5', expected: ['ת.ז', 'u.s.a', '3.5'] },
    { text: '. ...', expected: ['.', '...'] },
    { text: 'שלום.', expected: ['שלום.'] },
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
    { text: '. -ת.ז', expected: { add: ['.'], remove: ['ת.ז'] } },
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

describe('maskPhone()', () => {
  test.each([
    { phone: '972501231234', expected: '9725****1234' },
    { phone: '12345678', expected: '****5678' },
  ])('should mask $phone as $expected', ({ phone, expected }) => {
    expect(maskPhone(phone)).toEqual(expected);
  });
});

describe('formatStatsMessage()', () => {
  it('should number each section', () => {
    const message = formatStatsMessage({
      topTags: [{ value: 'cat', count: 3 }],
      topWords: [
        { value: 'dog', count: 2 },
        { value: 'cat', count: 1 },
      ],
      topSearchers: [{ value: '972501231234', count: 5 }],
    });
    expect(message).toEqual(
      [
        '📊 *סטטיסטיקות*',
        '🏷️ *מילות החיפוש הנפוצות בסטיקרים*\n1. cat (3)',
        '🔎 *המילים שחיפשו הכי הרבה*\n1. dog (2)\n2. cat (1)',
        '🏆 *המחפשים המובילים*\n1. 9725****1234 — 5 חיפושים',
      ].join('\n\n'),
    );
  });
});
