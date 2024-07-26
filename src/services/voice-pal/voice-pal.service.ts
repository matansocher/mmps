import { BOTS } from '@core/config/telegram.config';
import { LoggerService } from '@core/logger/logger.service';
import { VoicePalMongoService } from '@core/mongo/voice-pal-mongo/voice-pal-mongo.service';
import { Injectable } from '@nestjs/common';
import { GoogleTranslateService } from '@services/google-translate/google-translate.service';
import { ImgurService } from '@services/imgur/imgur.service';
import { OpenaiService } from '@services/openai/openai.service';
import { SocialMediaDownloaderService } from '@services/social-media-downloader/social-media-downloader.service';
import { TelegramGeneralService } from '@services/telegram/telegram-general.service';
import { UtilsService } from '@services/utils/utils.service';
import { UserSelectedActionsService } from '@services/voice-pal/user-selected-actions.service';
import { YoutubeTranscriptService } from '@services/youtube-transcript/youtube-transcript.service';
import { promises as fs } from 'fs';
import {
  ANALYTIC_EVENT_NAMES,
  ANALYTIC_EVENT_STATES,
  LOCAL_FILES_PATH, NOT_FOUND_VIDEO_MESSAGES,
  SUMMARY_PROMPT,
  VOICE_PAL_OPTIONS
} from './voice-pal.config';
import * as voicePalUtils from './voice-pal.utils';

@Injectable()
export class VoicePalService {
  bot: string;
  chatId: number;

  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly mongoService: VoicePalMongoService,
    private readonly telegramGeneralService: TelegramGeneralService,
    private readonly googleTranslateService: GoogleTranslateService,
    private readonly youtubeTranscriptService: YoutubeTranscriptService,
    private readonly socialMediaDownloaderService: SocialMediaDownloaderService,
    private readonly userSelectedActionsService: UserSelectedActionsService,
    private readonly imgurService: ImgurService,
    private readonly openaiService: OpenaiService,
  ) {}

  async handleActionSelection(selection, { telegramUserId, chatId, firstName, lastName, username }) {
    const relevantAction = Object.keys(VOICE_PAL_OPTIONS).find(option => VOICE_PAL_OPTIONS[option].displayName === selection);

    let replyText = VOICE_PAL_OPTIONS[relevantAction].selectedActionResponse;
    if (selection === VOICE_PAL_OPTIONS.START.displayName) {
      this.mongoService.saveUserDetails({ telegramUserId, chatId, firstName, lastName, username });
      replyText = replyText.replace('{name}', firstName || username || '');
    } else {
      this.userSelectedActionsService.setCurrentUserAction(this.chatId, selection);
    }

    const analyticAction = ANALYTIC_EVENT_NAMES[selection];
    this.mongoService.sendAnalyticLog(`${analyticAction} - ${ANALYTIC_EVENT_STATES.SET_ACTION}`, { chatId: this.chatId });

    await this.telegramGeneralService.sendMessage(this.bot, this.chatId, replyText, voicePalUtils.getKeyboardOptions());
  }

  async handleAction(message, userAction) {
    const { text, audio, video, photo } = this.telegramGeneralService.getMessageData(message);

    if (!userAction) {
      return this.telegramGeneralService.sendMessage(this.bot, this.chatId, `Please select an action first.`);
    }

    const inputErrorMessage = voicePalUtils.validateActionWithMessage(userAction, { text, audio, video, photo });
    if (inputErrorMessage) {
      return this.telegramGeneralService.sendMessage(this.bot, this.chatId, inputErrorMessage, voicePalUtils.getKeyboardOptions());
    }

    const analyticAction = ANALYTIC_EVENT_NAMES[userAction];
    try {
      if (userAction && userAction.showLoader) { // showLoader
        // await messageLoaderService.withMessageLoader(this.bot, this.chatId, { cycleDuration: 5000, loadingAction: userAction.loaderType }, async () => {
        //   await this[userAction.handler]({ text, audio, video, photo });
        // });
        await this[userAction.handler]({ text, audio, video, photo });
      } else {
        await this[userAction.handler]({ text, audio, video, photo });
      }

      this.mongoService.sendAnalyticLog(`${analyticAction} - ${ANALYTIC_EVENT_STATES.FULFILLED}`, { chatId: this.chatId });
      // userSelectionService.removeCurrentUserAction(this.chatId);
    } catch (err) {
      const errorMessage = this.utilsService.getErrorMessage(err);
      this.logger.error(this.handleAction.name, `error: ${errorMessage}`);
      this.mongoService.sendAnalyticLog(`${analyticAction} - ${ANALYTIC_EVENT_STATES.ERROR}`, { chatId: this.chatId, error: errorMessage });
      throw err;
    }
  }

  async handleTranscribeAction({ video, audio }) {
    try {
      const audioFileLocalPath = await this.telegramGeneralService.downloadAudioFromVideoOrAudio(this.bot, { video, audio });
      const resText = await this.openaiService.getTranscriptFromAudio(audioFileLocalPath);
      await this.telegramGeneralService.sendMessage(this.bot, this.chatId, resText.text, voicePalUtils.getKeyboardOptions());
      await this.utilsService.deleteFile(audioFileLocalPath);
    } catch (err) {
      this.logger.error(this.handleTranscribeAction.name, `error: ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  async handleTranslateAction({ text, video, audio }) {
    try {
      let resText = '';
      let audioFileLocalPath = '';

      if (text) {
        resText = await this.googleTranslateService.getTranslationToEnglish(text);
      } else {
        audioFileLocalPath = await this.telegramGeneralService.downloadAudioFromVideoOrAudio(this.bot, { video, audio });
        resText = await this.openaiService.getTranslationFromAudio(audioFileLocalPath);
        this.utilsService.deleteFile(audioFileLocalPath);
      }

      await this.telegramGeneralService.sendMessage(this.bot, this.chatId, resText, voicePalUtils.getKeyboardOptions());
    } catch (err) {
      this.logger.error(this.handleTranslateAction.name, `error: ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  async handleTextToSpeechAction({ text }) {
    try {
      const result = await this.openaiService.getAudioFromText(text);

      const audioFilePath = `${LOCAL_FILES_PATH}/text-to-speech-${new Date().getTime()}.mp3`;
      const buffer = Buffer.from(await result.arrayBuffer());
      await fs.writeFile(audioFilePath, buffer);

      await this.telegramGeneralService.sendVoice(this.bot, this.chatId, audioFilePath, voicePalUtils.getKeyboardOptions());
      await this.utilsService.deleteFile(audioFilePath);
    } catch (err) {
      this.logger.error(this.handleTextToSpeechAction.name, `error: ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  async handleSummarizeTextAction({ text }) {
    try {
      const textSummary = await this.openaiService.getChatCompletion(SUMMARY_PROMPT, text);
      await this.telegramGeneralService.sendMessage(this.bot, this.chatId, textSummary, voicePalUtils.getKeyboardOptions());
    } catch (err) {
      this.logger.error(this.handleSummarizeTextAction.name, `error: ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  async handleSummarizeYoutubeVideoAction({ text }) {
    try {
      const videoId = this.youtubeTranscriptService.getYoutubeVideoIdFromUrl(text);
      if (!videoId) {
        await this.telegramGeneralService.sendMessage(this.bot, this.chatId, NOT_FOUND_VIDEO_MESSAGES.YOUTUBE, voicePalUtils.getKeyboardOptions());
      }
      const { transcription, errorMessage } = await this.youtubeTranscriptService.getYoutubeVideoTranscription(videoId);
      if (errorMessage) {
        await this.telegramGeneralService.sendMessage(this.bot, this.chatId, errorMessage, voicePalUtils.getKeyboardOptions());
      }
      const summaryTranscription = await this.openaiService.getChatCompletion(SUMMARY_PROMPT, transcription);
      await this.telegramGeneralService.sendMessage(this.bot, this.chatId, summaryTranscription, voicePalUtils.getKeyboardOptions());
    } catch (err) {
      this.logger.error(this.handleSummarizeYoutubeVideoAction.name, `error: ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  async handleSummarizeTiktokVideoAction({ text }) {
    try {
      const audioBuffer = await this.socialMediaDownloaderService.getTiktokAudio(text);
      if (!audioBuffer) {
        await this.telegramGeneralService.sendMessage(this.bot, this.chatId, NOT_FOUND_VIDEO_MESSAGES.TIKTOK, voicePalUtils.getKeyboardOptions());
      }
      const audioFilePath = `${LOCAL_FILES_PATH}/tiktok-audio-${new Date().getTime()}.mp3`;
      await fs.writeFile(audioFilePath, audioBuffer);

      const transcription = await this.openaiService.getTranscriptFromAudio(audioFilePath);

      const summaryTranscription = await this.openaiService.getChatCompletion(SUMMARY_PROMPT, transcription.text);
      await this.telegramGeneralService.sendMessage(this.bot, this.chatId, summaryTranscription, voicePalUtils.getKeyboardOptions());
      await this.utilsService.deleteFile(audioFilePath);
    } catch (err) {
      this.logger.error(this.handleSummarizeTiktokVideoAction.name, `error: ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  async handleSummarizeMetaVideoAction({ text }) {
    try {
      const videoBuffer = await this.socialMediaDownloaderService.getInstagramVideo(text);
      const videoFilePath = `${LOCAL_FILES_PATH}/meta-video-${new Date().getTime()}.mp4`;
      await this.utilsService.saveVideoBytesArray(videoBuffer, videoFilePath);
      const audioFilePath = await this.utilsService.extractAudioFromVideo(videoFilePath);
      const transcription = await this.openaiService.getTranscriptFromAudio(audioFilePath);

      const summaryTranscription = await this.openaiService.getChatCompletion(SUMMARY_PROMPT, transcription.text);
      await this.telegramGeneralService.sendMessage(this.bot, this.chatId, summaryTranscription, voicePalUtils.getKeyboardOptions());
      await this.utilsService.deleteFile(videoFilePath);
      await this.utilsService.deleteFile(audioFilePath);
    } catch (err) {
      this.logger.error(this.handleSummarizeMetaVideoAction.name, `error: ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  async handleImageGenerationAction({ text }) {
    try {
      const imageUrl = await this.openaiService.createImage(text);
      await this.telegramGeneralService.sendPhoto(this.bot, this.chatId, imageUrl, voicePalUtils.getKeyboardOptions());
    } catch (err) {
      this.logger.error(this.handleImageGenerationAction.name, `error: ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  async handleImageAnalyzerAction({ photo }) {
    try {
      const imageLocalPath = await this.telegramGeneralService.downloadFile(this.bot, photo[photo.length - 1].file_id, LOCAL_FILES_PATH);
      const imageUrl = await this.imgurService.uploadImage(imageLocalPath);
      const imageAnalysisText = await this.openaiService.analyzeImage(imageUrl);
      await this.telegramGeneralService.sendMessage(this.bot, this.chatId, imageAnalysisText, voicePalUtils.getKeyboardOptions());
      this.utilsService.deleteFile(imageLocalPath);
    } catch (err) {
      this.logger.error(this.handleImageAnalyzerAction.name, `error: ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }
}
