import type { InlineKeyboard } from 'grammy';
import { buildFeaturesKeyboard, buildLanguageKeyboard, buildOnboardingCallbackData, buildTryItKeyboard, parseOnboardingCallbackData } from './rail-onboarding.utils';
import type { OnboardingCallback } from './rail-onboarding.utils';

function getCallbackData(keyboard: InlineKeyboard): string[][] {
  return keyboard.inline_keyboard.map((row) => row.map((button) => ('callback_data' in button ? button.callback_data : undefined)));
}

describe('buildOnboardingCallbackData() / parseOnboardingCallbackData()', () => {
  test.each<OnboardingCallback>([
    { action: 'lang', language: 'he' },
    { action: 'next', language: 'en' },
    { action: 'try', language: 'he' },
    { action: 'skip', language: 'en' },
  ])('should round-trip $action in $language', (callback) => {
    expect(parseOnboardingCallbackData(buildOnboardingCallbackData(callback))).toEqual(callback);
  });

  test.each([{ data: 'later|3700|2300|2026-10-19|08:31|he' }, { data: 'onb|unknown|he' }, { data: 'onb|lang|fr' }, { data: 'onb|lang|he|extra' }, { data: '' }])(
    'should return null for $data',
    ({ data }) => {
      expect(parseOnboardingCallbackData(data)).toEqual(null);
    },
  );
});

describe('onboarding keyboards', () => {
  it('should offer both languages and a skip that falls back to the given language', () => {
    expect(getCallbackData(buildLanguageKeyboard('en'))).toEqual([['onb|lang|he', 'onb|lang|en'], ['onb|skip|en'], []]);
  });

  it('should offer next and skip on the features step', () => {
    expect(getCallbackData(buildFeaturesKeyboard('he'))).toEqual([['onb|next|he', 'onb|skip|he'], []]);
  });

  it('should offer the sample search and skip on the try-it step', () => {
    expect(getCallbackData(buildTryItKeyboard('en'))).toEqual([['onb|try|en'], ['onb|skip|en'], []]);
  });
});
