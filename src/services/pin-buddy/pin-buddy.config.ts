import { IPinBuddyOption } from '@services/pin-buddy/interface/pin-buddy-option.interface';
import { POSSIBLE_INPUTS } from '@services/telegram/telegram.config';

export const PIN_BUDDY_OPTIONS: Record<string, IPinBuddyOption> = {
  START: {
    displayName: '/start',
    selectedActionResponse: `Hi {name}!\n\nI'm a bot that can help you with translations, transcriptions of text, audio and video files\n\nJust send me the data and I will do my thing`,
    analyticsEventName: 'START',
    hideFromKeyboard: true,
  },
  TRANSCRIBE: {
    displayName: 'Transcribe',
    selectedActionResponse: 'OK, send me an audio or video file you want me to transcribe',
    handler: 'handleTranscribeAction',
    analyticsEventName: 'TRANSCRIBE',
    possibleInputs: [POSSIBLE_INPUTS.VIDEO, POSSIBLE_INPUTS.AUDIO],
    showLoader: true,
  },
};

export const ANALYTIC_EVENT_NAMES = {
  ...Object.fromEntries(
    Object.keys(PIN_BUDDY_OPTIONS).map((option: string) => [
      PIN_BUDDY_OPTIONS[option].displayName,
      PIN_BUDDY_OPTIONS[option].analyticsEventName,
    ]),
  ),
};

export const ANALYTIC_EVENT_STATES = {
  SET_ACTION: 'SET_ACTION',
  FULFILLED: 'FULFILLED',
  ERROR: 'ERROR',
};
