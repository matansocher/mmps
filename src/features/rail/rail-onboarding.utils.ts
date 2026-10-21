import type { InlineKeyboard } from 'grammy';
import { buildInlineKeyboard } from '@services/telegram';
import type { ImageLanguage } from '@shared/image-card';
import { ONBOARDING_MESSAGES } from './rail.config';

export type OnboardingAction = 'lang' | 'next' | 'try' | 'skip';

export type OnboardingCallback = {
  readonly action: OnboardingAction;
  readonly language: ImageLanguage;
};

const ONBOARDING_PREFIX = 'onb';
const CALLBACK_SEPARATOR = '|';
const ONBOARDING_ACTIONS: readonly OnboardingAction[] = ['lang', 'next', 'try', 'skip'];

// Format: "onb|lang|he"
export function buildOnboardingCallbackData({ action, language }: OnboardingCallback): string {
  return [ONBOARDING_PREFIX, action, language].join(CALLBACK_SEPARATOR);
}

export function parseOnboardingCallbackData(data: string): OnboardingCallback | null {
  const [prefix, action, language, ...rest] = data.split(CALLBACK_SEPARATOR);
  if (prefix !== ONBOARDING_PREFIX || rest.length) return null;
  if (!ONBOARDING_ACTIONS.includes(action as OnboardingAction)) return null;
  if (language !== 'he' && language !== 'en') return null;
  return { action: action as OnboardingAction, language };
}

// Step 1 is shown before we know the language, so its skip button is bilingual and falls back to the Telegram language.
export function buildLanguageKeyboard(fallbackLanguage: ImageLanguage): InlineKeyboard {
  const { languageButtons, buttons } = ONBOARDING_MESSAGES;
  return buildInlineKeyboard(
    [
      { text: languageButtons.he, data: buildOnboardingCallbackData({ action: 'lang', language: 'he' }) },
      { text: languageButtons.en, data: buildOnboardingCallbackData({ action: 'lang', language: 'en' }) },
      { text: `${buttons.he.skip} / ${buttons.en.skip}`, data: buildOnboardingCallbackData({ action: 'skip', language: fallbackLanguage }) },
    ],
    2,
  );
}

export function buildFeaturesKeyboard(language: ImageLanguage): InlineKeyboard {
  const labels = ONBOARDING_MESSAGES.buttons[language];
  return buildInlineKeyboard(
    [
      { text: labels.next, data: buildOnboardingCallbackData({ action: 'next', language }) },
      { text: labels.skip, data: buildOnboardingCallbackData({ action: 'skip', language }) },
    ],
    2,
  );
}

export function buildTryItKeyboard(language: ImageLanguage): InlineKeyboard {
  const labels = ONBOARDING_MESSAGES.buttons[language];
  return buildInlineKeyboard([
    { text: labels.tryIt, data: buildOnboardingCallbackData({ action: 'try', language }) },
    { text: labels.skip, data: buildOnboardingCallbackData({ action: 'skip', language }) },
  ]);
}
