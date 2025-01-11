import { VOICE_PAL_OPTIONS } from '../voice-pal.config';

export function getKeyboardOptions() {
  const options = {};
  for (const key in VOICE_PAL_OPTIONS) {
    if (VOICE_PAL_OPTIONS[key].hideFromKeyboard !== true) {
      options[key] = VOICE_PAL_OPTIONS[key];
    }
  }

  return {
    reply_markup: {
      keyboard: Object.keys(options).map((option) => {
        return [{ text: options[option].displayName }];
      }),
      resize_keyboard: true,
    },
  };
}
