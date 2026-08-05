import { describe, expect, test } from 'vitest';
import { isLongPost, targetKeyPointsCount } from './social-media-digest';

describe('targetKeyPointsCount()', () => {
  test.each([
    { postsCount: 1, expected: 2 },
    { postsCount: 4, expected: 2 },
    { postsCount: 20, expected: 2 },
    { postsCount: 21, expected: 3 },
    { postsCount: 50, expected: 5 },
    { postsCount: 100, expected: 10 },
    { postsCount: 500, expected: 10 },
  ])('should return $expected when postsCount is $postsCount', ({ postsCount, expected }) => {
    expect(targetKeyPointsCount(postsCount)).toEqual(expected);
  });
});

describe('isLongPost()', () => {
  test.each([
    { label: 'null', text: null, expected: false },
    { label: 'empty', text: '', expected: false },
    { label: 'short text', text: 'a'.repeat(100), expected: false },
    { label: 'exactly at threshold (280)', text: 'a'.repeat(280), expected: false },
    { label: 'over threshold (281)', text: 'a'.repeat(281), expected: true },
  ])('should return $expected for $label', ({ text, expected }) => {
    expect(isLongPost(text)).toEqual(expected);
  });
});
