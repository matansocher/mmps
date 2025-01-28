import { BOT_BROADCAST_ACTIONS, POSSIBLE_INPUTS } from '@services/telegram';
import type { VoicePalOption } from './interface';

export const VOICE_PAL_OPTIONS: Record<string, VoicePalOption> = {
  START: {
    displayName: '/start',
    selectedActionResponse: `Hi {name}!\n\nI'm a bot that can help you with translations, transcriptions of text, audio and video files, and summarizing stuff\n\nJust send me the data and I will do my thing`,
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
  TRANSLATE: {
    displayName: 'Translate',
    selectedActionResponse: 'OK, send me a text, audio or a video file you want me to translate',
    handler: 'handleTranslateAction',
    analyticsEventName: 'TRANSLATE',
    possibleInputs: [POSSIBLE_INPUTS.TEXT, POSSIBLE_INPUTS.VIDEO, POSSIBLE_INPUTS.AUDIO],
    showLoader: false,
  },
  TEXT_TO_SPEECH: {
    displayName: 'Text to Speech',
    selectedActionResponse: 'OK, Send me the text you want me to convert to speech',
    handler: 'handleTextToSpeechAction',
    analyticsEventName: 'TEXT_TO_SPEECH',
    possibleInputs: [POSSIBLE_INPUTS.TEXT],
    showLoader: true,
    loaderType: BOT_BROADCAST_ACTIONS.UPLOADING_VOICE,
  },
  IMAGE_ANALYZER: {
    displayName: 'Image Analyzer',
    selectedActionResponse: 'OK, Send me an image and I will analyze it for you',
    handler: 'handleImageAnalyzerAction',
    analyticsEventName: 'IMAGE_ANALYZER',
    possibleInputs: [POSSIBLE_INPUTS.PHOTO],
    showLoader: true,
  },
};

export const ANALYTIC_EVENT_NAMES = {
  ...Object.fromEntries(
    Object.keys(VOICE_PAL_OPTIONS).map((option: string) => [VOICE_PAL_OPTIONS[option].displayName, VOICE_PAL_OPTIONS[option].analyticsEventName]),
  ),
};

export const ANALYTIC_EVENT_STATES = {
  SET_ACTION: 'SET_ACTION',
  FULFILLED: 'FULFILLED',
  ERROR: 'ERROR',
};

export const IMAGE_ANALYSIS_PROMPT =
  'What’s in this image? What text do you see in the image? if you see a riddle solve it. if you see something complicated, explain it. Add any additional value you can in addition to explaining what you see and adding the text to your answer. please provide as much data as you can.';
