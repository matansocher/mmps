import type { GenerativeModel } from '@google/generative-ai';

export interface GeminiClientProvider {
  readonly flashModel: GenerativeModel;
}
