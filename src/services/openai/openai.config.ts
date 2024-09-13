import { env } from 'node:process';

export const OPENAI_CLIENT_TOKEN = 'OPENAI_CLIENT_TOKEN';

export const OPENAI_API_KEY = env.OPEN_AI_API_KEY;
export const CHAT_COMPLETIONS_MODEL = 'gpt-4o';
export const SOUND_MODEL = 'whisper-1';
export const IMAGE_GENERATION_MODEL = 'dall-e-3';
export const TEXT_TO_SPEECH_MODEL = 'tts-1';
export const TEXT_TO_SPEECH_VOICE = 'shimmer';
