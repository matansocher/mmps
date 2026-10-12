import { describe, expect, test } from 'vitest';
import { CAMPAIGN, CHAPTER_IDS } from '../../../../src/shared/rewind';
import { JOURNEY, restoredChapters } from './journey';
import { emptyProgress } from './progress';

describe('the valley journey', () => {
  test('has one purpose and visible restoration for every chapter', () => {
    expect(JOURNEY.length).toEqual(10);
    expect(new Set(JOURNEY.map((chapter) => chapter.restored)).size).toEqual(10);
    expect(restoredChapters(emptyProgress())).toEqual([]);
  });
  test('restores only published chapters after their actual rooms are cleared', () => {
    const completed = Object.fromEntries([1, 11, 101].map((id) => [id, { stars: 1, bestMoves: 10 }]));
    expect(restoredChapters({ ...emptyProgress(), completed })).toEqual([]);
    expect(restoredChapters({ ...emptyProgress(), completed, skipped: [102] })).toEqual([1]);
  });
  test('finishing the release restores every published region and lights the observatory', () => {
    const completed = Object.fromEntries(CAMPAIGN.map(({ id }) => [id, { stars: 1, bestMoves: 10 }]));
    expect(restoredChapters({ ...emptyProgress(), completed })).toEqual(CHAPTER_IDS);
    expect(CHAPTER_IDS).toEqual([1, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});
