import { APIPromise } from 'openai/core';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeminiService } from '@services/gemini';
import { imgurUploadImage } from '@services/imgur';
import { OpenaiService } from '@services/openai';
import { AiProvider } from './ai.config';

@Injectable()
export class AiService {
  aiProvider = AiProvider.OPENAI;

  constructor(
    private readonly openaiService: OpenaiService,
    private readonly geminiService: GeminiService,
    private readonly configService: ConfigService,
  ) {}

  async getTranscriptFromAudio(audioFilePath: string): Promise<string> {
    switch (this.aiProvider) {
      case AiProvider.OPENAI:
        return this.openaiService.getTranscriptFromAudio(audioFilePath);
      case AiProvider.GEMINI:
        return this.geminiService.generateContentFromFile('Generate a transcript of the speech.', audioFilePath);
    }
  }

  async getTranslationFromAudio(audioFilePath: string): Promise<string> {
    switch (this.aiProvider) {
      case AiProvider.OPENAI:
        return this.openaiService.getTranslationFromAudio(audioFilePath);
      case AiProvider.GEMINI:
        return this.geminiService.generateContentFromFile('Translate this audio file to English.', audioFilePath);
    }
  }

  async getAudioFromText(text: string): Promise<APIPromise<Response>> {
    return this.openaiService.getAudioFromText(text);
  }

  async getChatCompletion(prompt: string, userText: string): Promise<string> {
    switch (this.aiProvider) {
      case AiProvider.OPENAI:
        return this.openaiService.getChatCompletion(prompt, userText);
      case AiProvider.GEMINI:
        return this.geminiService.getChatCompletion(prompt, userText);
    }
  }

  async createImage(prompt: string): Promise<string> {
    return this.openaiService.createImage(prompt);
  }

  async analyzeImage(prompt: string, imageLocalPath: string): Promise<string> {
    switch (this.aiProvider) {
      case AiProvider.OPENAI:
        const imgurToken = this.configService.get('IMGUR_CLIENT_ID');
        const imageUrl = await imgurUploadImage(imgurToken, imageLocalPath);
        return this.openaiService.analyzeImage(prompt, imageUrl);
      case AiProvider.GEMINI:
        return this.geminiService.generateContentFromFile(prompt, imageLocalPath);
    }
  }

  async analyzeFile(prompt: string, filePath: string): Promise<string> {
    return this.geminiService.generateContentFromFile(prompt, filePath);
  }
}
