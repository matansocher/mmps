import { GenerativeModel } from '@google/generative-ai';

export interface IGeminiClientProvider {
  flashModel: GenerativeModel;
}
