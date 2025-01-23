import { GenerativeModel } from '@google/generative-ai';

export interface GeminiClientProvider {
  flashModel: GenerativeModel;
}
