export const OPENAI_CLIENT_TOKEN = 'OPENAI_CLIENT_TOKEN';

export const CHAT_COMPLETIONS_MODEL = 'gpt-4o';
export const SOUND_MODEL = 'whisper-1';
export const IMAGE_ANALYZER_MODEL = 'gpt-4o-mini'; // gpt-4o
export const IMAGE_GENERATION_MODEL = 'dall-e-3';
export const TEXT_TO_SPEECH_MODEL = 'tts-1';
export const TEXT_TO_SPEECH_VOICE = 'shimmer';

export enum ASSISTANT_RUN_STATUSES {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REQUIRES_ACTION = 'requires_action',
  EXPIRED = 'expired',
  CANCELLING = 'cancelling',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
  INCOMPLETE = 'incomplete',
}

export const ERROR_STATUSES = [
  ASSISTANT_RUN_STATUSES.FAILED,
  ASSISTANT_RUN_STATUSES.CANCELLED,
  ASSISTANT_RUN_STATUSES.REQUIRES_ACTION,
  ASSISTANT_RUN_STATUSES.EXPIRED,
];
