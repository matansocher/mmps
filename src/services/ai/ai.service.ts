import { Injectable } from '@nestjs/common';
import { GeminiService } from '@services/gemini';
import { ImgurService } from '@services/imgur';
import { OpenaiService } from '@services/openai';
import { AiProvider } from '@services/ai/ai.config';

@Injectable()
export class AiService {
  aiProvider = AiProvider.OPENAI;

  constructor(
    private readonly openaiService: OpenaiService,
    private readonly geminiService: GeminiService,
    private readonly imgurService: ImgurService,
  ) {}

  async getTranscriptFromAudio(audioFilePath: string): Promise<any> {
    switch (this.aiProvider) {
      case AiProvider.OPENAI:
        return this.openaiService.getTranscriptFromAudio(audioFilePath);
      case AiProvider.GEMINI:
        return this.geminiService.generateContentFromFile('Generate a transcript of the speech.', audioFilePath);
    }
  }

  async getTranslationFromAudio(audioFilePath: string): Promise<any> {
    switch (this.aiProvider) {
      case AiProvider.OPENAI:
        return this.openaiService.getTranslationFromAudio(audioFilePath);
      case AiProvider.GEMINI:
        return this.geminiService.generateContentFromFile('Translate this audio file to English.', audioFilePath);
    }
  }

  async getAudioFromText(text: string): Promise<any> {
    return this.openaiService.getAudioFromText(text);
  }

  async getChatCompletion(prompt: string, userText: string): Promise<any> {
    switch (this.aiProvider) {
      case AiProvider.OPENAI:
        return this.openaiService.getChatCompletion(prompt, userText);
      case AiProvider.GEMINI:
        return this.geminiService.getChatCompletion(prompt, userText);
    }
  }

  async createImage(prompt: string): Promise<any> {
    return this.openaiService.createImage(prompt);
  }

  async analyzeImage(prompt: string, imageLocalPath: string): Promise<any> {
    switch (this.aiProvider) {
      case AiProvider.OPENAI:
        const imageUrl = await this.imgurService.uploadImage(imageLocalPath);
        return this.openaiService.analyzeImage(prompt, imageUrl);
      case AiProvider.GEMINI:
        return this.geminiService.generateContentFromFile(prompt, imageLocalPath);
    }
  }

  async analyzeFile(prompt: string, filePath: string): Promise<any> {
    return this.geminiService.generateContentFromFile(prompt, filePath);
  }
}
