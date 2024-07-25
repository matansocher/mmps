import { Injectable, OnModuleInit } from '@nestjs/common';
import fs from 'fs';
import { chunk as _chunk } from 'lodash';
import { OpenAI } from 'openai';
import {
  OPENAI_API_KEY,
  CHAT_COMPLETIONS_MODEL,
  IMAGE_GENERATION_MODEL,
  SOUND_MODEL,
  TEXT_TO_SPEECH_MODEL,
  TEXT_TO_SPEECH_VOICE,
} from '@services/openai/openai.config';

@Injectable()
export class OpenaiService implements OnModuleInit {
  private openai: OpenAI;

  onModuleInit() {
    this.openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });
  }

  async getTranscriptFromAudio(audioFilePath, language) {
    const file = fs.createReadStream(audioFilePath);
    return this.openai.audio.transcriptions.create({
      file,
      model: SOUND_MODEL,
      ...(!!language && { language }),
    });
  }

  async getTranslationFromAudio(audioFilePath) {
    const file = fs.createReadStream(audioFilePath);
    return this.openai.audio.translations.create({
      file,
      model: SOUND_MODEL,
    });
  }

  async getAudioFromText(text) {
    return this.openai.audio.speech.create({
      model: TEXT_TO_SPEECH_MODEL,
      voice: TEXT_TO_SPEECH_VOICE,
      input: text,
    });
  }

  async getChatCompletion(prompt, userText) {
    let userMessages;
    if (typeof userText === 'string') {
      userMessages = [userText];
    } else { // array
      userMessages = _chunk(userText, 100);
    }
    const result = await this.openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        ...userMessages.map((message) => ({
          role: 'user',
          content: typeof message === 'string' ? message : JSON.stringify(message),
        })),
      ],
      model: CHAT_COMPLETIONS_MODEL,
    });
    return result.choices[0].message.content;
  }

  async createImage(prompt) {
    const response = await this.openai.images.generate({
      model: IMAGE_GENERATION_MODEL,
      prompt,
      n: 1,
      size: '1024x1024',
    });
    return response.data[0].url;
  }

  async analyzeImage(imageUrl) {
    const response = await this.openai.chat.completions.create({
      model: CHAT_COMPLETIONS_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'What’s in this image? What text do you see in the image?' },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
    });
    return response.choices[0].message.content;
  }
}
