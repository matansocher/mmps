export const OPENAI_CLIENT_TOKEN = 'OPENAI_CLIENT_TOKEN';

export const CHAT_COMPLETIONS_MODEL = 'gpt-4o';
export const CHAT_COMPLETIONS_MINI_MODEL = 'gpt-4.1-mini';
export const SOUND_MODEL = 'whisper-1';
export const IMAGE_ANALYZER_MODEL = 'gpt-4.1-mini'; // gpt-4o
export const IMAGE_GENERATION_MODEL = 'gpt-image-1';
export const TEXT_TO_SPEECH_MODEL = 'gpt-4o-mini-tts';
export const TEXT_TO_SPEECH_VOICE = 'ash';

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

export const ERROR_STATUSES = [ASSISTANT_RUN_STATUSES.FAILED, ASSISTANT_RUN_STATUSES.CANCELLED, ASSISTANT_RUN_STATUSES.REQUIRES_ACTION, ASSISTANT_RUN_STATUSES.EXPIRED];
